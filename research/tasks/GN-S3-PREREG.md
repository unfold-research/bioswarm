# GN-S3 preregistration: code-only swarm defence arms on CAGE Challenge 4 (2026-11-21)

Registered on 2026-11-21, before any GN-S3 episode. First screen of the genome programme (GN series, plan in the shared `unfold/genoma/GN-PLAN.md`). Written by Genome Research with the six adjustments from Cyber Research. **Cyber Research approved the DEF arms on 2026-11-21**: it accepted the gate exception for DEF-07 with the `code-cd10-qa` control, kept reward as the primary metric, and the DEF-04 and SIG-04 priors were corrected as it asked. **Research Leader approved on 2026-11-21, as written.** **Free in model spend: code arms only, no API call, no ledger entry.** **Schedule:** it does not wait for the R0 pilot. It runs on the bench (`script` kind, B2) as soon as benchhost has free CPU after the LI39 runs, without delaying the R0 build. Credit is shared between CY and GN. Cyber Research co-reads and co-signs the verdicts for DEF-04 and DEF-07; SIG-04 belongs to Genome Research.

## Question

Do three swarm-defence traits from the genome, written as code rules, defend CC4 better than the strongest known code rule, `disinfect-cd10` (CY1b, CY2)?

- **SIG-04 alarm:** a dedicated signal changes the behaviour of members that did not see the threat.
- **DEF-04 scaled collective defence:** the response grows with the size of the threat.
- **DEF-07 sentinel / shared vigilance:** some members watch while the others work, and the watch rotates.

## Priors, stated in advance

