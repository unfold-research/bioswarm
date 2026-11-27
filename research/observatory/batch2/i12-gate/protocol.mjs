// I12 (H-I07, H-I03): admission with a card template and a test gate. I11 found that an admission agent detects every
// collision but that its free-form merged card can be wrong (Haiku) or correct and unreadable for a small executor (Sonnet).
// Here the merged card must follow a fixed template that keeps the installed instinct's trigger and action first and
// unchanged, every admission sample is installed and executed, and a regression gate decides whether the card is admitted.
//   wave 0  admission: 3 colliding newcomers (rival, broad, narrow) x 3 samples, same policy as I11 plus the template
//   wave 1  execution in Claude Haiku 5.5: solo and the nine admitted sets, on 48 triage cases of I1 (new seeds) and 8
//           "agree" cases where one unverified record agrees with the verified ones (matched by the newcomer only)
// Gate, computed from wave 1: a card is admitted if the installed instinct's effect on exposed cases is within 2 of solo
// and it causes at most 1 wrong firing on clean and genuine cases. A card that fails is refused: the installed instinct stays.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';
import { RIVAL_CARD } from '../i5-rivals/protocol.mjs';
import { BROAD, NARROW } from '../i7-overlap/protocol.mjs';
import { ADMIT_SYSTEM, RESOLUTIONS, validAdmission } from '../i11-admission/protocol.mjs';

export const ID = 'i12-gate';
export const TITLE = 'I12 admission with a card template and a regression gate (H-I07)';
export const PREREG = 'tasks/I12-GATE-PREREG.md';
export const WAVES = 2;
export const SAMPLES = 3, CARD_LIMIT = 2500, ADMIT_MAX_TOKENS = 1024;
export const NEWCOMERS = { rival: RIVAL_CARD, broad: BROAD, narrow: NARROW };
export const SETS = Object.keys(NEWCOMERS).flatMap((n) => [0, 1, 2].map((s) => `${n}-s${s}`));
export const ARMS = ['solo', ...SETS];
export const TEMPLATE = [
  'A merged card must use exactly this template, in this order:',
  'INSTINCT <name>, version <number>',
  'Trigger: <the installed instinct\'s trigger, copied unchanged>',
  'Action: <the installed instinct\'s action, copied unchanged>',
  'Otherwise, trigger: <only the cases the newcomer\'s trigger matches and the first trigger does not>',
  'Otherwise, action: <the newcomer\'s action>',
  'Does not apply: <the installed instinct\'s exceptions, copied unchanged>',
  'Omit the two "Otherwise" lines when the newcomer matches no case outside the first trigger. Add nothing else.',
].join('\n');
const SYSTEM = `${ADMIT_SYSTEM}\n${TEMPLATE}`;
const ADMIT_SCHEMA = { type: 'object', properties: { collides: { type: 'boolean' }, reason: { type: 'string' }, resolution: { type: 'string', enum: RESOLUTIONS }, merged_card: { type: 'string' } }, required: ['collides', 'reason', 'resolution', 'merged_card'], additionalProperties: false };
export const admissionRows = () => Object.entries(NEWCOMERS).flatMap(([name, card]) => Array.from({ length: SAMPLES }, (_, s) => ({ custom_id: `i12-admit-${name}-s${s}`,
  params: { model: MODEL, max_tokens: ADMIT_MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: ADMIT_SCHEMA } }, system: SYSTEM, messages: [{ role: 'user', content: JSON.stringify({ installed: base.DONOR_CARD, newcomer: card }) }] }, meta: { kind: 'admit', newcomer: name, sample: s } })));
