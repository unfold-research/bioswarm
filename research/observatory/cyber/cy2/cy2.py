"""CY2: LLM blue teams with and without the clearance doctrine on CAGE Challenge 4 (tasks/CY2-PREREG.md).

Runs inside the cage4 container (observatory/cyber/cy0/Dockerfile). Harness, cue, metrics and self-harm attribution
are CY1b's (observatory/cyber/cy1b/cy1b.py). The code arms run with no network; the LLM arms run on a network whose only
way out is the egress proxy (proxy.py), which lets through api.anthropic.com:443 and nothing else. The host side
(drive.mjs) reserves each wave in the shared ledger before it starts this script.

  python cy2.py jobs <jobs.json> <outdir> [--workers N] [--cap-usd X] [--cost-file F]
      every job {arm, red, seed}; writes <outdir>/<arm>-<red>-s<seed>.json and, for LLM arms,
      <outdir>/calls/<arm>-<red>-s<seed>.jsonl. Stops calling the model once X US$ were spent in this process tree.
  python cy2.py replay <outdir> <arm> <red> <seed>
      re-runs one LLM episode with the model replies taken from its call log (no network); prints a JSON check.
  python cy2.py prompt <arm> <agent>      print a system prompt (seed 74101) for inspection, no calls

The API key is read from the file named by ANTHROPIC_API_KEY_FILE (mounted read-only); never from env or argv, never logged.
"""
import hashlib, json, os, sys, time, warnings, urllib.request, urllib.error, threading
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

warnings.filterwarnings("ignore")
import numpy as np
from CybORG import CybORG, CYBORG_VERSION
from CybORG.Agents import SleepAgent, EnterpriseGreenAgent, FiniteStateRedAgent, DiscoveryFSRed
from CybORG.Agents.Wrappers import BlueEnterpriseWrapper
from CybORG.Simulator.Scenarios import EnterpriseScenarioGenerator
from CybORG.Simulator.Actions.AbstractActions.Impact import Impact
from CybORG.Simulator.Actions.GreenActions import GreenAccessService, GreenLocalWork

ARMS = ["code-react", "code-cd10", "llm-plain", "llm-doctrine"]
LLM_ARMS = {"llm-plain", "llm-doctrine"}
REDS = {"fsm": FiniteStateRedAgent, "discovery": DiscoveryFSRed}
STEPS = 500
SELF_HARM_WINDOW = 5          # Restore lasts 5 steps in CC4 (CY1)
COOLDOWN = {"code-react": 5, "code-cd10": 10}   # CY1b: react 5, disinfect-cd10 10
HISTORY = 20                  # the agent's own last 20 actions in the user turn

MODEL = "claude-haiku-5-5"
# no extended thinking (prereg), sent explicitly: pilot 1 showed the model spending its output on non-text blocks
THINKING = {"type": "disabled"}
MAX_TOKENS = 200
API = "https://api.anthropic.com/v1/messages"
# US$ per million tokens, from the preregistration (Haiku 5.5 list prices); cache writes at 1.25x input
PRICE = {"input": 0.10, "output": 0.50, "cache_read": 0.01, "cache_write": 0.125}
# worst case of one call, used to stop before a call could cross the wave's reservation
CALL_WORST_USD = (12000 * PRICE["cache_write"] + MAX_TOKENS * PRICE["output"]) / 1e6

DOCTRINE = ("Restore a host showing a suspicious process or connection. "
            "Servers first. "
            "Leave a host you restored alone for 10 steps.")


def events(state, host, kind):
    ev = state.hosts[host].events
    return len(ev.old_process_creation) + len(ev.process_creation) if kind == "proc" else \
        len(ev.old_network_connections) + len(ev.network_connections)


