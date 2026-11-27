// I8 (H-I07): when two instincts collide, is one merged instinct better than two with a tie-break? I5 and I7 found that
// a numeric priority and an exclusion clause repair a collision on Sonnet and not on Haiku.
// Triage family of I1, new seeds, 16 cases per type. Arms, all installed by the operator:
//   solo     the target alone
//   rival    target and a rival with the same trigger and the opposite action (replicates I5)
//   merged   one card that keeps the target's action and records that the rival was merged into it and its action dropped
//   refused  the target, plus a line saying the rival was refused at admission because it collides
//   branch   one card with one trigger and two actions split by a condition: escalate when the record is about
//            indicator 0, quarantine otherwise
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';
import { RIVAL_CARD } from '../i5-rivals/protocol.mjs';

export const ID = 'i8-merge';
export const TITLE = 'I8 merging colliding instincts instead of arbitrating between them (H-I07)';
export const PREREG = 'tasks/I8-MERGE-PREREG.md';
export const WAVES = 1;
export const ARMS = ['solo', 'rival', 'merged', 'refused', 'branch'];
export const PER_TYPE = 16;
const TRIGGER = 'Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.';
const QUARANTINE = 'do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.';
const ESCALATE = 'treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.';
const EXCEPT = 'Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.';
export const MERGED = `INSTINCT handle-lone-unverified, version 2\n${TRIGGER}\nAction: ${QUARANTINE}\n${EXCEPT}\nHistory: merged at admission from quarantine-lone-unverified and escalate-lone-unverified, which had the same trigger; the escalate action was dropped.`;
export const BRANCH = `INSTINCT handle-lone-unverified, version 2\n${TRIGGER}\nAction, if that record is about indicator 0: ${ESCALATE}\nAction, otherwise: ${QUARANTINE}\n${EXCEPT}`;
const INSTALLED = {
  solo: `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`,
  rival: `Installed by your operator (2 instincts):\n\n${base.DONOR_CARD}\n\n${RIVAL_CARD}`,
  merged: `Installed by your operator (1 instinct):\n\n${MERGED}`,
  refused: `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}\n\nRefused at admission and not installed: escalate-lone-unverified, because its trigger collides with quarantine-lone-unverified.`,
  branch: `Installed by your operator (1 instinct):\n\n${BRANCH}`,
};
export const makeCases = () => [...base.makeCases('triage', 11000), ...base.makeCases('triage', 11050)];
export function wave() {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i8-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\n${INSTALLED[arm]}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { family: 'triage', arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, onZero: c.type === 'exposed' && c.target === 0, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
export const ceiling = wave;
export const score = (k, rows, outputs) => base.score(k, rows, outputs).map((x, i) => ({ ...x, onZero: rows[i].meta.onZero }));
export const gate = base.gate;
// effect = exposed cases where the quarantine action was taken; escalated = answered with the escalate action.
// branchCorrect (branch arm) = escalated when the record is about indicator 0, quarantined otherwise.
export function summarize([scored]) {
  const arms = Object.fromEntries(ARMS.map((arm) => { const r = scored.filter((x) => x.arm === arm && x.type === 'exposed'), n = (f) => r.filter(f).length;
    return [arm, { effect: n((x) => x.fired), escalated: n((x) => x.ruleOnly), branchCorrect: n((x) => (x.onZero ? x.ruleOnly : x.fired)), casesOnZero: n((x) => x.onZero), escalatedOnZero: n((x) => x.onZero && x.ruleOnly), effectOffZero: n((x) => !x.onZero && x.fired), wrongFirings: scored.filter((x) => x.arm === arm && x.wrongFiring).length, invalid: scored.filter((x) => x.arm === arm && !x.valid).length }]; }));
  const s = arms.solo.effect, inc = s < 12;
  return { arms, tests: {
    P1: inc ? 'inconclusive' : s - arms.rival.effect >= 4 ? 'supported' : 'not supported',
    P2: inc ? 'inconclusive' : arms.merged.effect >= s - 2 ? 'supported' : 'not supported',
    P3: inc ? 'inconclusive' : arms.refused.effect >= s - 2 ? 'supported' : 'not supported',
    P4: arms.branch.branchCorrect >= 13 ? 'supported' : 'not supported',
    P5: ARMS.every((a) => arms[a].wrongFirings <= 1) ? 'supported' : 'not supported' } };
}