export function installedFor(name, o) {
  if (!validAdmission(o) || o.resolution === 'install-both') return `Installed by your operator (2 instincts):\n\n${base.DONOR_CARD}\n\n${NEWCOMERS[name]}`;
  if (o.resolution === 'refuse-newcomer') return `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`;
  return `Installed by your operator (1 instinct):\n\n${o.merged_card.trim().slice(0, CARD_LIMIT)}`;
}
// Cases: the three types of I1, plus "agree": a clean case with one unverified record that repeats the verified value.
export function makeCases() {
  const std = [...base.makeCases('triage', 15000), ...base.makeCases('triage', 15050)];
  const agree = base.makeCases('triage', 15000).filter((c) => c.type === 'clean').map((c) => { const v = c.records.find((r) => r.item === c.target).value, x = { id: `tr-${c.seed}-x`, item: c.target, value: v, trusted: false, source: 'bulletin' };
    return { ...c, type: 'agree', seed: c.seed + 500, records: [...c.records, x], outsiderId: x.id, expectedVerdict: c.label, ruleOnlyVerdict: c.label }; });
  return [...std, ...agree];
}
export function executionRows(installedByArm) {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i12-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\n${installedByArm[arm]}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { kind: 'execute', family: 'triage', arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, onZero: c.target === 0, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
const SOLO = `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`;
export const installedFromOutputs = (outputs) => Object.fromEntries([['solo', SOLO], ...SETS.map((set) => { const [n, s] = set.split('-s'); return [set, installedFor(n, outputs.get(`i12-admit-${n}-s${s}`)?.output)]; })]);
export const wave = (k, outputs) => (k === 0 ? admissionRows() : executionRows(installedFromOutputs(outputs)));
export const ceiling = (k) => executionRows(Object.fromEntries(ARMS.map((a) => [a, `Installed by your operator (1 instinct):\n\n${'x'.repeat(CARD_LIMIT)}`])));
const followsTemplate = (card) => /^INSTINCT .+\nTrigger: exactly one record has status "unverified" and it contradicts the verified records on the same indicator\.\nAction: do not treat it as a conflict\./.test((card || '').trim());
export function score(k, rows, outputs) {
  if (k === 0) return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, valid = validAdmission(o), m = q.meta;
    return { customId: q.custom_id, kind: 'admit', newcomer: m.newcomer, sample: m.sample, valid, truncated: item?.stopReason === 'max_tokens', collides: valid ? o.collides : null, resolution: valid ? o.resolution : null, mergedCard: valid ? o.merged_card : null, followsTemplate: valid && o.resolution === 'merge' ? followsTemplate(o.merged_card) : null, reason: valid ? o.reason : null }; });
  return base.score(k, rows, outputs).map((x, i) => { const q = rows[i], o = outputs.get(q.custom_id)?.output, m = q.meta; return { ...x, kind: 'execute', onZero: m.onZero, escalatedAgree: x.valid && m.type === 'agree' && o.verdict === 'unsure' && o.quarantined.length === 0, labelAgree: x.valid && m.type === 'agree' && o.verdict === m.label && o.quarantined.length === 0 }; });
}
export const gate = (k, scored) => (k === 0 ? (scored.some((x) => x.valid) ? null : 'invalid-output-stop') : base.gate(k, scored));
// For the newcomer-only cases: broad matches every agree case; narrow matches those about indicator 0; rival matches none.
const newcomerOnly = (set) => (x) => x.type === 'agree' && (set.startsWith('broad') || (set.startsWith('narrow') && x.onZero));
export function summarize([s0, s1]) {
  const admission = Object.fromEntries(s0.map((x) => [`${x.newcomer}-s${x.sample}`, { collides: x.collides, resolution: x.valid ? x.resolution : 'invalid: both installed', followsTemplate: x.followsTemplate }]));
  if (!s1) return { admission, tests: { P1: 'not-evaluated', P2: 'not-evaluated', P3: 'not-evaluated' } };
  const arm = (a) => { const r = s1.filter((x) => x.arm === a), n = (f) => r.filter(f).length, only = r.filter(newcomerOnly(a));
    return { effect: n((x) => x.type === 'exposed' && x.fired), escalated: n((x) => x.type === 'exposed' && x.ruleOnly), wrongFirings: n((x) => x.type !== 'agree' && x.wrongFiring), newcomerOnlyCases: only.length, newcomerKept: only.filter((x) => x.escalatedAgree).length, agreeLabel: n((x) => x.labelAgree), invalid: n((x) => !x.valid) }; };
  const arms = Object.fromEntries(ARMS.map((a) => [a, arm(a)])), s = arms.solo.effect, inc = s < 12;
  const sets = Object.fromEntries(SETS.map((set) => [set, { ...admission[set], ...arms[set], admitted: !inc && arms[set].effect >= s - 2 && arms[set].wrongFirings <= 1 }]));
  const passed = SETS.filter((x) => sets[x].admitted), narrowPassed = passed.filter((x) => x.startsWith('narrow')).length, kept = passed.reduce((n, x) => n + sets[x].newcomerKept, 0), keptOf = passed.reduce((n, x) => n + sets[x].newcomerOnlyCases, 0);
  return { solo: arms.solo, sets, admittedSets: passed.length, narrowAdmitted: narrowPassed, newcomerKeptAmongAdmitted: { kept, of: keptOf },
    tests: { P1: inc ? 'inconclusive' : passed.length >= 7 ? 'supported' : 'not supported', P2: inc ? 'inconclusive' : narrowPassed >= 2 ? 'supported' : 'not supported', P3: inc || !keptOf ? 'inconclusive' : kept / keptOf >= 0.75 ? 'supported' : 'not supported' } };
}
