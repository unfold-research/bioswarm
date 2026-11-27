"""CY1b analysis: per-arm table and the registered L0 pass rule (tasks/CY1B-PREREG.md).

  python analyze1b.py <outdir> <resultdir>
"""
import glob, json, math, os, statistics as st, sys

ARMS = ["react", "disinfect", "disinfect-cd2", "disinfect-cd10", "disinfect-flat", "graded", "escalate"]
TESTED = ARMS[1:]
NEED = 34          # P(X >= 34 | 50, 1/2) = 0.0077 < 0.05 / 6
IMPACT_LIMIT = 1.10


def sign_p(better, worse):
    n = better + worse
    return 1.0 if n == 0 else sum(math.comb(n, k) for k in range(better, n + 1)) / 2 ** n


def main(outdir, resdir):
    runs = {a: {} for a in ARMS}
    for f in glob.glob(os.path.join(outdir, "*.json")):
        d = json.load(open(f))
        runs[d["arm"]][d["seed"]] = d
    m = lambda a, k: round(st.mean(d[k] for d in runs[a].values()), 1)
    table = {}
    for a in ARMS:
        rw = sorted(d["reward"] for d in runs[a].values())
        fi = sorted(d["first_impact_step"] for d in runs[a].values() if d["first_impact_step"] is not None)
        table[a] = {"episodes": len(runs[a]), "reward": m(a, "reward"), "reward_median": rw[len(rw) // 2], "reward_min": rw[0], "reward_max": rw[-1],
                    "green_fail": m(a, "green_fail"), "green_fail_blue": m(a, "green_fail_blue"), "green_fail_red": m(a, "green_fail_red"),
                    "red_impact": m(a, "red_impact"), "first_impact_step_median": fi[len(fi) // 2] if fi else None,
                    "red_hosts_max": m(a, "red_hosts_max"), "red_root_hosts_max": m(a, "red_root_hosts_max"),
                    "escalations": m(a, "escalations"),
                    "actions_per_episode": {k: round(sum(d["actions"].get(k, 0) for d in runs[a].values()) / len(runs[a]), 1) for k in ("Restore", "Remove")}}

    def paired(a, b):
        seeds = sorted(set(runs[a]) & set(runs[b]))
        better = sum(runs[a][s]["reward"] > runs[b][s]["reward"] for s in seeds)
        worse = sum(runs[a][s]["reward"] < runs[b][s]["reward"] for s in seeds)
        return {"seeds": len(seeds), "better": better, "worse": worse, "ties": len(seeds) - better - worse, "p_one_sided": round(sign_p(better, worse), 6)}

    screen = {}
    for a in TESTED:
        p1 = paired(a, "react")
        limit = round(IMPACT_LIMIT * table["react"]["red_impact"], 2)
        ok1, ok2 = p1["better"] >= NEED, table[a]["red_impact"] <= limit
        screen[a] = {"P1_vs_react": p1, "P1": ok1, "P2_red_impact": {"arm": table[a]["red_impact"], "react": table["react"]["red_impact"], "limit": limit},
                     "P2": ok2, "screen": "pass" if ok1 and ok2 else "fail"}
    passed = sorted((a for a in TESTED if screen[a]["screen"] == "pass"), key=lambda a: (-screen[a]["P1_vs_react"]["better"], -table[a]["reward"]))
    out = {"arms": table, "screen": screen, "cy2_candidate": passed[0] if passed else None,
           "descriptive_vs_disinfect": {a: paired(a, "disinfect") for a in TESTED if a != "disinfect"}}
    os.makedirs(resdir, exist_ok=True)
    json.dump(out, open(os.path.join(resdir, "analysis.json"), "w"), indent=1)
    with open(os.path.join(resdir, "episodes.jsonl"), "w") as f:
        for a in ARMS:
            for s in sorted(runs[a]):
                f.write(json.dumps(runs[a][s]) + "\n")
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
