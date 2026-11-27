"""CY1 analysis: per-arm table and the registered L0 pass rule (tasks/CY1-PREREG.md).

  python analyze1.py <outdir> <resultdir>
"""
import glob, json, math, os, statistics as st, sys

ARMS = ["react", "react-msg", "react-decoy", "react-block", "alarm-decay", "plasticity", "disinfect", "fever"]
BIO = {"alarm-decay": "react-decoy", "plasticity": "react-block", "disinfect": None, "fever": "react-decoy"}


def sign_p(better, worse):
    """One-sided sign test, ties dropped: P(X >= better | n, 1/2)."""
    n = better + worse
    if n == 0:
        return 1.0
    return sum(math.comb(n, k) for k in range(better, n + 1)) / 2 ** n


def main(outdir, resdir):
    runs = {a: {} for a in ARMS}
    for f in glob.glob(os.path.join(outdir, "*.json")):
        d = json.load(open(f))
        runs[d["arm"]][d["seed"]] = d
    m = lambda a, k: round(st.mean(d[k] for d in runs[a].values()), 1)
    table = {}
    for a in ARMS:
        delays = {}
        for d in runs[a].values():
            for k, v in d["message_delay"].items():
                delays[k] = delays.get(k, 0) + v
        table[a] = {"episodes": len(runs[a]), "reward": m(a, "reward"),
                    "reward_median": sorted(d["reward"] for d in runs[a].values())[len(runs[a]) // 2],
                    "green_fail": m(a, "green_fail"), "green_fail_blue": m(a, "green_fail_blue"), "green_fail_red": m(a, "green_fail_red"),
                    "red_impact": m(a, "red_impact"), "red_hosts_max": m(a, "red_hosts_max"), "red_root_hosts_max": m(a, "red_root_hosts_max"),
                    "messages_sent": m(a, "messages_sent"), "message_delay": delays,
                    "actions_per_episode": {k: round(sum(d["actions"].get(k, 0) for d in runs[a].values()) / len(runs[a]), 1)
                                            for k in ("Restore", "Analyse", "DeployDecoy", "BlockTrafficZone", "AllowTrafficZone")}}

    def paired(a, b):
        seeds = sorted(set(runs[a]) & set(runs[b]))
        better = sum(runs[a][s]["reward"] > runs[b][s]["reward"] for s in seeds)
        worse = sum(runs[a][s]["reward"] < runs[b][s]["reward"] for s in seeds)
        return {"seeds": len(seeds), "better": better, "worse": worse, "ties": len(seeds) - better - worse, "p_one_sided": round(sign_p(better, worse), 6)}

    verdicts = {}
    for a, ctrl in BIO.items():
        p1 = paired(a, "react")
        p2 = table[a]["red_impact"] <= 1.10 * table["react"]["red_impact"]
        p3 = paired(a, ctrl) if ctrl else None
        ok1, ok3 = p1["better"] >= 33, (p3["better"] >= 26) if p3 else True
        verdicts[a] = {"P1_vs_react": p1, "P1": ok1,
                       "P2_red_impact": {"arm": table[a]["red_impact"], "react": table["react"]["red_impact"], "limit": round(1.10 * table["react"]["red_impact"], 2)}, "P2": p2,
                       "P3_vs_control": dict(p3, control=ctrl) if p3 else None, "P3": ok3,
                       "screen": "pass" if (ok1 and p2 and ok3) else ("action helps, signal does not" if ok1 and p2 and not ok3 else "fail")}
    descriptive = {f"{a}_vs_react": paired(a, "react") for a in ("react-msg", "react-decoy", "react-block")}
    out = {"arms": table, "screen": verdicts, "descriptive_paired": descriptive}
    os.makedirs(resdir, exist_ok=True)
    json.dump(out, open(os.path.join(resdir, "analysis.json"), "w"), indent=1)
    with open(os.path.join(resdir, "episodes.jsonl"), "w") as f:
        for a in ARMS:
            for s in sorted(runs[a]):
                f.write(json.dumps(runs[a][s]) + "\n")
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
