"""GN-S3: code-only swarm-defence arms on CAGE Challenge 4 (tasks/GN-S3-PREREG.md). No model calls, no network.

Harness, cue, metrics and self-harm attribution are CY2's (observatory/cyber/cy2/cy2.py); the base policy of every arm
is CY2's code-cd10. Runs offline (the driver uses --network none). Six arms:
  code-react      CY2 react (process cue, cooldown 5)
  code-cd10       CY2 disinfect-cd10 (proc-or-conn cue, cooldown 10) -- the strongest reference
  code-alarm      SIG-04: cooldown 5 (not 10) for 10 steps after any OTHER zone had a cue the previous step
  code-scaled     DEF-04: cooldown 10/7/5 for n=1 / n=2 / n>=3 cue hosts in the agent's own zone this step
  code-sentinel   DEF-07: on a quiet step the rotating agent (step mod 5) runs Analyse on its oldest-analysed host
  code-cd10-qa    control for DEF-07: same rotation, Analyse on a random own-zone host (seeded from seed+step)

  python gn_s3.py jobs <jobs.json> <outdir> [--workers N]   each job {arm, red, seed}; writes <arm>-<red>-s<seed>.json
  python gn_s3.py episode <arm> <red> <seed> <outdir>
  python gn_s3.py replay <outdir> <arm> <red> <seed>        re-runs and checks the action hash (no randomness in code arms)
"""
import hashlib, json, os, sys, time, warnings
from collections import Counter

warnings.filterwarnings("ignore")
import numpy as np
from CybORG import CybORG, CYBORG_VERSION
from CybORG.Agents import SleepAgent, EnterpriseGreenAgent, FiniteStateRedAgent, DiscoveryFSRed
from CybORG.Agents.Wrappers import BlueEnterpriseWrapper
from CybORG.Simulator.Scenarios import EnterpriseScenarioGenerator
from CybORG.Simulator.Actions.AbstractActions.Impact import Impact
from CybORG.Simulator.Actions.GreenActions import GreenAccessService, GreenLocalWork

ARMS = ["code-react", "code-cd10", "code-alarm", "code-scaled", "code-sentinel", "code-cd10-qa"]
REDS = {"fsm": FiniteStateRedAgent, "discovery": DiscoveryFSRed}
STEPS = 500
SELF_HARM_WINDOW = 5
BASE_CD = 10          # code-cd10's cooldown; react overrides to 5
REACT_CD = 5
ALARM_CD = 5          # code-alarm's reduced cooldown while the alarm is on
ALARM_WINDOW = 10     # steps the alarm stays on after a trigger


def events(state, host, kind):
    ev = state.hosts[host].events
    return len(ev.old_process_creation) + len(ev.process_creation) if kind == "proc" else \
        len(ev.old_network_connections) + len(ev.network_connections)


