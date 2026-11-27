"""CY0: CAGE Challenge 4 instrument pilot (tasks/CY0-PREREG.md). Code-only blue arms, no model calls.

Usage (inside the cage4 container, no network):
  python cy0.py episode <arm> <seed> <outdir>     one episode -> <outdir>/<arm>-s<seed>.json
  python cy0.py all <outdir> [workers]            every arm x seed, plus reproducibility repeats
"""
import hashlib, json, os, sys, time, warnings
from collections import Counter

warnings.filterwarnings("ignore")
import numpy as np
from CybORG import CybORG, CYBORG_VERSION
from CybORG.Agents import SleepAgent, EnterpriseGreenAgent, FiniteStateRedAgent
from CybORG.Agents.Wrappers import BlueEnterpriseWrapper
from CybORG.Simulator.Scenarios import EnterpriseScenarioGenerator
from CybORG.Simulator.Actions.AbstractActions.Impact import Impact
from CybORG.Simulator.Actions.GreenActions import GreenAccessService, GreenLocalWork

ARMS = ["sleep", "react", "react-msg"]
SEEDS = list(range(70001, 70051))
REPEAT_SEEDS = [70001, 70002]
STEPS = 500
COOLDOWN = 5          # react: do not restore the same host again within this many steps
SAMPLE_EVERY = 25     # LLM-view samples: every 25 steps, every blue agent


def proc_events(state, host):
    ev = state.hosts[host].events
    return len(ev.old_process_creation) + len(ev.process_creation)


def conn_events(state, host):
    ev = state.hosts[host].events
    return len(ev.old_network_connections) + len(ev.network_connections)


def llm_view(env, state, agent, raw_obs):
    """What an LLM defender would be handed each step: the same facts as the official flat vector, as text."""
    hosts = [h for h in env.hosts(agent) if "router" not in h]
    return json.dumps({
        "agent": agent,
        "mission_phase": int(state.mission_phase),
        "zones": env.subnets(agent),
        "blocked": {s: sorted(state.blocks.get(s, [])) for s in env.subnets(agent)},
        "hosts": [{"host": h, "suspicious_process": h in state.hosts and proc_events(state, h) > 0,
                   "suspicious_connection": h in state.hosts and conn_events(state, h) > 0} for h in hosts],
        "messages": [list(map(int, m)) for m in raw_obs.get("message", [])],
        "actions": [l for l in env.action_labels(agent) if not l.startswith("[Invalid]")],
    }, separators=(",", ":"))


def episode(arm, seed):
    sg = EnterpriseScenarioGenerator(blue_agent_class=SleepAgent, green_agent_class=EnterpriseGreenAgent,
                                     red_agent_class=FiniteStateRedAgent, steps=STEPS)
    cyborg = CybORG(sg, "sim", seed=seed)
    env = BlueEnterpriseWrapper(cyborg)
    env.reset()
    state = lambda: cyborg.environment_controller.state
    blues = list(env.agents)
    labels = {b: env.action_labels(b) for b in blues}
    index = {b: {l: i for i, l in enumerate(labels[b])} for b in blues}
    last_restore, rr = {}, {b: 0 for b in blues}
    out = {"arm": arm, "seed": seed, "cyborg": CYBORG_VERSION, "steps": 0, "reward": 0.0,
           "green_fail": 0, "red_impact": 0, "messages_sent": 0,
           "actions": Counter(), "red_hosts_max": 0, "red_root_hosts_max": 0,
           "first_impact_step": None, "samples": []}
    traj = hashlib.sha256()
    t0 = time.time()
    for step in range(STEPS):
        st = state()
        acts, msgs = {}, {}
        alarms_in = {}
        for b in blues:
            raw = cyborg.get_observation(b)
            alarms_in[b] = sum(int(m[0]) for m in raw.get("message", []) if len(m))
            if step % SAMPLE_EVERY == 0:
                out["samples"].append(llm_view(env, st, b, raw))
        for b in blues:
            choice = "Sleep"
            if arm in ("react", "react-msg"):
                hosts = [h for h in env.hosts(b) if "router" not in h and h in st.hosts]
                hit = [h for h in hosts if proc_events(st, h) > 0 and step - last_restore.get(h, -99) > COOLDOWN]
                hit.sort(key=lambda h: (0 if "server" in h else 1, h))
                own_alarm = bool(hit)
                if hit and f"Restore {hit[0]}" in index[b]:
                    choice = f"Restore {hit[0]}"; last_restore[hit[0]] = step
                elif arm == "react-msg" and alarms_in[b] > 0 and hosts:
                    h = hosts[rr[b] % len(hosts)]; rr[b] += 1
                    if f"Analyse {h}" in index[b]:
                        choice = f"Analyse {h}"
                if arm == "react-msg":
                    m = np.zeros(8, dtype=np.int64); m[0] = int(own_alarm)
                    msgs[b] = m; out["messages_sent"] += int(own_alarm)
            acts[b] = index[b][choice]
            out["actions"][choice.split(" ")[0]] += 1
        obs, rew, term, trunc, info = env.step(acts, messages=msgs if msgs else None)
        r = float(np.mean(list(rew.values()))) if rew else 0.0
        out["reward"] += r
        traj.update(f"{r:.6f}".encode())
        st = state()
        phase = st.mission_phase
        for ag in cyborg.active_agents:
            if not (ag.startswith("green") or ag.startswith("red")):
                continue
            a = cyborg.get_last_action(ag)
            a = a[0] if isinstance(a, list) and a else a
            ok = cyborg.get_observation(ag).get("success")
            ok = getattr(ok, "name", str(ok))  # TernaryEnum: TRUE, FALSE, UNKNOWN
            if ag.startswith("green") and isinstance(a, (GreenLocalWork, GreenAccessService)) and ok == "FALSE":
                out["green_fail"] += 1
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
    out["actions"] = dict(out["actions"])
    return out


def run_one(args):
    arm, seed, outdir, tag = args
    path = os.path.join(outdir, f"{arm}-s{seed}{tag}.json")
    if os.path.exists(path):
        return path
    res = episode(arm, seed)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(res, f)
    os.replace(tmp, path)
    return path


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "episode":
        print(run_one((sys.argv[2], int(sys.argv[3]), sys.argv[4], "")))
    elif cmd == "all":
        outdir = sys.argv[2]; workers = int(sys.argv[3]) if len(sys.argv) > 3 else 2
        os.makedirs(outdir, exist_ok=True)
        jobs = [(a, s, outdir, "") for s in SEEDS for a in ARMS] + [(a, s, outdir, "-repeat") for s in REPEAT_SEEDS for a in ARMS]
        from multiprocessing import Pool
        with Pool(workers) as p:
            for i, path in enumerate(p.imap_unordered(run_one, jobs), 1):
                print(f"{i}/{len(jobs)} {os.path.basename(path)}", flush=True)
