"""CY1b: free screen of early-disinfection variants on CAGE Challenge 4 (tasks/CY1B-PREREG.md). No model calls.
Harness, observations, metrics and self-harm attribution are CY1's (observatory/cyber/cy1/cy1.py).

  python cy1.py episode <arm> <seed> <outdir>
  python cy1.py all <outdir> [workers]
"""
import hashlib, json, os, sys, time, warnings
from collections import Counter, defaultdict

warnings.filterwarnings("ignore")
import numpy as np
from CybORG import CybORG, CYBORG_VERSION
from CybORG.Agents import SleepAgent, EnterpriseGreenAgent, FiniteStateRedAgent
from CybORG.Agents.Wrappers import BlueEnterpriseWrapper
from CybORG.Simulator.Scenarios import EnterpriseScenarioGenerator
from CybORG.Simulator.Actions.AbstractActions.Impact import Impact
from CybORG.Simulator.Actions.GreenActions import GreenAccessService, GreenLocalWork

ARMS = ["react", "disinfect", "disinfect-cd2", "disinfect-cd10", "disinfect-flat", "graded", "escalate"]
SEEDS = list(range(72001, 72051))
STEPS = 500
COOLDOWN = 5           # do not restore the same host again within this many steps
SELF_HARM_WINDOW = 5   # Restore lasts 5 steps in CC4
COOLDOWNS = {"disinfect-cd2": 2, "disinfect-cd10": 10}
ESCALATE_WINDOW, CD_AFTER_REMOVE = 10, 3


def events(state, host, kind):
    ev = state.hosts[host].events
    return len(ev.old_process_creation) + len(ev.process_creation) if kind == "proc" else \
        len(ev.old_network_connections) + len(ev.network_connections)


def zone_of(label):
    # "BlockTrafficZone <to> (cidr) <- <from> (cidr)" -> (to, from)
    parts = label.split(" ")
    return parts[1], parts[4]


def episode(arm, seed):
    sg = EnterpriseScenarioGenerator(blue_agent_class=SleepAgent, green_agent_class=EnterpriseGreenAgent,
                                     red_agent_class=FiniteStateRedAgent, steps=STEPS)
    cyborg = CybORG(sg, "sim", seed=seed)
    env = BlueEnterpriseWrapper(cyborg)
    env.reset()
    state = lambda: cyborg.environment_controller.state
    blues = list(env.agents)
    index = {b: {l: i for i, l in enumerate(env.action_labels(b))} for b in blues}
    cooldown = COOLDOWNS.get(arm, COOLDOWN)
    last_restore, last_remove, last_act = {}, {}, {}   # host -> step; last_act: host -> (step, cooldown)
    out = {"arm": arm, "seed": seed, "cyborg": CYBORG_VERSION, "steps": 0, "reward": 0.0,
           "green_fail": 0, "green_fail_blue": 0, "green_fail_red": 0, "red_impact": 0, "first_impact_step": None,
           "actions": Counter(), "escalations": 0, "red_hosts_max": 0, "red_root_hosts_max": 0}
    traj = hashlib.sha256()
    t0 = time.time()
    for step in range(STEPS):
        st = state()
        acts = {}
        for b in blues:
            hosts = [h for h in env.hosts(b) if "router" not in h and h in st.hosts]
            proc = lambda h: events(st, h, "proc") > 0
            conn = lambda h: events(st, h, "conn") > 0
            cue = proc if arm == "react" else (lambda h: proc(h) or conn(h))
            ready = lambda h: step - last_act.get(h, (-99, 0))[0] > last_act.get(h, (-99, 0))[1]
            hit = [h for h in hosts if cue(h) and ready(h)]
            hit.sort(key=(lambda h: h) if arm == "disinfect-flat" else (lambda h: (0 if "server" in h else 1, h)))
            choice = "Sleep"
            for h in hit:
                if arm == "graded":
                    kind = "Restore" if proc(h) else "Remove"
                elif arm == "escalate":
                    rem = last_remove.get(h, -99)
                    kind = "Restore" if step - rem <= ESCALATE_WINDOW and rem > last_restore.get(h, -99) else "Remove"
                else:
                    kind = "Restore"
                if f"{kind} {h}" not in index[b]:
                    continue
                choice = f"{kind} {h}"
                if kind == "Restore":
                    if arm == "escalate":
                        out["escalations"] += 1
                    last_restore[h] = step
                    last_act[h] = (step, cooldown)
                else:
                    last_remove[h] = step
                    last_act[h] = (step, CD_AFTER_REMOVE if arm == "escalate" else cooldown)
                break
            acts[b] = index[b][choice]
            out["actions"][choice.split(" ")[0]] += 1
        obs, rew, term, trunc, info = env.step(acts)
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
    out["wall_s"] = round(time.time() - t0, 2)
    out["trajectory_sha256"] = traj.hexdigest()
    out["actions"] = dict(out["actions"])
    return out


def run_one(args):
    arm, seed, outdir = args
    path = os.path.join(outdir, f"{arm}-s{seed}.json")
    if os.path.exists(path):
        return path
    res = episode(arm, seed)
    with open(path + ".tmp", "w") as f:
        json.dump(res, f)
    os.replace(path + ".tmp", path)
    return path


if __name__ == "__main__":
    if sys.argv[1] == "episode":
        print(run_one((sys.argv[2], int(sys.argv[3]), sys.argv[4])))
    elif sys.argv[1] == "all":
        outdir = sys.argv[2]; workers = int(sys.argv[3]) if len(sys.argv) > 3 else 2
        os.makedirs(outdir, exist_ok=True)
        jobs = [(a, s, outdir) for s in SEEDS for a in ARMS]
        from multiprocessing import Pool
        with Pool(workers) as p:
            for i, path in enumerate(p.imap_unordered(run_one, jobs), 1):
                print(f"{i}/{len(jobs)} {os.path.basename(path)}", flush=True)