def episode(arm, red, seed):
    sg = EnterpriseScenarioGenerator(blue_agent_class=SleepAgent, green_agent_class=EnterpriseGreenAgent,
                                     red_agent_class=REDS[red], steps=STEPS)
    cyborg = CybORG(sg, "sim", seed=seed)
    env = BlueEnterpriseWrapper(cyborg)
    env.reset()
    state = lambda: cyborg.environment_controller.state
    blues = list(env.agents)
    index = {b: {l: i for i, l in enumerate(env.action_labels(b))} for b in blues}
    last_restore, last_act = {}, {}        # host -> step; host -> (step, cooldown)
    last_analyse = {}                      # host -> step of its last Analyse (DEF-07)
    cue_prev = {b: False for b in blues}   # did this zone have a cue on the previous step (SIG-04)
    alarm_until = {b: -1 for b in blues}   # SIG-04: alarm on for this zone through this step
    sent_rng = np.random.RandomState(seed)  # code-cd10-qa only (seeded from the episode seed)
    out = {"arm": arm, "red": red, "seed": seed, "cyborg": CYBORG_VERSION, "steps": 0, "reward": 0.0,
           "green_fail": 0, "green_fail_blue": 0, "green_fail_red": 0, "red_impact": 0, "first_impact_step": None,
           "actions": Counter(), "red_hosts_max": 0, "red_root_hosts_max": 0, "cue_steps": 0, "sentinel_steps": 0,
           "analyse_changed_view": 0}
    traj, acts_hash = hashlib.sha256(), hashlib.sha256()
    pending_analyse = []   # (host, step) Analyse issued, to check if the view changed within a few steps (stage 0)
    t0 = time.time()

    def rule(hosts, cue_fn, step, cooldown):
        hit = [h for h in hosts if cue_fn(h) and step - last_act.get(h, (-99, 0))[0] > cooldown]
        hit.sort(key=lambda h: (0 if "server" in h else 1, h))
        return hit

    for step in range(STEPS):
        st = state()
        acts = {}
        cue_now = {}
        for bi, b in enumerate(blues):
            hosts = [h for h in env.hosts(b) if "router" not in h and h in st.hosts]
            pc = {h: events(st, h, "proc") for h in hosts}
            cc = {h: events(st, h, "conn") for h in hosts}
            hit_hosts = [h for h in hosts if pc[h] > 0 or cc[h] > 0]
            cue = bool(hit_hosts) if arm != "code-react" else any(pc[h] > 0 for h in hosts)
            cue_now[b] = cue
            choice = "Sleep"
            if cue:
                out["cue_steps"] += 1
                if arm == "code-react":
                    cue_fn, cd = (lambda h: pc[h] > 0), REACT_CD
                elif arm == "code-alarm":
                    cue_fn = lambda h: pc[h] > 0 or cc[h] > 0
                    cd = ALARM_CD if step <= alarm_until[b] else BASE_CD
                elif arm == "code-scaled":
                    n = len(hit_hosts); cd = BASE_CD if n <= 1 else (7 if n == 2 else 5)
                    cue_fn = lambda h: pc[h] > 0 or cc[h] > 0
                else:
                    cue_fn, cd = (lambda h: pc[h] > 0 or cc[h] > 0), BASE_CD
                for h in rule(hosts, cue_fn, step, cd):
                    if f"Restore {h}" in index[b]:
                        choice = f"Restore {h}"; break
            elif arm in ("code-sentinel", "code-cd10-qa") and bi == step % len(blues) and hosts:
                # quiet step: the rotating agent watches (Analyse), matched between the two arms
                if arm == "code-sentinel":
                    h = min(hosts, key=lambda h: last_analyse.get(h, -10 ** 9))
                else:
                    h = hosts[sent_rng.randint(len(hosts))]
                if f"Analyse {h}" in index[b]:
                    choice = f"Analyse {h}"; out["sentinel_steps"] += 1
            acts[b] = choice

        for b in blues:
            choice = acts[b]
            kind, _, h = choice.partition(" ")
            if kind == "Restore":
                last_restore[h] = step
                last_act[h] = (step, BASE_CD)   # the clock advances; the per-arm cooldown is applied in rule()
            elif kind == "Analyse":
                last_analyse[h] = step
                pending_analyse.append((b, h, step))
            out["actions"][kind] += 1
            acts_hash.update(f"{step}|{b}|{choice}\n".encode())
        # SIG-04: an alarm turns on for a zone whenever some OTHER zone had a cue on the previous step
        if arm == "code-alarm":
            for b in blues:
                if any(cue_prev[o] for o in blues if o != b):
                    alarm_until[b] = step + ALARM_WINDOW
        cue_prev = cue_now

        obs, rew, term, trunc, info = env.step({b: index[b][acts[b]] for b in blues})
        r = float(np.mean(list(rew.values()))) if rew else 0.0
        out["reward"] += r
        traj.update(f"{r:.6f}".encode())
        st = state()
        # stage 0: did an Analyse change the zone's view (a host it analysed shows a cue within 3 later steps)?
        still = []
        for (b, h, s0) in pending_analyse:
            if step - s0 > 3:
                continue
            if h in st.hosts and (events(st, h, "proc") > 0 or events(st, h, "conn") > 0):
                out["analyse_changed_view"] += 1
            else:
                still.append((b, h, s0))
        pending_analyse = still
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
                blue_caused = any(hh is not None and step - last_restore.get(hh, -99) <= SELF_HARM_WINDOW for hh in (src, dst))
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
    out["wall_s"] = round(time.time() - t0, 2)
    out["trajectory_sha256"] = traj.hexdigest()
    out["actions_sha256"] = acts_hash.hexdigest()
    out["actions"] = dict(out["actions"])
    return out


