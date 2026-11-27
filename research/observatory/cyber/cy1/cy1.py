"""CY1: code-policy screen of biological defence mechanisms on CAGE Challenge 4 (tasks/CY1-PREREG.md). No model calls.

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

ARMS = ["react", "react-msg", "react-decoy", "react-block", "alarm-decay", "plasticity", "disinfect", "fever"]
SEEDS = list(range(71001, 71051))
STEPS = 500
COOLDOWN = 5           # do not restore the same host again within this many steps
SELF_HARM_WINDOW = 5   # Restore lasts 5 steps in CC4
LAMBDA, THETA, REOPEN = 0.7, 1.5, 0.5
FEVER_ZONES, FEVER_WINDOW, FEVER_HOLD = 2, 10, 20
SIGNAL_ARMS = {"react-msg", "alarm-decay", "plasticity", "fever"}


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
    bid = {b: i for i, b in enumerate(blues)}
    labels = {b: env.action_labels(b) for b in blues}
    index = {b: {l: i for i, l in enumerate(labels[b])} for b in blues}
    blocks_of = {b: {zone_of(l): l for l in labels[b] if l.startswith("BlockTrafficZone") and not l.startswith("[Invalid]")} for b in blues}
    allows_of = {b: {zone_of(l): l for l in labels[b] if l.startswith("AllowTrafficZone") and not l.startswith("[Invalid]")} for b in blues}
    subnets = {b: env.subnets(b) for b in blues}
    last_restore = {}
    decoyed = {b: set() for b in blues}
    field = {b: defaultdict(float) for b in blues}          # alarm field per sender
    recent = {b: [] for b in blues}                          # (step, sender) received
    fever_until = {b: -1 for b in blues}
    my_blocks = {b: set() for b in blues}                    # (to, from) we blocked
    out = {"arm": arm, "seed": seed, "cyborg": CYBORG_VERSION, "steps": 0, "reward": 0.0,
           "green_fail": 0, "green_fail_blue": 0, "green_fail_red": 0, "red_impact": 0, "first_impact_step": None,
           "messages_sent": 0, "message_delay": Counter(), "actions": Counter(), "red_hosts_max": 0, "red_root_hosts_max": 0}
    traj = hashlib.sha256()
    t0 = time.time()
    for step in range(STEPS):
        st = state()
        acts, msgs = {}, {}
        got = {b: 0 for b in blues}                          # alarms received this step
        for b in blues:
            raw = cyborg.get_observation(b)
            for m in raw.get("message", []):
                m = list(map(int, m))
                if len(m) == 8 and m[0]:
                    sender = m[1] | (m[2] << 1) | (m[3] << 2)
                    sent = m[4] | (m[5] << 1) | (m[6] << 2) | (m[7] << 3)
                    out["message_delay"][(step - sent) % 16] += 1
                    field[b][sender] += 1.0
                    got[b] += 1
                    recent[b].append((step, sender))
            recent[b] = [(s, x) for s, x in recent[b] if step - s < FEVER_WINDOW]
            if arm == "fever" and len({x for _, x in recent[b]}) >= FEVER_ZONES:
                fever_until[b] = step + FEVER_HOLD
        for b in blues:
            hosts = [h for h in env.hosts(b) if "router" not in h and h in st.hosts]
            servers = [h for h in hosts if "server" in h]
            cue = lambda h: events(st, h, "proc") > 0 or (arm == "disinfect" and events(st, h, "conn") > 0)
            hit = [h for h in hosts if cue(h) and step - last_restore.get(h, -99) > COOLDOWN]
            hit.sort(key=lambda h: (0 if "server" in h else 1, h))
            choice = "Sleep"
            if hit and f"Restore {hit[0]}" in index[b]:
                choice = f"Restore {hit[0]}"; last_restore[hit[0]] = step
                decoyed[b].discard(hit[0])
            else:
                total = sum(field[b].values())
                want_decoy = (arm == "react-decoy") or (arm == "alarm-decay" and total >= THETA) or (arm == "fever" and step <= fever_until[b])
                if arm == "react-msg" and got[b] > 0 and hosts:   # CY0 rule: only in a step an alarm arrived
                    h = hosts[step % len(hosts)]
                    if f"Analyse {h}" in index[b]:
                        choice = f"Analyse {h}"
                elif want_decoy:
                    todo = [h for h in servers if h not in decoyed[b] and f"DeployDecoy {h}" in index[b]]
                    if todo:
                        choice = f"DeployDecoy {todo[0]}"; decoyed[b].add(todo[0])
                elif arm == "react-block":
                    policy = env.comms_policies[st.mission_phase] if hasattr(env, "comms_policies") else None
                    for (to, frm), lab in sorted(blocks_of[b].items()):
                        needed = policy is not None and policy.has_edge(to, frm)
                        if not needed and (to, frm) not in my_blocks[b]:
                            choice = lab; my_blocks[b].add((to, frm)); break
                    else:
                        for (to, frm) in sorted(my_blocks[b]):
                            if policy is not None and policy.has_edge(to, frm) and (to, frm) in allows_of[b]:
                                choice = allows_of[b][(to, frm)]; my_blocks[b].discard((to, frm)); break
                elif arm == "plasticity":
                    hot = {s for s, v in field[b].items() if v >= THETA}
                    cool = {s for s, v in field[b].items() if v < REOPEN}
                    hot_zones = {z for s in hot if s < len(blues) for z in subnets[blues[s]]}
                    cool_zones = {z for s in cool if s < len(blues) for z in subnets[blues[s]]}
                    for (to, frm), lab in sorted(blocks_of[b].items()):
                        if frm in hot_zones and (to, frm) not in my_blocks[b]:
                            choice = lab; my_blocks[b].add((to, frm)); break
                    else:
                        for (to, frm) in sorted(my_blocks[b]):
                            if frm in cool_zones and (to, frm) in allows_of[b]:
                                choice = allows_of[b][(to, frm)]; my_blocks[b].discard((to, frm)); break
            if arm in SIGNAL_ARMS:
                m = np.zeros(8, dtype=np.int64)
                if hit:
                    m[0] = 1
                    i = bid[b]; m[1], m[2], m[3] = i & 1, (i >> 1) & 1, (i >> 2) & 1
                    s = step % 16; m[4], m[5], m[6], m[7] = s & 1, (s >> 1) & 1, (s >> 2) & 1, (s >> 3) & 1
                    out["messages_sent"] += 1
                msgs[b] = m
            for s in list(field[b]):
                field[b][s] *= LAMBDA
            acts[b] = index[b][choice]
            out["actions"][choice.split(" ")[0]] += 1
        obs, rew, term, trunc, info = env.step(acts, messages=msgs if msgs else None)
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
    out["message_delay"] = {str(k): v for k, v in sorted(out["message_delay"].items())}
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
