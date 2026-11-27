// I11 (H-I07, H-I03): can an agent do the admission step? I7 and I8 showed that colliding instincts must be resolved into
// one instinct before installation, and in both we wrote the resolution ourselves. Here an admission agent receives the
// installed instinct and a newcomer, decides whether they collide and how to resolve it, and the instinct set it produces
// is then installed in an executor (Claude Haiku 5.5, the model that cannot arbitrate at run time) and tested.
//   wave 0  admission: 4 newcomers x 3 samples. Newcomers: rival (identical trigger, opposite action), broad (any
//           unverified record), narrow (unverified record about indicator 0), control (stale-record, no overlap).
//   wave 1  execution on the triage cases of I1 (new seeds, 16 per type): solo, plus one arm per newcomer built from the
//           first admission sample.
// The operator's admission policy is stated to the admission agent: where both instincts match a case, the installed one
// must prevail; where only the newcomer matches, the newcomer's action is kept.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';
import { RIVAL_CARD } from '../i5-rivals/protocol.mjs';
import { BROAD, NARROW } from '../i7-overlap/protocol.mjs';

export const ID = 'i11-admission';
export const TITLE = 'I11 admission of a new instinct by an agent: detect the collision, write the resolution, test it (H-I07)';
export const PREREG = 'tasks/I11-ADMISSION-PREREG.md';
export const WAVES = 2;
export const SAMPLES = 3, PER_TYPE = 16, CARD_LIMIT = 2500, ADMIT_MAX_TOKENS = 1024;
export const CONTROL = 'INSTINCT stale-record, version 1\nTrigger: a record has a field `age_days` above 30.\nAction: list that record in `quarantined` and ignore it.';
export const NEWCOMERS = { rival: RIVAL_CARD, broad: BROAD, narrow: NARROW, control: CONTROL };
export const COLLIDES = { rival: true, broad: true, narrow: true, control: false };
export const ARMS = ['solo', ...Object.keys(NEWCOMERS)];
export const RESOLUTIONS = ['install-both', 'refuse-newcomer', 'merge'];
export const ADMIT_SYSTEM = [
  'You are the admission agent for a team of triage analysts in a synthetic exercise. Analysts hold instincts: short rules with a trigger and an action that they apply without deliberating. They cannot arbitrate between two instincts that match the same case, so collisions must be resolved before installation.',
  'An analyst sees evidence records. Each record has an id, a source, a status ("verified" or "unverified"), an indicator (0, 1 or 2) and a value (0 or 1). Outputs have claims, a `quarantined` list of record ids and a verdict.',
  'You receive the instinct already installed and a newcomer proposed for installation. Decide whether there is any case that both triggers match with different actions (`collides`). Then choose a resolution:',
  '- install-both: no collision; both cards are installed unchanged.',
  '- refuse-newcomer: the newcomer adds nothing outside the collision; only the installed card stays.',
  '- merge: write ONE card in `merged_card` that replaces both. Operator policy: on every case that both triggers match, the installed instinct\'s action must be the one taken; on cases that only the newcomer\'s trigger matches, the newcomer\'s action is kept.',
  'A merged card must be a single instinct in the same format (INSTINCT name and version, Trigger, Action, optional further Action lines with their condition, optional Does not apply), self-contained, with no reference to the other cards. Leave `merged_card` empty unless the resolution is merge. `reason` is one sentence. Return only JSON matching the schema.',
].join('\n');
const ADMIT_SCHEMA = { type: 'object', properties: { collides: { type: 'boolean' }, reason: { type: 'string' }, resolution: { type: 'string', enum: RESOLUTIONS }, merged_card: { type: 'string' } }, required: ['collides', 'reason', 'resolution', 'merged_card'], additionalProperties: false };
export const admissionRows = () => Object.entries(NEWCOMERS).flatMap(([name, card]) => Array.from({ length: SAMPLES }, (_, s) => ({ custom_id: `i11-admit-${name}-s${s}`,
  params: { model: MODEL, max_tokens: ADMIT_MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: ADMIT_SCHEMA } }, system: ADMIT_SYSTEM, messages: [{ role: 'user', content: JSON.stringify({ installed: base.DONOR_CARD, newcomer: card }) }] }, meta: { kind: 'admit', newcomer: name, sample: s } })));
