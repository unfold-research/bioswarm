// I14 (H-I07, H-I03): admission that writes the merged instinct as a partition, with a gate on held-out cases.
// I13 showed that a small executor follows a card whose conditions are mutually exclusive and stated side by side, and
// I11 and I12 that it does not apply precedence ("first this, otherwise that") between overlapping conditions.
// Here the admission agent must write one card whose conditions partition the cases, each with its own action.
//   wave 0  admission: 3 colliding newcomers (rival, broad, narrow) x 3 samples
//   wave 1  execution in Claude Haiku 5.5: solo and the nine admitted sets on a gate set (48 triage cases of I1 and 8
//           agree cases) and on a held-out set of the same shape with other seeds
// Gate, computed on the gate set only: a card is admitted if the installed instinct's effect on the 16 exposed cases is
// within 2 of solo and it causes at most 1 wrong firing on clean and genuine cases. The held-out set then says whether
// an admitted card keeps working.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';
import { RIVAL_CARD } from '../i5-rivals/protocol.mjs';
import { BROAD, NARROW } from '../i7-overlap/protocol.mjs';
import { ADMIT_SYSTEM, RESOLUTIONS, validAdmission } from '../i11-admission/protocol.mjs';

export const ID = 'i14-partition';
export const TITLE = 'I14 admission that writes a partition, with a held-out gate (H-I07)';
export const PREREG = 'tasks/I14-PARTITION-PREREG.md';
export const WAVES = 2;
export const SAMPLES = 3, CARD_LIMIT = 2500, ADMIT_MAX_TOKENS = 1024;
export const NEWCOMERS = { rival: RIVAL_CARD, broad: BROAD, narrow: NARROW };
export const SETS = Object.keys(NEWCOMERS).flatMap((n) => [0, 1, 2].map((s) => `${n}-s${s}`));
export const ARMS = ['solo', ...SETS];
export const TEMPLATE = [
  'A merged card must use exactly this template:',
  'INSTINCT <name>, version <number>',
  'Trigger: <every case that either instinct matches>',
  'Action, if <condition A>: <action>',
  'Action, if <condition B>: <action>',
  'Does not apply: <the installed instinct\'s exceptions, copied unchanged>',
  'Rules for the conditions: each one is stated in full and can be checked on a case by itself; no case satisfies two of them; together they cover every case the trigger matches. Never write "otherwise", "else", "in all other cases" or a reference to another condition or to a first trigger. On the cases that both instincts match, the condition must lead to the installed instinct\'s action. Use one Action line per distinct action, and omit the second line if only one action remains.',
].join('\n');
const SYSTEM = `${ADMIT_SYSTEM}\n${TEMPLATE}`;
const ADMIT_SCHEMA = { type: 'object', properties: { collides: { type: 'boolean' }, reason: { type: 'string' }, resolution: { type: 'string', enum: RESOLUTIONS }, merged_card: { type: 'string' } }, required: ['collides', 'reason', 'resolution', 'merged_card'], additionalProperties: false };
export const admissionRows = () => Object.entries(NEWCOMERS).flatMap(([name, card]) => Array.from({ length: SAMPLES }, (_, s) => ({ custom_id: `i14-admit-${name}-s${s}`,
  params: { model: MODEL, max_tokens: ADMIT_MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: ADMIT_SCHEMA } }, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify({ installed: base.DONOR_CARD, newcomer: card }) }] }, meta: { kind: 'admit', newcomer: name, sample: s } })));
