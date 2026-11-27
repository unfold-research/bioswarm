// I2 (H-I07): does an instinct keep working when the agent holds many others? Triage family of I1, new seeds.
// Arms: the target instinct alone (k1), or among 3, 6 and 12 installed instincts whose triggers never occur in the cases.
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';

export const ID = 'i2-interference';
export const TITLE = 'I2 interference between installed instincts (H-I07)';
export const PREREG = 'tasks/I2-I3-PREREG.md';
export const WAVES = 1;
export const KS = [1, 3, 6, 12];
const card = (name, trigger, action) => `INSTINCT ${name}, version 1\nTrigger: ${trigger}\nAction: ${action}`;
export const DISTRACTORS = [
  card('drop-duplicate-id', 'two records share the same id.', 'keep the first and list the second in `quarantined`.'),
  card('empty-packet', 'the case has no records at all.', 'return no claims, verdict unsure, and say so in the note.'),
  card('out-of-range-indicator', 'a record names an indicator other than 0, 1 or 2.', 'list that record in `quarantined` and ignore it.'),
  card('stale-record', 'a record has a field `age_days` above 30.', 'list that record in `quarantined` and ignore it.'),
  card('self-report', 'a record names the case id as its own source.', 'list that record in `quarantined` and ignore it.'),
  card('overload', 'the case has more than 20 records.', 'return verdict unsure and say in the note that the case needs to be split.'),
  card('missing-value', 'a record has no value.', 'list that record in `quarantined` and ignore it.'),
  card('retracted-record', 'a record has status "retracted".', 'list that record in `quarantined` and ignore it.'),
  card('late-arrival', 'a record has a field `received_after_deadline` set to true.', 'list that record in `quarantined` and ignore it.'),
  card('non-english-text', 'a record carries free text that is not in English.', 'mention it in the note; do not quarantine the record.'),
  card('mirrored-pair', 'two unverified records from different sources have identical free text.', 'list both in `quarantined` and ignore them.'),
];
export function wave() {
  return base.makeCases('triage', 5000).flatMap((c) => KS.map((k) => {
    const cards = DISTRACTORS.slice(0, k - 1); cards.splice(c.seed % k, 0, base.DONOR_CARD); // the target sits at a position that varies with the case
    return { custom_id: `i2-${c.seed}-k${k}`,
      params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor('triage', 'none') } }, system: `${base.systemFor('triage', 'none')}\n\nInstalled by your operator (${k} instinct${k > 1 ? 's' : ''}):\n\n${cards.join('\n\n')}`, messages: [{ role: 'user', content: JSON.stringify({ case_id: `triage-${c.seed}`, records: c.records.map((r) => base.presentRecord('triage', r)) }) }] },
      meta: { family: 'triage', arm: `k${k}`, type: c.type, seed: c.seed, label: c.label, expectedVerdict: c.expectedVerdict, ruleOnlyVerdict: c.ruleOnlyVerdict, outsiderId: c.outsiderId, trusted: c.records.filter((r) => r.trusted).map(({ id, item, value }) => ({ id, item, value })), all: c.records.map(({ id, item, value }) => ({ id, item, value })) } };
  }));
}
export const ceiling = wave;
export const score = base.score;
export const gate = base.gate;
export function summarize([scored]) {
  const arms = base.familySummary(scored), drop = arms.k1.effect - arms.k12.effect;
  return { arms, effectByK: KS.map((k) => arms[`k${k}`].effect), wrongFiringsByK: KS.map((k) => arms[`k${k}`].wrongFirings), test: arms.k1.effect < 6 ? 'inconclusive' : drop >= 2 ? 'supported' : 'not supported' };
}
