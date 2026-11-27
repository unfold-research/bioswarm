// I5 (H-I07): what happens to an instinct when another installed instinct has the same trigger and the opposite action?
// I2 found no interference among instincts with disjoint triggers. Here the triggers collide.
// Triage family of I1, new seeds, 16 cases per type. Arms:
//   solo          the target instinct alone
//   rival         target first, then a rival with the same trigger whose action is to treat the record as a real conflict
//   rival-first   the same two, rival listed first
//   priority      both, with numeric priorities and a rule that the highest wins; the target has the higher number
//   priority-rev  the same, the rival has the higher number
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';

export const ID = 'i5-rivals';
export const TITLE = 'I5 instincts that compete for the same trigger (H-I07)';
export const PREREG = 'tasks/I5-RIVALS-PREREG.md';
export const WAVES = 1;
export const ARMS = ['solo', 'rival', 'rival-first', 'priority', 'priority-rev'];
export const PER_TYPE = 16;
export const RIVAL_CARD = [
  'INSTINCT escalate-lone-unverified, version 1',
  'Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.',
  'Action: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.',
].join('\n');
const withPriority = (card, p) => card.replace('\n', `\nPriority: ${p}\n`);
const RULE = 'When more than one installed instinct matches a case, apply only the one with the highest priority number.';
function installed(arm) {
  const T = base.DONOR_CARD, R = RIVAL_CARD;
  if (arm === 'solo') return `Installed by your operator (1 instinct):\n\n${T}`;
  if (arm === 'rival') return `Installed by your operator (2 instincts):\n\n${T}\n\n${R}`;
  if (arm === 'rival-first') return `Installed by your operator (2 instincts):\n\n${R}\n\n${T}`;
  // In the priority arms the order alternates with the arm so that position and priority are not confounded across the pair.
  if (arm === 'priority') return `Installed by your operator (2 instincts). ${RULE}\n\n${withPriority(R, 1)}\n\n${withPriority(T, 2)}`;
  return `Installed by your operator (2 instincts). ${RULE}\n\n${withPriority(R, 2)}\n\n${withPriority(T, 1)}`;
}
export const makeCases = () => [...base.makeCases('triage', 8000), ...base.makeCases('triage', 8050)];
export function wave() {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i5-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\n${installed(arm)}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { family: 'triage', arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
// effect = exposed cases (of 16) where the target instinct fired; rivalWon = exposed cases answered as the rival prescribes.
export function summarize([scored]) {
  const arms = Object.fromEntries(ARMS.map((arm) => { const r = scored.filter((x) => x.arm === arm), n = (f) => r.filter(f).length;
    return [arm, { effect: n((x) => x.type === 'exposed' && x.fired), rivalWon: n((x) => x.type === 'exposed' && x.ruleOnly), other: n((x) => x.type === 'exposed' && !x.fired && !x.ruleOnly), wrongFirings: n((x) => x.wrongFiring), invalid: n((x) => !x.valid), perType: PER_TYPE }]; }));
  const s = arms.solo.effect, P1 = s < 12 ? 'inconclusive' : s - arms.rival.effect >= 4 && s - arms['rival-first'].effect >= 4 ? 'supported' : s - arms.rival.effect <= 1 && s - arms['rival-first'].effect <= 1 ? 'refuted' : 'not supported';
  const P2 = Math.abs(arms.rival.effect - arms['rival-first'].effect) >= 4 ? 'supported' : 'not supported';
  const P3 = s < 12 ? 'inconclusive' : arms.priority.effect >= s - 2 && arms['priority-rev'].effect <= 2 ? 'supported' : 'not supported';
  const P4 = ARMS.every((a) => arms[a].wrongFirings <= 1) ? 'supported' : 'not supported';
  return { arms, tests: { P1, P2, P3, P4 } };
}