def system_prompt(arm, agent, zones, hosts, labels):
    text = [
        "You are one of five blue-team defenders in CAGE Challenge 4 (CybORG), a simulated enterprise network. "
        "It is a simulation: no real system is involved.",
        "Each defender protects one part of the network. A scripted red attacker moves through the network: it "
        "discovers hosts, exploits services, escalates privileges and degrades or impacts services. Green users do "
        "normal work on the same hosts and servers. The team's reward falls when green work fails, whether red "
        "caused it or a defender's own action did (a host being restored is unavailable to green users), and when "
        "red impacts a service. An episode lasts 500 steps.",
        f"You are {agent}. Your zone: {', '.join(zones)}.",
        "Your hosts: " + ", ".join(hosts) + ".",
        "Actions (one per step; some take several steps to complete): "
        "Monitor (collect events from your hosts); "
        "Analyse <host> (look for malware on the host; 2 steps); "
        "Remove <host> (kill red's user-level processes on the host; 3 steps); "
        "Restore <host> (return the host to a clean known state, removing red entirely; 5 steps, during which "
        "green users cannot work on it); "
        "DeployDecoy <host> (start a decoy service that red may exploit instead of a real one); "
        "BlockTrafficZone / AllowTrafficZone (block or allow traffic from one zone into another); "
        "Sleep (do nothing).",
        "You are asked for an action only on steps where at least one of your hosts shows a suspicious process or "
        "connection. On other steps you sleep. You do not exchange messages with the other defenders.",
    ]
    if arm == "llm-doctrine":
        text.append("Doctrine: " + DOCTRINE)
    text.append("Reply with exactly one action label from the list below and nothing else.")
    text.append("Valid actions:\n" + "\n".join(labels))
    return "\n\n".join(text)


def user_turn(step, view, history):
    hosts = "\n".join(f"- {h}: suspicious processes {p}, suspicious connections {c}" for h, p, c in view)
    hist = "\n".join(f"- step {s}: {a}" for s, a in history[-HISTORY:]) or "- none yet"
    return f"Step {step}.\n\nYour hosts now:\n{hosts}\n\nYour last actions:\n{hist}\n\nYour action:"


def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()


# ---------- the model call ----------
class CapStop(Exception):
    pass


class Spend:
    """Spend of this process tree, shared across worker processes through a file and a lock."""
    def __init__(self, cap, lock, value):
        self.cap, self.lock, self.value = cap, lock, value

    # every call in flight holds its worst case until it returns, so parallel calls cannot cross the cap together
    def before(self):
        with self.lock:
            if self.cap is not None and self.value.value + CALL_WORST_USD > self.cap:
                raise CapStop(f"wave reservation reached: spent {self.value.value:.4f} of {self.cap:.4f} US$")
            self.value.value += CALL_WORST_USD

    def settle(self, usd):
        with self.lock:
            self.value.value += usd - CALL_WORST_USD


def cost(u):
    return (u.get("input_tokens", 0) * PRICE["input"] + u.get("output_tokens", 0) * PRICE["output"]
            + (u.get("cache_read_input_tokens") or 0) * PRICE["cache_read"]
            + (u.get("cache_creation_input_tokens") or 0) * PRICE["cache_write"]) / 1e6


_key = None


def api_key():
    global _key
    if _key is None:
        f = os.environ.get("ANTHROPIC_API_KEY_FILE")
        if not f or not os.path.exists(f):
            raise RuntimeError("ANTHROPIC_API_KEY_FILE is not a mounted file")
        with open(f) as h:
            _key = h.read().strip()
    return _key