export const validAdmission = (o) => !!o && typeof o.collides === 'boolean' && RESOLUTIONS.includes(o.resolution) && typeof o.merged_card === 'string' && (o.resolution !== 'merge' || o.merged_card.trim().length > 0);
// What gets installed in the executor for one admission decision. An invalid decision installs both cards unchanged,
// which is what happens when admission fails.
export function installedFor(name, o) {
  const both = `Installed by your operator (2 instincts):\n\n${base.DONOR_CARD}\n\n${NEWCOMERS[name]}`;
  if (!validAdmission(o) || o.resolution === 'install-both') return both;
  if (o.resolution === 'refuse-newcomer') return `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`;
  return `Installed by your operator (1 instinct):\n\n${o.merged_card.trim().slice(0, CARD_LIMIT)}`;
}
export const makeCases = () => [...base.makeCases('triage', 14000), ...base.makeCases('triage', 14050)];
export function executionRows(installedByArm) {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i11-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\n${installedByArm[arm]}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
    meta: { kind: 'execute', family: 'triage', arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
const SOLO = `Installed by your operator (1 instinct):\n\n${base.DONOR_CARD}`;
export const installedFromOutputs = (outputs) => Object.fromEntries([['solo', SOLO], ...Object.keys(NEWCOMERS).map((n) => [n, installedFor(n, outputs.get(`i11-admit-${n}-s0`)?.output)])]);
export const wave = (k, outputs) => (k === 0 ? admissionRows() : executionRows(installedFromOutputs(outputs)));
// Reservation ceiling of wave 1: every arm installs a card of the maximum length.
export const ceiling = (k) => executionRows(Object.fromEntries(ARMS.map((a) => [a, `Installed by your operator (1 instinct):\n\n${'x'.repeat(CARD_LIMIT)}`])));
export function score(k, rows, outputs) {
  if (k === 0) return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, valid = validAdmission(o), m = q.meta;
    return { customId: q.custom_id, kind: 'admit', newcomer: m.newcomer, sample: m.sample, valid, truncated: item?.stopReason === 'max_tokens', collides: valid ? o.collides : null, detected: valid && o.collides === COLLIDES[m.newcomer], resolution: valid ? o.resolution : null, mergedCard: valid ? o.merged_card : null, reason: valid ? o.reason : null }; });
  return base.score(k, rows, outputs).map((x) => ({ ...x, kind: 'execute' }));
}
// Admission may produce few outputs; only a wave with no valid admission at all stops the study.
export const gate = (k, scored) => (k === 0 ? (scored.some((x) => x.valid) ? null : 'invalid-output-stop') : base.gate(k, scored));
export function summarize([s0, s1]) {
  const admission = Object.fromEntries(Object.keys(NEWCOMERS).map((n) => { const r = s0.filter((x) => x.newcomer === n).sort((a, b) => a.sample - b.sample); return [n, { detected: r.filter((x) => x.detected).length, of: r.length, resolutions: r.map((x) => x.resolution), installed: r[0].valid ? r[0].resolution : 'invalid: both installed' }]; }));
  const P1 = Object.values(admission).every((a) => a.detected === a.of) ? 'supported' : 'not supported';
  if (!s1) return { admission, tests: { P1, P2: 'not-evaluated', P3: 'not-evaluated', P4: 'not-evaluated' } };
  const arms = Object.fromEntries(ARMS.map((arm) => { const r = s1.filter((x) => x.arm === arm), n = (f) => r.filter(f).length; return [arm, { effect: n((x) => x.type === 'exposed' && x.fired), escalated: n((x) => x.type === 'exposed' && x.ruleOnly), wrongFirings: n((x) => x.wrongFiring), cleanOk: n((x) => x.type === 'clean' && x.instinctCorrect), genuineOk: n((x) => x.type === 'genuine' && x.instinctCorrect), invalid: n((x) => !x.valid) }]; }));
  const s = arms.solo.effect, inc = s < 12, ok = (a) => arms[a].effect >= s - 2;
  return { admission, arms, tests: { P1, P2: inc ? 'inconclusive' : ['rival', 'broad', 'narrow'].every(ok) ? 'supported' : 'not supported', P3: inc ? 'inconclusive' : ok('control') ? 'supported' : 'not supported', P4: ARMS.every((a) => arms[a].wrongFirings <= 1) ? 'supported' : 'not supported', keptByNewcomer: Object.fromEntries(['rival', 'broad', 'narrow', 'control'].map((a) => [a, inc ? null : ok(a)])) } };
}
