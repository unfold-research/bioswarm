# LI13 preregistration: losing members, bio coordination against a manager agent (2026-11-17)

**Status:** registered 2026-11-17 before any LI13 result, while LI12 (k = 80) was running; LI12's k = 40 raw counts had been seen. Runs in parallel with LI12R and LI14 (rule 9). Pilot: `results/li13-li14-pilot/` (1 case, 5 modules, used only to check the mechanics).

## Why

Natural collectives are built to keep working when members are lost; a manager is a single point of failure. `docs/NATURE-MECHANISMS.md` row 17 (redundancy) names loss of members as a place bio should win.

## Design

Same instances as LI12 (seeds 12400 to 12407 at 40 modules, 12800 to 12807 at 80), so each case is paired with its no-loss run. Arms `routed`, `manager`, `oracle`, `stig`, strict live check, 8 act rounds. **Loss:** in every wave each member, and the manager's plan, is down with probability 0.2, by a hash of case, member and wave that is the same for every arm; a down member sends nothing that wave and keeps its module; a lost plan is retried the next wave. Configs `li13-k40.json` (cap [US$ redacted]), `li13-k80.json` (cap [US$ redacted]). Verdicts: `observatory/batch2/rc/analyze-li13.mjs`.

## Hypotheses (16 cases pooled; the case is the unit)

- **H-LI41 (primary).** Under member loss `routed` ends with fewer failing checks than `manager` in more cases (sign test p < 0.05). Refuted if `manager` is lower in more cases.
- **H-LI42 (secondary).** Member loss costs `manager` at least 2 more solved cases than `routed` (cases solved in LI12 and not here). Refuted if it costs `manager` no more than `routed`.
- **H-LI43 (secondary).** Under member loss `stig` ends lower than `manager` in more cases (sign test p < 0.05).

Secondary tests are reported with a Holm correction where a p-value exists.


## Amendment before any LI13 data (2026-11-17)

The `stig` arm uses the corrected trace parser (see the amendment in `tasks/LI12R-REPLICATION-PREREG.md`); LI12's `stig` arm, the paired no-loss reference for H-LI43, lost about 55% of its traces to the parser bug, so H-LI42's degradation count for `stig` is not interpretable and is reported for `routed`, `manager` and `oracle` only.