export function installedFor(name, o) {
  if (!validAdmission(o) || o.resolution === 'install-both') return `Installed by your operator (2 instincts):\n\n${base.DONOR_CARD}\n\n${NEWCOMERS[name]}`;
  if (o.resolution === 'refuse-newcomer') return `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`;
  return `Installed by your operator (1 instinct):\n\n${o.merged_card.trim().slice(0, CARD_LIMIT)}`;
}
// Cases: the three types of I1, plus "agree": a clean case with one unverified record that repeats the verified value.
// Two sets of the same shape: gate (offsets 17000, 17050) and held-out (17300, 17350).
function caseSet(o1, o2, set) {
  const std = [...base.makeCases('triage', o1), ...base.makeCases('triage', o2)];
  const agree = base.makeCases('triage', o1).filter((c) => c.type === 'clean').map((c) => { const v = c.records.find((r) => r.item === c.target).value, x = { id: `tr-${c.seed}-x`, item: c.target, value: v, trusted: false, source: 'bulletin' };
    return { ...c, type: 'agree', seed: c.seed + 900, records: [...c.records, x], outsiderId: x.id, expectedVerdict: c.label, ruleOnlyVerdict: c.label }; });
  return [...std, ...agree].map((c) => ({ ...c, set }));
}
export const makeCases = () => [...caseSet(17000, 17050, 'gate'), ...caseSet(17300, 17350, 'held')];
export function executionRows(installedByArm) {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i14-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\n${installedByArm[arm]}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { kind: 'execute', family: 'triage', arm, set: c.set, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, onZero: c.target === 0, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
const SOLO = `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`;
export const installedFromOutputs = (outputs) => Object.fromEntries([['solo', SOLO], ...SETS.map((set) => { const [n, s] = set.split('-s'); return [set, installedFor(n, outputs.get(`i14-admit-${n}-s${s}`)?.output)]; })]);
export const wave = (k, outputs) => (k === 0 ? admissionRows() : executionRows(installedFromOutputs(outputs)));
export const ceiling = (k) => executionRows(Object.fromEntries(ARMS.map((a) => [a, `Installed by your operator (1 instinct):\n\n${'x'.repeat(CARD_LIMIT)}`])));
const followsTemplate = (card) => { const c = (card || '').trim(); return /^INSTINCT .+\nTrigger: /.test(c) && /\nAction, if /.test(c) && !/otherwise|\belse\b|all other cases|first trigger/i.test(c); };
export function score(k, rows, outputs) {
  if (k === 0) return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, valid = validAdmission(o), m = q.meta;
    return { customId: q.custom_id, kind: 'admit', newcomer: m.newcomer, sample: m.sample, valid, truncated: item?.stopReason === 'max_tokens', collides: valid ? o.collides : null, resolution: valid ? o.resolution : null, mergedCard: valid ? o.merged_card : null, followsTemplate: valid && o.resolution === 'merge' ? followsTemplate(o.merged_card) : null, reason: valid ? o.reason : null }; });
  return base.score(k, rows, outputs).map((x, i) => { const q = rows[i], o = outputs.get(q.custom_id)?.output, m = q.meta; return { ...x, kind: 'execute', set: m.set, onZero: m.onZero, escalatedAgree: x.valid && m.type === 'agree' && o.verdict === 'unsure' && o.quarantined.length === 0, labelAgree: x.valid && m.type === 'agree' && o.verdict === m.label && o.quarantined.length === 0 }; });
}
export const gate = (k, scored) => (k === 0 ? (scored.some((x) => x.valid) ? null : 'invalid-output-stop') : base.gate(k, scored));
// For the newcomer-only cases: broad matches every agree case; narrow matches those about indicator 0; rival matches none.
const newcomerOnly = (set) => (x) => x.type === 'agree' && (set.startsWith('broad') || (set.startsWith('narrow') && x.onZero));
export function summarize([s0, s1]) {
  const admission = Object.fromEntries(s0.map((x) => [`${x.newcomer}-s${x.sample}`, { collides: x.collides, resolution: x.valid ? x.resolution : 'invalid: both installed', followsTemplate: x.followsTemplate }]));
  if (!s1) return { admission, tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated', P4: 'not-evaluated' } };
  const arm = (a, set) => { const r = s1.filter((x) => x.arm === a && x.set === set), n = (f) => r.filter(f).length, only = r.filter(newcomerOnly(a));
    return { effect: n((x) => x.type === 'exposed' && x.fired), escalated: n((x) => x.type === 'exposed' && x.ruleOnly), wrongFirings: n((x) => x.type !== 'agree' && x.wrongFiring), newcomerOnlyCases: only.length, newcomerKept: only.filter((x) => x.escalatedAgree).length, invalid: n((x) => !x.valid) }; };
  const solo = { gate: arm('solo', 'gate'), held: arm('solo', 'held') }, inc = solo.gate.effect < 8 || solo.held.effect < 8;
  const sets = Object.fromEntries(SETS.map((set) => { const g = arm(set, 'gate'), h = arm(set, 'held'), admitted = !inc && g.effect >= solo.gate.effect - 2 && g.wrongFirings <= 1;
    return [set, { ...admission[set], gate: g, held: h, admitted, holds: admitted ? h.effect >= solo.held.effect - 2 && h.wrongFirings <= 1 : null }]; }));
  const passed = SETS.filter((x) => sets[x].admitted), narrowPassed = passed.filter((x) => x.startsWith('narrow')).length, failHeld = passed.filter((x) => !sets[x].holds).length;
  const kept = passed.reduce((n, x) => n + sets[x].gate.newcomerKept + sets[x].held.newcomerKept, 0), keptOf = passed.reduce((n, x) => n + sets[x].gate.newcomerOnlyCases + sets[x].held.newcomerOnlyCases, 0);
  return { solo, sets, admittedSets: passed.length, narrowAdmitted: narrowPassed, admittedThatFailHeldOut: failHeld, newcomerKeptAmongAdmitted: { kept, of: keptOf },
    tests: { P1: inc ? 'inconclusive' : passed.length >= 7 ? 'supported' : 'not supported', P2: inc ? 'inconclusive' : narrowPassed >= 2 ? 'supported' : 'not supported', P3: inc || !passed.length ? 'inconclusive' : failHeld <= 1 ? 'supported' : 'not supported', P4: inc || !keptOf ? 'inconclusive' : kept / keptOf >= 0.75 ? 'supported' : 'not supported' } };
}
