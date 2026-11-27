# AU-R3 preregistration: team size against load in GN-S2's free model (2026-11-22)

Registered on 2026-11-22, before the first run. Agenda item 3 of `programs/autonomy.md` (Autonomy programme, AU series). **Free: a simulation on benchhost, no model calls, no ledger entry.** Code: `sims/screen-scale-n.mjs` v1.0.0, committed with this file (sha256 `2c56eb371cc78011022b70bbf9178eb902fea523a152161f5877df13b5a008b8`). Level L0 of the evidence ladder: it says whether a paid size arm is worth running, never that a team-size rule works.

## Conditions agreed with Genome Research (2026-11-22), binding

1. **This rule is registered on `main` before the first run.** The only execution before registration was a syntax and timing smoke test of the code with 3 runs per cell on worlds outside the block (`smoke|i`), outside the repository; its shares were not read.
2. **The SIG-06 local and even-split arms reuse GN-S2's nine confirmed choices**: SIG-06 reads the neighbourhood of 3 on each side of the current module (k = 6), a module is ready only when the agent read it and all its dependencies in this round or the previous one and saw the dependencies correct, the context limit is C = 8 reads per agent per round, and the rest as in GN-S2's `RULE.interpretation` (world, global board, manager, even split, success rule). Source: `sims/screen-scale.mjs` v1.0.0 (sha256 `71e3c2f1eb30c594125b597b10505ccff22a1060dfb7de79eae111a3df2983c9`), registered in `results/sims/PREREGISTRATION.jsonl` with the note that Genome Research confirmed the nine choices, and its card `results/sims/screen-scale.md`. The new file imports `world` and `PAR` from it unchanged and copies `simulate` (not exported) with citation; the run stops if that file's hash changed. Neither that file nor GN-S2's preregistration is touched.
3. **What AU-R3 shows about SIG-06 is N data for the AU programme and does not change GN-S2's verdict.** If the local gain reverses at some M/N, Genome Research is told, because it shapes their paid SIG-06 study.

## Question

GN-S2 fixed N = M/4. The lab has never separated team size from task size. Holding the task fixed (M modules) and varying the team (N agents), does quality follow the load per agent (M/N), and does it show a threshold at the context limit, as AU-S1 and AU-S2 propose?

## Setting

