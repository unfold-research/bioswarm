# Defence and attack structures from biological swarms: the map the cyber line works through (2026-11-20)

Companion to `programs/cyber.md`. Each row names the natural system, the rule stripped to what a defender (or attacker) agent can follow, the genome trait it belongs to (`catalog/genome/traits.json`, axis DEF) and the first study that can test it. Sources are cited for the natural observation only; every engineering row is a **hypothesis**, not evidence. Full-text checks of the sources are pending, as for `docs/NATURE-MECHANISMS.md`.

## Defence (blue)

| # | Mechanism | Natural example | Rule for a defender swarm | Trait |
|---|---|---|---|---|
| 1 | Contact-network plasticity | Garden ants reduce and compartmentalise contacts after pathogen exposure (Stroeymeyt et al. 2018, Science) | on a local alarm, a zone cuts its links to the zones it trades least with, before any confirmation; links return when the alarm decays | DEF-03 |
| 2 | Alarm signal with decay and threshold | Alarm pheromones in ants and bees; recruitment grows with repeated signals and fades | each zone emits a graded alarm into the 8-bit channel; a neighbour acts only above a threshold that sums recent alarms with evaporation, so one noisy alert does nothing and a real campaign accumulates | DEF-07 |
| 3 | Inhibitory signal tuned to threat | Honeybee stop signals rise with threat severity (Tan et al. 2016, PLoS Biology) | a zone that has checked an alarm and found it false sends a stop that lowers neighbours' alarm, limiting alert storms | DEF-07 |
| 4 | Recognition with an acceptance threshold | Guards accept or reject by cue similarity; the optimal threshold moves with intruder pressure (Reeve 1989, American Naturalist) | admission of sessions and services by similarity to a learned "self" profile, the threshold tightening when alarms are high and relaxing when quiet | DEF-01 |
| 5 | Negative selection and danger signals | Self/nonself discrimination (Forrest et al. 1994, IEEE S&P, on the computing analogue); danger theory (Matzinger 1994) | detectors fire on damage (a service failing, data changing) rather than on mere novelty, so unusual but harmless activity is not punished | DEF-01, DEF-02 |
| 6 | Sentinels and vigilance sharing | Sentinel behaviour in birds and mammals; a few watch while the group works | a rota: one zone agent per round spends its budget scanning, the others serve the mission; sentinels share what they see | DEF-07 |
| 7 | Sacrificial or destructive disinfection | Ants destroy infected pupae before the pathogen becomes infectious (Pull et al. 2018, eLife); exploding termite workers (Šobotník et al. 2012, Science) | restore or isolate a suspected host at the first strong cue, trading that host's availability for containment, instead of waiting for confirmation | DEF-05 |
| 8 | Scaled collective response | Japanese honeybees ball and overheat a hornet (Ono et al. 1995, Nature); bird mobbing | when several zones alarm on one attacker foothold, their agents converge their whole budget on it at once | DEF-04 |
| 9 | Colony-wide state change | Social fever in honeybee colonies (Starks et al. 2000, Naturwissenschaften) | one cheap global signal raises every zone's posture (stricter admission, more scanning) for a bounded time | DEF-04 (hormonal broadcast, coordination map row 15) |
| 10 | Structural repair and redundancy | Nest repair; many workers able to do one job | the mission keeps more than one path for each critical service, and a contained zone is rebuilt from a known-good state | DEF-06 |

## Attack (red)

| # | Mechanism | Natural example | Rule for an attacker swarm |
|---|---|---|---|
| A1 | Stigmergic reconnaissance | Ant foraging trails | scouts write what they find (hosts, credentials, open paths) into a shared map; others follow the strongest trails |
| A2 | Quorum-triggered virulence | Bacteria express virulence only above a population density (quorum sensing) | footholds stay quiet until enough of them exist, then act together, defeating defences that tune on early noise |
| A3 | Chemical mimicry | Social parasites carry the host colony's recognition cues | attackers imitate the "self" profile used for admission, aimed at mechanism 4 |
| A4 | Mass raids | Army-ant raids overwhelm prey colonies by numbers and speed | many cheap agents hit many hosts at once, aimed at sentinels and per-zone thresholds |
| A5 | Diversion | Predator confusion and decoys | a noisy decoy campaign in one zone draws the defenders' scaled response while the real move happens elsewhere, aimed at mechanism 8 |

## Where bio is expected to win, and where it is not

- A SOC manager wins while the whole network and its alerts fit in its attention. Natural defences are built for many members, limited communication and no single point of failure: the studies that can show a gain are those with **many zones, narrow channels, a manager that can be overloaded or cut off, and attackers that adapt**.
- Several mechanisms trade availability for safety (1, 7). Every study scores benign work lost, so a defence cannot win by shutting the network down.
- Each red mechanism is designed against a named blue mechanism; the matrix of the two is the programme's main result, not any single cell.