- **SIG-04: expected null, for two reasons.** (1) CY1 already retired alarms as triggers for posture in this cell (`react-msg`, `alarm-decay`, `fever`): in CC4 an alarm arrives one step later and red spawns inside the zone through phishing, so "the alarm is a report of damage, not a warning" (`results/cy1/REPORT.md`). (2) This arm acts through a shorter cooldown (5 while the alarm is on), and CY1b found the reward order cd10 > cd5 > cd2 (`results/cy1b/REPORT.md`). A restore takes 5 steps, so a short cooldown likely restores the same host again as soon as it is back, spending actions on noise from the restore itself (CY1b's reading, not tested there). A null here confirms CY1 and CY1b and is not a surprise.
- **DEF-07: weak prior.** It spends actions on Analyse, which did not reduce Impacts in the CY studies. In CC4 the cue comes from the observation vector without Analyse, so stage 0 may well drop this arm as "no channel" (Cyber Research's note).
- **DEF-04: weak negative prior.** It shortens the cooldown to 7 and 5 under threat, the direction CY1b found worse (cd10 > cd5 > cd2, `results/cy1b/REPORT.md`). It still runs, because it tests responsiveness head-on against the cost of a short cooldown, but a null or a loss should not surprise.

## Setting (as CY2, except the seeds)

- CC4 at commit `8c3c50ca54b176c2de199847944e8dcc035497e3`, image `cage4:8c3c50c`, offline container (`--network none`; no model calls, so no egress), 500-step episodes, green `EnterpriseGreenAgent`.
- **Reds:** `FiniteStateRedAgent` and `DiscoveryFSRed`. Both are fixed.
- **Seeds 77001 to 77030, a new block** that no cyber study has used. CY2's seeds 74001–74030 are not used, because `code-cd10` and `code-react` have already been seen on them. Every arm runs on every seed under each red, paired by seed within a red.
- **Action model:** five zone agents, one action per agent per step, and each agent acts only on the hosts in its own action list.
- **Cue gate (as CY2):** an agent acts only on a step where at least one host in its zone shows a suspicious process or connection; on every other step it sleeps. The only exception is the DEF-07 sentinel, declared below and matched by its own control arm.

## Arms

All parameters are fixed here, before code, and are untuned guesses. The base policy of every new arm is CY2's `code-cd10`: on a cue step, restore the first host showing a suspicious process or connection whose cooldown has expired, servers first, and leave a restored host alone for a cooldown that is 10 steps by default.

| Arm | Trait | Policy |
|---|---|---|
| `code-react` | reference | CY2's `react` (cooldown 5, process cue only) |
| `code-cd10` | reference, strongest | CY2's `disinfect-cd10` |
| `code-alarm` | SIG-04 | `code-cd10`, plus: when any **other** zone had a cue on the previous step, the alarm is on for this zone for the next 10 steps, and while it is on, the cooldown on this zone's cue steps is 5 instead of 10. The signal is delivered with a one-step delay, as CC4 messages are. It never makes an agent act on a quiet step. |
| `code-scaled` | DEF-04 | `code-cd10`, but the cooldown scales with the threat **inside the agent's own zone** on that step: n = the number of hosts showing a cue; cooldown 10 if n = 1, 7 if n = 2, 5 if n ≥ 3. Still one action per agent per step. |
| `code-sentinel` | DEF-07 | `code-cd10` on cue steps. On quiet steps, **one** agent is the sentinel, chosen in rotation: the agent with index (step mod 5). The sentinel runs `Analyse` on the host in its zone with the oldest last Analyse or Restore, servers first. The other four sleep. |
| `code-cd10-qa` | control for DEF-07 | `code-cd10` on cue steps. On quiet steps, the same rotating agent runs `Analyse` on a host chosen uniformly at random in its zone, from a seed derived from (episode seed, step). It matches the sentinel's action budget, so a sentinel win cannot come just from extra actions. |

**DEF-04 does not borrow agents from other zones.** Under one action per agent per step, an agent's own-zone action list and the cue gate, there is no idle defender that can go to help another zone without breaking the gate or gaining actions the baselines do not have (adjustment 4). So in CC4, DEF-04 is tested in its weaker form: the intensity of the response scales with the threat, not the number of defenders. This is a limit of the cell. Stage 0 checks that no agent has Restore labels for hosts outside its zone; if any agent does, the screen stops and the change comes back as an amendment, approved before any study episode.

## Stage 0 (free, before any study episode; never used as data)

On one seed outside the block (77101), red `FiniteStateRedAgent`:

1. `code-cd10` reproduces CY2's action hash on CY2 seed 74001 under both reds, so the driver did not change.
2. List each agent's Restore and Analyse targets, to confirm that agents only act on their own zone (DEF-04 above).
3. Count the quiet steps on which the sentinel acted, and whether an `Analyse` ever made a host show a cue on a later step. If Analyse never changes the view, DEF-07 cannot act through the view: it is recorded as "no channel in CC4", with no verdict, and it does not run.
4. All arms replay to the same action hash on a second run.

## Measures (as CY2, for every arm)

- reward per episode (mean, median, range);
- failed green actions, split into blue-attributed and red-attributed (CY1's rule);
- successful red Impacts, and the step of the first Impact;
- peak red hosts and root hosts;
- actions by type;
- cue steps and sentinel steps.

## Hypotheses and verdicts

Primary metric: **reward**, as in CY2. On the CY axis, reward is dominated by lost green work, and stopping red by stopping the business is a defeat (TM-002). Impacts are a guard. Each mechanism is compared with its baseline under each red, by a paired sign test on seeds, with ties dropped. There are 3 mechanisms × 2 reds, so the threshold is Bonferroni-corrected to α 0.05/6: **at least 22 of 30 seeds** (one-sided P(X ≥ 22 | 30) = 0.0081). As in CY2 amendment 5, a hypothesis passes with at least 22 wins in absolute count, even when ties leave fewer non-tied seeds, and the exact p on the non-tied seeds is reported.

- **H-GN-S3a (SIG-04):** `code-alarm` has a higher reward than `code-cd10`.
- **H-GN-S3b (DEF-04):** `code-scaled` has a higher reward than `code-cd10`.
- **H-GN-S3c (DEF-07):** `code-sentinel` has a higher reward than `code-cd10` **and** than `code-cd10-qa`. Both comparisons must pass under the same red.
- **Opposite direction, pre-stated:** for each mechanism, `code-cd10` beats it on at least 22 of 30 → "the trait hurts in this cell".

**Guards, all of which must hold for a win to count, under that red:**

1. The winner's mean red Impacts are at most 1.10 × `code-cd10`'s (CY2's guard). Otherwise the win is recorded as "reward up, red not stopped".
2. The winner's mean blue-attributed failed green actions are no higher than `code-cd10`'s. Otherwise it is recorded as "defends by hurting the business".

**Verdict labels:** supported under both reds; red-dependent under one; not supported under neither. Each verdict belongs to this cell (CC4, two fixed reds, code policies, untuned parameters) and is recorded in `catalog/genome/evidence.json` for these traits as L0 screen evidence, not L1: these are code rules, not LLM agents.

## What a result decides (stated in advance)

- **Any trait supported:** the rule goes to Cyber Research as a candidate for the R0 range, where red moves between zones over several steps and an alarm could arrive in time. GN does not open a paid CC4 study on that basis.
- **SIG-04 null:** confirms CY1. SIG-04 waits for R0, where the alarm has lead time.
- **DEF-04 null:** intensity scaling does not help in CC4. The "more defenders" form waits for a setting with free defenders (R0).
- **DEF-07 null, or a sentinel that ties with `code-cd10-qa`:** shared vigilance adds nothing over extra checks in CC4.
- **Red-dependent:** recorded as such, with no follow-up in CC4.

## Limits stated in advance

Code policies are crude stand-ins for agents, and the parameters are untuned guesses fixed before any data. The reds are fixed and do not adapt. CC4 has one agent per zone, so DEF-04 and DEF-07 can only be tested in reduced forms. CC4's red enters through phishing, which favours clearance over warning. A null can mean the parameters, not the mechanism. 30 paired seeds per red can miss small effects.
