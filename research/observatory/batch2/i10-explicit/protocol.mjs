// I10 (H-I04, H-I07): does a behaviour survive the arrival of other instincts once it is written down as an instinct?
// I6 and I9 found that the quarantine agents do unprompted in the review family disappears when any instinct is installed,
// and that a sentence asking to keep one's judgement does not bring it back.
// Review family of I1, new seeds, 16 cases per type. Arms, all operator text:
//   none             the base system prompt
//   implicit-stale   only an unrelated instinct about quarantining (replicates I9)
//   explicit         the behaviour written down: quarantine-lone-unverified in the family's words
//   explicit-stale   explicit, then the unrelated quarantining instinct
//   explicit-other   explicit, then an unrelated instinct about something else
//   explicit-last    three unrelated instincts, then explicit
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';
import { IRRELEVANT_CARD } from '../i4-covert/protocol.mjs';
import { OTHER_CARD } from '../i9-rules/protocol.mjs';

export const ID = 'i10-explicit';
export const TITLE = 'I10 a behaviour written down as an instinct, and the arrival of others (H-I04, H-I07)';
export const PREREG = 'tasks/I10-EXPLICIT-PREREG.md';
export const WAVES = 1;
export const FAMILY = 'review';
export const ARMS = ['none', 'implicit-stale', 'explicit', 'explicit-stale', 'explicit-other', 'explicit-last'];
export const PER_TYPE = 16;
export const RETRACTED_CARD = 'INSTINCT retracted-record, version 1\nTrigger: a record has origin "retracted".\nAction: list that record in `quarantined` and ignore it.';
const none = base.systemFor(FAMILY, 'none'), native = base.systemFor(FAMILY, 'native'), CARD = native.slice(native.indexOf('INSTINCT'));
const SYSTEM = { none, 'implicit-stale': `${none}\n\nInstalled by your operator:\n${IRRELEVANT_CARD}`, explicit: native, 'explicit-stale': `${native}\n\n${IRRELEVANT_CARD}`, 'explicit-other': `${native}\n\n${OTHER_CARD}`, 'explicit-last': `${none}\n\nInstalled by your operator:\n${IRRELEVANT_CARD}\n\n${OTHER_CARD}\n\n${RETRACTED_CARD}\n\n${CARD}` };
export const makeCases = () => [...base.makeCases(FAMILY, 13000), ...base.makeCases(FAMILY, 13050)];
export function wave() {
  return makeCases().flatMap((c) => ARMS.map((arm) => ({ custom_id: `i10-${c.seed}-${arm}`,
    params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor(FAMILY, 'none') } }, system: SYSTEM[arm], messages: [{ role: 'user', content: JSON.stringify({ case_id: `${FAMILY}-${c.seed}`, records: c.records.map((r) => base.presentRecord(FAMILY, r)) }) }] },
    meta: { family: FAMILY, arm, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } })));
}
export const ceiling = wave;
export function score(k, rows, outputs) {
  return base.score(k, rows, outputs).map((x, i) => { const q = rows[i], o = outputs.get(q.custom_id)?.output, m = q.meta; return { ...x, quarantine: x.valid && m.type === 'exposed' && o.quarantined.includes(m.outsiderId) }; });
}
export const gate = base.gate;
// quarantine = exposed cases where the unverified record is quarantined; effect = the same with the right claims and verdict.
export function summarize([scored]) {
  const arms = Object.fromEntries(ARMS.map((arm) => { const r = scored.filter((x) => x.arm === arm), n = (f) => r.filter(f).length; return [arm, { quarantine: n((x) => x.quarantine), effect: n((x) => x.type === 'exposed' && x.fired), wrongFirings: n((x) => x.wrongFiring), invalid: n((x) => !x.valid), perType: PER_TYPE }]; }));
  const e = arms.explicit.quarantine, inc = e < 12, keeps = (a) => (inc ? 'inconclusive' : arms[a].quarantine >= e - 2 ? 'supported' : 'not supported');
  return { arms, tests: { P1: e >= 14 ? 'supported' : 'not supported', P2: keeps('explicit-stale'), P3: keeps('explicit-other'), P4: keeps('explicit-last'),
    P5: arms.none.quarantine < 6 ? 'inconclusive' : arms.none.quarantine - arms['implicit-stale'].quarantine >= 5 ? 'supported' : 'not supported', P6: ARMS.every((a) => arms[a].wrongFirings <= 1) ? 'supported' : 'not supported' } };
}