def request_body(system, user, count=False):
    b = {"model": MODEL, "thinking": THINKING,
         "system": [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
         "messages": [{"role": "user", "content": user}]}
    if not count:
        b["max_tokens"] = MAX_TOKENS
    return b


def check_request():
    """Free check of the exact request shape (thinking setting included) on the token-counting endpoint: no tokens
    are generated or billed. Fails loudly if the API rejects the request, so a pilot never starts on a bad shape."""
    body = json.dumps(request_body("You are a test.", "Reply with Sleep.", count=True)).encode()
    req = urllib.request.Request(API + "/count_tokens", data=body, method="POST", headers={
        "x-api-key": api_key(), "anthropic-version": "2023-06-01", "content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            out = json.loads(r.read())
        return {"ok": True, "input_tokens": out.get("input_tokens"), "thinking": THINKING}
    except urllib.error.HTTPError as e:
        return {"ok": False, "http": e.code, "error": e.read()[:300].decode("utf8", "replace")}


def call_model(system, user, spend):
    body = json.dumps(request_body(system, user)).encode()
    for attempt in range(8):
        spend.before()
        held = True
        req = urllib.request.Request(API, data=body, method="POST", headers={
            "x-api-key": api_key(), "anthropic-version": "2023-06-01", "content-type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                out = json.loads(r.read())
            usage = out.get("usage", {})
            usd = cost(usage)
            spend.settle(usd); held = False
            blocks = out.get("content", [])
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
            return text, usage, usd, out.get("stop_reason"), [b.get("type") for b in blocks]
        except urllib.error.HTTPError as e:
            if e.code not in (408, 409, 429, 500, 502, 503, 504, 529):
                raise RuntimeError(f"API HTTP {e.code}: {e.read()[:300]!r}")
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            pass
        finally:
            # a failed or timed-out call may still have been billed: keep its worst case counted
            if held:
                spend.settle(CALL_WORST_USD)
        time.sleep(min(60, 2 ** attempt))
    raise RuntimeError("API unavailable after 8 attempts")


# ---------- one episode ----------
def episode(arm, red, seed, spend=None, replies=None):
    """replies: {(step, agent): reply} from a call log, for replay (no network)."""
    sg = EnterpriseScenarioGenerator(blue_agent_class=SleepAgent, green_agent_class=EnterpriseGreenAgent,
                                     red_agent_class=REDS[red], steps=STEPS)
    cyborg = CybORG(sg, "sim", seed=seed)
    env = BlueEnterpriseWrapper(cyborg)
    env.reset()
    state = lambda: cyborg.environment_controller.state
    blues = list(env.agents)
    labels = {b: [l for l in env.action_labels(b) if not l.startswith("[Invalid]")] for b in blues}
    index = {b: {l: i for i, l in enumerate(env.action_labels(b))} for b in blues}
    llm = arm in LLM_ARMS
    systems = {}
    if llm:
        st0 = state()
        for b in blues:
            hosts = [h for h in env.hosts(b) if "router" not in h and h in st0.hosts]
            systems[b] = system_prompt(arm, b, env.subnets(b), hosts, labels[b])
    last_restore, last_act = {}, {}        # host -> step; host -> (step, cooldown) of the code rule's own clock
    rule_clock = {}                       # what code-cd10 would see: host -> step it was last restored (any arm)
    history = {b: [] for b in blues}
    out = {"arm": arm, "red": red, "seed": seed, "cyborg": CYBORG_VERSION, "model": MODEL if llm else None,
           "steps": 0, "reward": 0.0, "green_fail": 0, "green_fail_blue": 0, "green_fail_red": 0,
           "red_impact": 0, "first_impact_step": None, "actions": Counter(), "red_hosts_max": 0,
           "red_root_hosts_max": 0, "cue_steps": 0, "calls": 0, "invalid": 0, "departures": 0,
           "tokens": {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0}, "usd": 0.0}
    calls = []
    traj, acts_hash = hashlib.sha256(), hashlib.sha256()
    t0 = time.time()
    pool = ThreadPoolExecutor(max_workers=len(blues)) if llm and replies is None else None

    def rule(hosts, cue_fn, step, cooldown, clock):
        hit = [h for h in hosts if cue_fn(h) and step - clock.get(h, (-99, 0))[0] > clock.get(h, (-99, 0))[1]]
        hit.sort(key=lambda h: (0 if "server" in h else 1, h))
        return hit

    try:
        for step in range(STEPS):
            st = state()
            acts, pending = {}, {}
            for b in blues:
                hosts = [h for h in env.hosts(b) if "router" not in h and h in st.hosts]
                pc = {h: events(st, h, "proc") for h in hosts}
                cc = {h: events(st, h, "conn") for h in hosts}
                cue = any(pc[h] > 0 or cc[h] > 0 for h in hosts)
                choice = "Sleep"
                if not cue:
                    acts[b] = choice
                    continue
                out["cue_steps"] += 1
                if arm == "code-react":
                    for h in rule(hosts, lambda h: pc[h] > 0, step, COOLDOWN[arm], last_act):
                        if f"Restore {h}" in index[b]:
                            choice = f"Restore {h}"; break
                    acts[b] = choice
                elif arm == "code-cd10":
                    for h in rule(hosts, lambda h: pc[h] > 0 or cc[h] > 0, step, COOLDOWN[arm], last_act):
                        if f"Restore {h}" in index[b]:
                            choice = f"Restore {h}"; break
                    acts[b] = choice
                else:
                    # what code-cd10 would do on this view, given the restores this agent actually made
                    would = "Sleep"
                    for h in rule(hosts, lambda h: pc[h] > 0 or cc[h] > 0, step, 10, rule_clock):
                        if f"Restore {h}" in index[b]:
                            would = f"Restore {h}"; break
                    user = user_turn(step, [(h, pc[h], cc[h]) for h in hosts], history[b])
                    pending[b] = (user, would)
            if pending:
                if replies is not None:
                    got = {b: (replies[(step, b)]["reply"], {}, 0.0, None, None, replies[(step, b)]) for b in pending}
                else:
                    futs = {b: pool.submit(call_model, systems[b], pending[b][0], spend) for b in pending}
                    got = {b: (*f.result(), None) for b, f in futs.items()}
                for b in blues:
                    if b not in pending:
                        continue
                    user, would = pending[b]
                    reply, usage, usd, stop, btypes, logged = got[b]
                    label = reply.strip()
                    valid = label in labels[b]
                    choice = label if valid else "Sleep"
                    if logged is not None and logged.get("user_sha256") != sha(user):
                        raise RuntimeError(f"replay diverged at step {step} {b}: different view")
                    out["calls"] += 1
                    out["invalid"] += 0 if valid else 1
                    out["departures"] += int(choice != would)
                    out["usd"] += usd
                    for k, src in (("input", "input_tokens"), ("output", "output_tokens"),
                                   ("cache_read", "cache_read_input_tokens"), ("cache_write", "cache_creation_input_tokens")):
                        out["tokens"][k] += usage.get(src) or 0
                    history[b].append((step, choice))
                    calls.append({"step": step, "agent": b, "system_sha256": sha(systems[b]), "user_sha256": sha(user),
                                  "reply": reply, "action": choice, "valid": valid, "rule_cd10": would,
                                  "usage": usage, "usd": round(usd, 8), "stop": stop, "blocks": btypes})
                    acts[b] = choice
            for b in blues:
                choice = acts[b]
                kind, _, h = choice.partition(" ")
                if kind == "Restore":
                    last_restore[h] = step
                    last_act[h] = (step, COOLDOWN.get(arm, 10))
                    rule_clock[h] = (step, 10)
                out["actions"][kind] += 1
                acts_hash.update(f"{step}|{b}|{choice}\n".encode())
            obs, rew, term, trunc, info = env.step({b: index[b][acts[b]] for b in blues})
            r = float(np.mean(list(rew.values()))) if rew else 0.0
            out["reward"] += r
            traj.update(f"{r:.6f}".encode())
            st = state()
            for ag in cyborg.active_agents:
                if not (ag.startswith("green") or ag.startswith("red")):
                    continue
                a = cyborg.get_last_action(ag)
                a = a[0] if isinstance(a, list) and a else a
                ok = cyborg.get_observation(ag).get("success")
                ok = getattr(ok, "name", str(ok))
                if ag.startswith("green") and isinstance(a, (GreenLocalWork, GreenAccessService)) and ok == "FALSE":
                    out["green_fail"] += 1
                    src = st.ip_addresses.get(a.ip_address) if getattr(a, "ip_address", None) else None
                    dst = st.ip_addresses.get(a.dest_ip) if getattr(a, "dest_ip", "") not in ("", None) else None
                    blue_caused = any(h is not None and step - last_restore.get(h, -99) <= SELF_HARM_WINDOW for h in (src, dst))
                    if not blue_caused and src and dst:
                        ss, ds = st.hostname_subnet_map[src].value, st.hostname_subnet_map[dst].value
                        blue_caused = ss in st.blocks.get(ds, [])
                    out["green_fail_blue" if blue_caused else "green_fail_red"] += 1
                if ag.startswith("red") and isinstance(a, Impact) and ok == "TRUE":
                    out["red_impact"] += 1
                    if out["first_impact_step"] is None:
                        out["first_impact_step"] = step
            held, root = set(), set()
            for ag, sess in st.sessions.items():
                if ag.startswith("red"):
                    for s in sess.values():
                        if s.active:
                            held.add(s.hostname)
                            if s.username in ("root", "SYSTEM"):
                                root.add(s.hostname)
            out["red_hosts_max"] = max(out["red_hosts_max"], len(held))
            out["red_root_hosts_max"] = max(out["red_root_hosts_max"], len(root))
            out["steps"] = step + 1
            if all(term.get(b, False) or trunc.get(b, False) for b in blues):
                break
    finally:
        if pool:
            pool.shutdown(wait=True, cancel_futures=True)
    out["wall_s"] = round(time.time() - t0, 2)
    out["trajectory_sha256"] = traj.hexdigest()
    out["actions_sha256"] = acts_hash.hexdigest()
    out["actions"] = dict(out["actions"])
    out["usd"] = round(out["usd"], 6)
    out["system_sha256"] = {b: sha(s) for b, s in systems.items()} or None
    return out, calls


# ---------- jobs ----------
_spend = None


def _init(cap, lock, value):
    global _spend
    _spend = Spend(cap, lock, value)


def name(job):
    return f"{job['arm']}-{job['red']}-s{job['seed']}"


def run_job(args):
    job, outdir = args
    path = os.path.join(outdir, name(job) + ".json")
    if os.path.exists(path):
        return {"job": name(job), "skipped": True}
    try:
        res, calls = episode(job["arm"], job["red"], int(job["seed"]), spend=_spend)
    except CapStop as e:
        return {"job": name(job), "error": "cap: " + str(e)}
    except Exception as e:  # an episode that does not finish is not written; the next wave retries it
        return {"job": name(job), "error": f"{type(e).__name__}: {str(e)[:300]}"}
    if calls:
        os.makedirs(os.path.join(outdir, "calls"), exist_ok=True)
        cp = os.path.join(outdir, "calls", name(job) + ".jsonl")
        with open(cp + ".tmp", "w") as f:
            for c in calls:
                f.write(json.dumps(c, separators=(",", ":")) + "\n")
        os.replace(cp + ".tmp", cp)
    with open(path + ".tmp", "w") as f:
        json.dump(res, f)
    os.replace(path + ".tmp", path)
    return {"job": name(job), "reward": round(res["reward"], 2), "calls": res["calls"], "invalid": res["invalid"], "usd": res["usd"]}


def run_jobs(jobs_file, outdir, workers=2, cap=None, cost_file=None):
    import multiprocessing as mp
    with open(jobs_file) as f:
        jobs = json.load(f)
    os.makedirs(outdir, exist_ok=True)
    lock, value = mp.Lock(), mp.Value("d", 0.0, lock=False)
    failed = 0
    with mp.Pool(workers, initializer=_init, initargs=(cap, lock, value)) as p:
        for i, r in enumerate(p.imap_unordered(run_job, [(j, outdir) for j in jobs]), 1):
            failed += 1 if r.get("error") else 0
            print(json.dumps({"at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "n": i, "of": len(jobs),
                              "spentUsd": round(value.value, 6), **r}), flush=True)
            if cost_file:  # the spend so far, rewritten after every episode, so a crash leaves the last figure
                with open(cost_file + ".tmp", "w") as f:
                    json.dump({"spentUsd": round(value.value, 6), "done": i, "of": len(jobs), "failed": failed}, f)
                os.replace(cost_file + ".tmp", cost_file)
    if cost_file:
        with open(cost_file + ".tmp", "w") as f:
            json.dump({"spentUsd": round(value.value, 6), "done": len(jobs), "of": len(jobs), "failed": failed, "final": True}, f)
        os.replace(cost_file + ".tmp", cost_file)
    return failed


def replay(outdir, arm, red, seed):
    job = {"arm": arm, "red": red, "seed": seed}
    with open(os.path.join(outdir, name(job) + ".json")) as f:
        rec = json.load(f)
    with open(os.path.join(outdir, "calls", name(job) + ".jsonl")) as f:
        calls = [json.loads(l) for l in f if l.strip()]
    replies = {(c["step"], c["agent"]): c for c in calls}
    try:
        res, again = episode(arm, red, int(seed), replies=replies)
    except Exception as e:
        return {"job": name(job), "replayed": False, "error": str(e)[:300]}
    same = (res["actions_sha256"] == rec["actions_sha256"] and res["trajectory_sha256"] == rec["trajectory_sha256"]
            and len(again) == len(calls) and abs(res["reward"] - rec["reward"]) < 1e-9)
    return {"job": name(job), "replayed": same, "calls": len(calls), "reward": rec["reward"], "replayReward": res["reward"]}


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "jobs":
        a = sys.argv[2:]
        opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
        cap = opt("--cap-usd")
        sys.exit(1 if run_jobs(a[0], a[1], int(opt("--workers", 2)), float(cap) if cap else None, opt("--cost-file")) else 0)
    elif cmd == "check":
        r = check_request(); print(json.dumps(r)); sys.exit(0 if r["ok"] else 1)
    elif cmd == "replay":
        print(json.dumps(replay(sys.argv[2], sys.argv[3], sys.argv[4], int(sys.argv[5]))))
    elif cmd == "prompt":
        arm, agent = sys.argv[2], sys.argv[3]
        sg = EnterpriseScenarioGenerator(blue_agent_class=SleepAgent, green_agent_class=EnterpriseGreenAgent,
                                         red_agent_class=FiniteStateRedAgent, steps=STEPS)
        cyborg = CybORG(sg, "sim", seed=74101); env = BlueEnterpriseWrapper(cyborg); env.reset()
        st = cyborg.environment_controller.state
        hosts = [h for h in env.hosts(agent) if "router" not in h and h in st.hosts]
        print(system_prompt(arm, agent, env.subnets(agent), hosts, [l for l in env.action_labels(agent) if not l.startswith("[Invalid]")]))
    else:
        sys.exit("usage: cy2.py jobs|replay|prompt ...")
