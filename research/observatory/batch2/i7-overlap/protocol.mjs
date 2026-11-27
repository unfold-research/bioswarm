// I7 (H-I07): partial overlap between instincts, and whether rewriting the newcomer at admission removes the collision.
// I5 used a rival with an identical trigger. Here the second instinct's trigger is broader or narrower than the target's.
// Triage family of I1, new seeds, 16 cases per type. Arms, all installed by the operator, target listed first:
//   solo      the target alone
//   broad     plus escalate-any-unverified: fires on any unverified record (covers every exposed case)
//   narrow    plus escalate-unverified-on-0: fires only when the unverified record is about indicator 0
//   disjoint  plus the broad instinct rewritten at admission with a clause that excludes the target's trigger
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';

export const ID = 'i7-overlap';
export const TITLE = 'I7 partially overlapping instincts and a collision check at admission (H-I07)';
export const PREREG = 'tasks/I7-OVERLAP-PREREG.md';
export const WAVES = 1;
export const ARMS = ['solo', 'broad', 'narrow', 'disjoint'];
export const PER_TYPE = 16;
const ACTION = 'Action: treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.';
export const BROAD = `INSTINCT escalate-any-unverified, version 1\nTrigger: any record has status "unverified".\n${ACTION}`;
export const NARROW = `INSTINCT escalate-unverified-on-0, version 1\nTrigger: a record with status "unverified" is about indicator 0.\n${ACTION}`;
export const DISJOINT = `${BROAD}\nDoes not apply: when exactly one record is unverified and it contradicts the verified records on the same indicator. quarantine-lone-unverified handles that case.`;
const SECOND = { broad: BROAD, narrow: NARROW, disjoint: DISJOINT };
export const makeCases = () => [...base.makeCases('triage', 10000), ...base.makeCases('triage', 10050)];
export function wave() {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i7-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\nInstalled by your operator (${arm === 'solo' ? '1 instinct' : '2 instincts'}):\n\n${base.DONOR_CARD}${arm === 'solo' ? '' : `\n\n${SECOND[arm]}`}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { family: 'triage', arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, onZero: c.type === 'exposed' && c.target === 0, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
export const ceiling = wave;
export const score = (k, rows, outputs) => base.score(k, rows, outputs).map((x, i) => ({ ...x, onZero: rows[i].meta.onZero }));
export const gate = base.gate;
// effect on exposed cases, split by whether the unverified record is about indicator 0 (where the narrow instinct overlaps).
export function summarize([scored]) {
  const arms = Object.fromEntries(ARMS.map((arm) => { const r = scored.filter((x) => x.arm === arm && x.type === 'exposed'), n = (f) => r.filter(f).length;
    return [arm, { effect: n((x) => x.fired), escalated: n((x) => x.ruleOnly), effectOnZero: n((x) => x.onZero && x.fired), casesOnZero: n((x) => x.onZero), effectOffZero: n((x) => !x.onZero && x.fired), casesOffZero: n((x) => !x.onZero), wrongFirings: scored.filter((x) => x.arm === arm && x.wrongFiring).length, invalid: scored.filter((x) => x.arm === arm && !x.valid).length }]; }));
  const s = arms.solo, inc = s.effect < 12;
  return { arms, tests: {
    P1: inc ? 'inconclusive' : s.effect - arms.broad.effect >= 4 ? 'supported' : s.effect - arms.broad.effect <= 1 ? 'refuted' : 'not supported',
    P2: inc || s.effectOnZero < 3 ? 'inconclusive' : arms.narrow.effectOffZero >= s.effectOffZero - 1 && arms.narrow.effectOnZero <= s.effectOnZero / 2 ? 'supported' : 'not supported',
    P3: inc ? 'inconclusive' : arms.disjoint.effect >= s.effect - 2 ? 'supported' : 'not supported',
    P4: ARMS.every((a) => arms[a].wrongFirings <= 1) ? 'supported' : 'not supported' } };
}
