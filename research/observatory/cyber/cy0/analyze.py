"""CY0 analysis: per-arm tables, reproducibility, LLM view size and cost projection.

  python analyze.py <outdir> <resultdir>        reads <outdir>/*.json; token counts from <resultdir>/tokens.json if present
  python analyze.py --count <outdir> <resultdir>  counts tokens of 100 sampled views per model (free endpoint); needs ANTHROPIC_API_KEY
"""
import glob, json, os, random, statistics as st, sys

ARMS = ["sleep", "react", "react-msg"]
# US$ per million tokens, batch = half the list price (claude-api reference, cached 2026-11-03)
PRICE = {"claude-haiku-5-5": (0.10, 0.50), "claude-sonnet-5-5": (2.00, 10.00)}
BATCH = 0.5
OUT_TOKENS_PER_DECISION = 150   # assumption stated in the report: a short action choice plus an 8-bit message


def load(outdir):
    runs = {}
    for f in glob.glob(os.path.join(outdir, "*.json")):
        d = json.load(open(f))
        d["_repeat"] = f.endswith("-repeat.json")
        runs.setdefault(d["arm"], []).append(d)
    return runs


def summ(xs):
    xs = sorted(xs)
    return {"mean": round(st.mean(xs), 1), "median": xs[len(xs) // 2], "min": xs[0], "max": xs[-1]}


def count(outdir, resdir):
    import anthropic
    client = anthropic.Anthropic()
    runs = load(outdir)
    pool = [(d["arm"], s) for a in ARMS for d in runs.get(a, []) if not d["_repeat"] for s in d["samples"]]
    random.Random(70000).shuffle(pool)
    sample = pool[:100]
    res = {"n": len(sample), "chars": [len(s) for _, s in sample], "models": {}}
    for model in PRICE:
        toks = [client.messages.count_tokens(model=model, messages=[{"role": "user", "content": s}]).input_tokens for _, s in sample]
        res["models"][model] = toks
    os.makedirs(resdir, exist_ok=True)
    json.dump(res, open(os.path.join(resdir, "tokens.json"), "w"), indent=1)
    print({m: summ(t) for m, t in res["models"].items()})


def analyze(outdir, resdir):
    runs = load(outdir)
    table, repro = {}, []
    for a in ARMS:
        main = [d for d in runs.get(a, []) if not d["_repeat"]]
        table[a] = {"episodes": len(main),
                    "reward": summ([d["reward"] for d in main]),
                    "green_fail": summ([d["green_fail"] for d in main]),
                    "red_impact": summ([d["red_impact"] for d in main]),
                    "episodes_with_red_impact": sum(1 for d in main if d["red_impact"] > 0),
                    "red_hosts_max": summ([d["red_hosts_max"] for d in main]),
                    "red_root_hosts_max": summ([d["red_root_hosts_max"] for d in main]),
                    "first_impact_step": summ([d["first_impact_step"] for d in main if d["first_impact_step"] is not None]) if any(d["first_impact_step"] is not None for d in main) else None,
                    "messages_sent": summ([d["messages_sent"] for d in main]),
                    "actions_per_episode": {k: round(sum(d["actions"].get(k, 0) for d in main) / max(1, len(main)), 1) for k in ("Sleep", "Restore", "Analyse")},
                    "wall_s": summ([d["wall_s"] for d in main]),
                    "steps": summ([d["steps"] for d in main])}
        by_seed = {d["seed"]: d for d in main}
        for d in runs.get(a, []):
            if d["_repeat"]:
                o = by_seed.get(d["seed"])
                repro.append({"arm": a, "seed": d["seed"], "same_trajectory": bool(o) and o["trajectory_sha256"] == d["trajectory_sha256"],
                              "reward": [o["reward"] if o else None, d["reward"]]})
    # paired by seed: react / react-msg against sleep (descriptive only, CY0 has no hypothesis)
    paired = {}
    for a in ("react", "react-msg"):
        s = {d["seed"]: d["reward"] for d in runs.get("sleep", []) if not d["_repeat"]}
        x = {d["seed"]: d["reward"] for d in runs.get(a, []) if not d["_repeat"]}
        common = sorted(set(s) & set(x))
        paired[a + "_vs_sleep"] = {"seeds": len(common), "better": sum(x[k] > s[k] for k in common), "worse": sum(x[k] < s[k] for k in common)}
    s = {d["seed"]: d["reward"] for d in runs.get("react", []) if not d["_repeat"]}
    x = {d["seed"]: d["reward"] for d in runs.get("react-msg", []) if not d["_repeat"]}
    common = sorted(set(s) & set(x))
    paired["react-msg_vs_react"] = {"seeds": len(common), "better": sum(x[k] > s[k] for k in common), "worse": sum(x[k] < s[k] for k in common)}

    cost = None
    tf = os.path.join(resdir, "tokens.json")
    if os.path.exists(tf):
        tk = json.load(open(tf))
        steps = st.mean(d["steps"] for a in ARMS for d in runs.get(a, []) if not d["_repeat"])
        cost = {"sample_n": tk["n"], "view_chars": summ(tk["chars"]), "steps_per_episode": round(steps, 1),
                "output_tokens_per_decision_assumed": OUT_TOKENS_PER_DECISION, "per_model": {}}
        for m, toks in tk["models"].items():
            pin, pout = PRICE[m]
            mean_in = st.mean(toks)
            # zones: five agents, one call each per step. manager: five reports plus one manager call that sees all five views.
            # single: one agent that sees all five views. No prompt caching, no system prompt: a floor on input.
            arms = {"zones-5": (5 * mean_in, 5), "manager": (5 * mean_in + 5 * mean_in, 6), "single": (5 * mean_in, 1)}
            per = {}
            for k, (tin, calls) in arms.items():
                usd = steps * (tin * pin + calls * OUT_TOKENS_PER_DECISION * pout) / 1e6
                per[k] = {"input_tokens_per_step": round(tin), "usd_per_episode_list": round(usd, 3), "usd_per_episode_batch": round(usd * BATCH, 3)}
            cost["per_model"][m] = {"view_tokens": summ(toks), "arms": per}
    out = {"arms": table, "reproducibility": repro, "paired_reward": paired, "llm_cost": cost}
    os.makedirs(resdir, exist_ok=True)
    json.dump(out, open(os.path.join(resdir, "analysis.json"), "w"), indent=1)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    if sys.argv[1] == "--count":
        count(sys.argv[2], sys.argv[3])
    else:
        analyze(sys.argv[1], sys.argv[2])
