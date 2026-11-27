// I13 (H-I07): does a model follow a conditional instinct in both directions? I8 found that one card with two actions
// split by a condition was followed (14 and 16 of 16), but the branch it asked for, escalate when the record is about
// indicator 0, is the one the small model takes anyway when two instincts collide (I5, I7, I12). I13 tests both directions
// with 32 exposed cases per arm.
//   solo     quarantine-lone-unverified
//   branchA  escalate when the unverified record is about indicator 0, quarantine otherwise (the card of I8)
//   branchB  quarantine when it is about indicator 0, escalate otherwise
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';

export const ID = 'i13-branch';
export const TITLE = 'I13 a conditional instinct in both directions (H-I07)';
export const PREREG = 'tasks/I13-BRANCH-PREREG.md';
export const WAVES = 1;
export const ARMS = ['solo', 'branchA', 'branchB'];
const TRIGGER = 'Trigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator.';
const QUARANTINE = 'do not treat it as a conflict. Leave that record out of claims, list its id in `quarantined`, and decide the verdict from the verified records alone.';
const ESCALATE = 'treat it as a real conflict. Keep that record in claims, leave `quarantined` empty, and return the verdict unsure.';
const EXCEPT = 'Does not apply: when verified records disagree with each other. That is a real conflict and the verdict is unsure.';
const card = (onZero, otherwise) => `INSTINCT handle-lone-unverified, version 2\n${TRIGGER}\nAction, if that record is about indicator 0: ${onZero}\nAction, otherwise: ${otherwise}\n${EXCEPT}`;
export const CARDS = { solo: base.DONOR_CARD, branchA: card(ESCALATE, QUARANTINE), branchB: card(QUARANTINE, ESCALATE) };
export const makeCases = () => [16000, 16050, 16300, 16350].flatMap((o) => base.makeCases('triage', o));
export function wave() {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i13-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\nInstalled by your operator (1 instinct):\n\n${CARDS[arm]}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { family: 'triage', arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, onZero: c.type === 'exposed' && c.target === 0, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
export const ceiling = wave;
export const score = (k, rows, outputs) => base.score(k, rows, outputs).map((x, i) => ({ ...x, onZero: rows[i].meta.onZero }));
export const gate = base.gate;
// Per arm, on exposed cases split by whether the record is about indicator 0: quarantined (the instinct's quarantine
// action taken in full), escalated (answered as the escalate action prescribes), other.
export function summarize([scored]) {
  const cell = (arm, on) => { const r = scored.filter((x) => x.arm === arm && x.type === 'exposed' && x.onZero === on); return { n: r.length, quarantined: r.filter((x) => x.fired).length, escalated: r.filter((x) => x.ruleOnly).length }; };
  const arms = Object.fromEntries(ARMS.map((a) => [a, { onZero: cell(a, true), offZero: cell(a, false), wrongFirings: scored.filter((x) => x.arm === a && x.wrongFiring).length, invalid: scored.filter((x) => x.arm === a && !x.valid).length }]));
  const rate = (c, k) => (c.n ? c[k] / c.n : null), s = arms.solo, A = arms.branchA, B = arms.branchB, inc = rate(s.onZero, 'quarantined') < 0.6 || rate(s.offZero, 'quarantined') < 0.6;
  return { arms, tests: {
    P1: inc ? 'inconclusive' : rate(A.offZero, 'quarantined') >= rate(s.offZero, 'quarantined') - 0.15 && rate(A.onZero, 'escalated') >= 0.8 ? 'supported' : 'not supported',
    P2: inc ? 'inconclusive' : rate(B.onZero, 'quarantined') >= rate(s.onZero, 'quarantined') - 0.15 && rate(B.offZero, 'escalated') >= 0.8 ? 'supported' : 'not supported',
    P3: ARMS.every((a) => arms[a].wrongFirings <= 2) ? 'supported' : 'not supported' } };
}