def name(j):
    return f"{j['arm']}-{j['red']}-s{j['seed']}"


def run_one(args):
    j, outdir = args
    path = os.path.join(outdir, name(j) + ".json")
    if os.path.exists(path):
        return {"job": name(j), "skipped": True}
    try:
        res = episode(j["arm"], j["red"], int(j["seed"]))
    except Exception as e:
        return {"job": name(j), "error": f"{type(e).__name__}: {str(e)[:300]}"}
    with open(path + ".tmp", "w") as f:
        json.dump(res, f)
    os.replace(path + ".tmp", path)
    return {"job": name(j), "reward": round(res["reward"], 1), "impacts": res["red_impact"], "hash": res["actions_sha256"][:12]}


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "jobs":
        a = sys.argv[2:]
        workers = int(a[a.index("--workers") + 1]) if "--workers" in a else 2
        with open(a[0]) as f:
            jobs = json.load(f)
        os.makedirs(a[1], exist_ok=True)
        from multiprocessing import Pool
        failed = 0
        with Pool(workers) as p:
            for i, r in enumerate(p.imap_unordered(run_one, [(j, a[1]) for j in jobs]), 1):
                failed += 1 if r.get("error") else 0
                print(json.dumps({"n": i, "of": len(jobs), **r}), flush=True)
        sys.exit(1 if failed else 0)
    elif cmd == "episode":
        res = episode(sys.argv[2], sys.argv[3], int(sys.argv[4]))
        os.makedirs(sys.argv[5], exist_ok=True)
        with open(os.path.join(sys.argv[5], name({"arm": sys.argv[2], "red": sys.argv[3], "seed": int(sys.argv[4])}) + ".json"), "w") as f:
            json.dump(res, f)
        print(json.dumps({k: res[k] for k in ("arm", "red", "seed", "reward", "red_impact", "cue_steps", "sentinel_steps", "analyse_changed_view", "actions", "actions_sha256")}))
    elif cmd == "replay":
        j = {"arm": sys.argv[3], "red": sys.argv[4], "seed": int(sys.argv[5])}
        rec = json.load(open(os.path.join(sys.argv[2], name(j) + ".json")))
        again = episode(j["arm"], j["red"], j["seed"])
        same = again["actions_sha256"] == rec["actions_sha256"] and again["trajectory_sha256"] == rec["trajectory_sha256"]
        print(json.dumps({"job": name(j), "replayed": same, "hash": again["actions_sha256"][:12]}))
        sys.exit(0 if same else 1)
    elif cmd == "zones":
        # stage 0 check 2: each agent's own-zone hosts (the only hosts an arm can ever act on, by construction)
        sg = EnterpriseScenarioGenerator(blue_agent_class=SleepAgent, green_agent_class=EnterpriseGreenAgent, red_agent_class=FiniteStateRedAgent, steps=STEPS)
        cyborg = CybORG(sg, "sim", seed=int(sys.argv[2]) if len(sys.argv) > 2 else 77101); env = BlueEnterpriseWrapper(cyborg); env.reset()
        st = cyborg.environment_controller.state
        z = {b: {"subnets": env.subnets(b), "hosts": [h for h in env.hosts(b) if "router" not in h and h in st.hosts]} for b in env.agents}
        print(json.dumps(z))
    else:
        sys.exit("usage: gn_s3.py jobs|episode|replay|zones ...")