- **World, knowledge, success:** GN-S2's, unchanged (ring of M modules in connected components of 4 to 24, dependencies at ring distance 1 to 3 inside a component, a module correct once solved with all its dependencies correct; one attempt per agent per round; success min(1, 0.55 × skill), skill 1.0 on the agent's type and 0.35 otherwise, T = 4 types).
- **Primary task size:** M = 400 (GN-S2's premise size). **Exploratory:** M = 160.
- **Load grid:** M/N ∈ {2, 4, 5, 8, 10, 16} modules per agent, so N ∈ {200, 100, 80, 50, 40, 25} at M = 400 and {80, 40, 32, 20, 16, 10} at M = 160.
- **Two time regimes:**
  - `fixed`: R = 16 rounds at every N, as GN-S2 (a fixed time cap, as in the Colony's cap). Used for AU-S2.
  - `matched`: R = 4 × M/N rounds, so N × R = 4M attempts at every N (GN-S2's budget at M/N = 4): R = 8, 16, 20, 32, 40, 64. Used for AU-S1 (team size at matched cost).
- **Arms** (headcount N in every team arm):
  - `spread` (even split): GN-S2's spread with the slice M/N instead of 4: each agent owns a contiguous slice, reads the slice's modules that are not yet correct, each preceded by its dependencies, up to C reads; when its slice is correct it takes the next slice clockwise that is not.
  - `local` (SIG-06): GN-S2's local arm, unchanged.
  - `single` (reference, one agent with everything): one agent reads all M modules every round (no context limit) and makes N attempts per round on distinct ready modules chosen at random (the team's attempt budget); attempt slot j has the skill of agent j, so its skill mix equals the team's.
  - `board`, `manager`: GN-S2's baselines for SIG-06, unchanged; secondary (they give the GN-S2-style comparison for SIG-06).
- **Runs and seeds:** 400 runs per cell. Worlds `world(M, 'au-r3|i')` from GN-S2's generator for i = 0 to 399 (base seed 20261107, a new block that GN-S2's `M<size>|i` worlds never used), the same worlds for every arm, load and regime of a size, so every difference is paired by world. Action streams `hashSeed(20261107, 'screen-scale-n-act', M, N, R, regime, 'au-r3|i', arm)`. The run is deterministic; `node sims/screen-scale-n.mjs --check` reproduces it.

## Metrics

Per cell (M, regime, M/N, arm), mean and 95% CI over the 400 runs:

- **share**: final solved-and-correct share of the M modules (primary, as GN-S2);
- **unsolved share**: 1 − share (AU-S2's "unsolved" at module level; with M = 400 almost no run can be fully solved in GN-S2's model, so the run-level share is secondary);
- **fully solved**: share of runs with every module correct by round R;
- rounds to zero (R + 1 if never), modules read per agent per round, attempts made.

Paired differences use the same world index; CIs are normal-approximation 95% intervals of the paired mean difference.

## Fidelity check (before any verdict)

At M = 400, M/N = 4, R = 16 the cell is GN-S2's own on new worlds. The mean share of `local`, `spread`, `board` and `manager` must lie within 0.01 of GN-S2's published values (0.334, 0.310, 0.109, 0.116). If any arm misses, the copied code is not faithful: no verdict is drawn and the report says so.

## Hypotheses and decision rule (primary: M = 400)

**AU-R3a, screen of AU-S2 (load per agent), regime `fixed`.** For each of `spread` and `local`:

- rise = unsolved share at M/N = 16 minus at M/N = 2 (paired);
- monotone = between every pair of neighbouring loads in the grid, the mean unsolved share does not fall by more than 0.01.
- The arm **supports** if rise ≥ +0.05 with its 95% CI above 0 and monotone holds; it is **not supported** if rise < +0.05 or its CI reaches 0 (flat or falling, AU-S2's falsifier); otherwise (rise but not monotone) **partially supported**.
- Verdict: supported if both arms support; not supported if both are not supported; partially supported otherwise.
- Stated in advance: at a fixed R, each agent's attempts are capped at R, so a rise is partly built into the model. The informative parts are the size of the rise and where it bends, not its sign.

**AU-R3b, screen of AU-S1 (capacity threshold), regime `matched`.** The capacity of one agent in this model is its read limit, C = 8 modules per round, so the registered threshold is M/N = 8. For each of `spread` and `local`:

- above = share at M/N = 8 minus at M/N = 16 (adding agents while the load is above C); passes if ≥ +0.03 with its 95% CI above 0;
- below = share at M/N = 2 minus at M/N = 8 (adding agents while the load is within C); passes if its mean ≤ +0.02.
- Team never beats the single agent: across both regimes, every load and every team arm, no cell has a team arm above `single` by more than +0.02 with the paired 95% CI above 0.
- Verdict: **supported** if both arms pass both parts and no team beats `single`; **not supported** if any team beats `single` (AU-S1's falsifier in this model) or both arms fail the "below" part (adding agents within the capacity still raises quality at matched attempts); **partially supported** otherwise.
- Stated in advance: `single` has no context limit and a team's attempt budget, so it is an idealised ceiling. A team beating it would point to a fault in the model rather than a real team gain; the informative part is the gap between teams and `single` by load.

**AU-R3c, SIG-06 N data (no advance decision).** At every load and in both regimes: Δ = share of `local` minus `spread` (paired), and the local gain over the stronger of `board` and `manager` (GN-S2's definition of the strongest SIG-06 baseline). Each cell is labelled:

- **holds**: Δ ≥ +0.02 with its 95% CI above 0;
- **reverses**: the upper end of Δ's 95% CI below 0 (the even split is better);
- **tie**: otherwise;
- and **shrunk** where Δ is below half its value at M/N = 4 in the same regime (GN-S2's load).

The report states the first load at which the gain shrinks and every load at which it reverses. A reversal in either regime at M = 400 is sent to Genome Research. It does not change GN-S2's verdict (condition 3).

**Exploratory, no verdict:** M = 160, every other table, the gap to `single`, fully solved runs, reads and rounds.

## What a result decides (stated in advance)

- **AU-R3a supported:** the free model agrees with AU-S2's direction; AU-R1's cross-study unsolved shares by modules per ant are the real test, and a paid size arm at fixed team becomes worth considering only if AU-R1 agrees.
- **AU-R3a not supported:** load per agent does not drive unsolved work in this model; AU-S2 rests on AU-R1 alone.
- **AU-R3b supported:** a paid size arm should place its loads on both sides of the context limit, since that is where this model says team size matters.
- **AU-R3b not supported:** the threshold form of AU-S1 has no support in the free model; a paid size arm would test team size without a predicted knee.
- **AU-R3c:** N data only; it goes to Genome Research for the design of their paid SIG-06 study.

## Limits stated in advance

A free abstract model, not real agents: one attempt per agent per round, independent Bernoulli success, no messages, no truncation, no cost other than reads and attempts. The context limit is a read count, not tokens. The parameters are GN-S2's untuned guesses. The `single` arm is an idealised reference (it reads everything and attempts as many modules as the team has members), not a model of a real agent's output limit. Loads were chosen so that N is an integer at M = 400 and 160; loads between them are not tested. 400 runs per cell detect differences of about 0.01 in share; smaller effects are not interpreted.
