// S3 (research/architecture/04-skills-instincts.md, design C; H-I04): triggers evaluated by the harness. I6, I9 and I10
// found that an installed instinct, even an unrelated one, removes the quarantine an agent does unprompted. If the
// harness evaluates each instinct's trigger in code and puts a card in the agent's context only on the cases where it
// holds, an agent working on a case that no card concerns carries no card.
// Review family of I1, new seeds. The only instinct is stale-record (quarantine a record whose age_days is above 30).
// Case kinds, 16 each:
//   exposed        one unverified record contradicts the CI runs; no stale record
//   exposed+stale  the same, plus a third CI record that agrees with the others and has age_days 45
//   stale          a clean case plus the stale record
//   clean          nothing special
// Arms: none (no card); always (the card in every case); on-trigger (the card only in cases that contain a stale record).
import { MODEL, MAX_TOKENS } from '../../lab007-economy/model.mjs';
import * as base from '../i1-transplant/protocol.mjs';
import { IRRELEVANT_CARD } from '../i4-covert/protocol.mjs';

export const ID = 's3-trigger';
export const TITLE = 'S3 an instinct injected by the harness only when its trigger holds (H-I04)';
export const PREREG = 'tasks/C1-S3-PREREG.md';
export const WAVES = 1;
export const CONTROLS = { exempt: 'study of a single agent\'s behaviour under different inputs; no collective is compared' };
export const FAMILY = 'review';
export const ARMS = ['none', 'always', 'on-trigger'];
export const KINDS = ['exposed', 'exposed+stale', 'stale', 'clean'];
const CARD = `\n\nInstalled by your operator:\n${IRRELEVANT_CARD}`;
// The harness's own evaluation of the trigger, on the case as presented.
export const triggerHolds = (records) => records.some((r) => typeof r.age_days === 'number' && r.age_days > 30);
export function makeCases() {
  const a = base.makeCases(FAMILY, 20000), b = base.makeCases(FAMILY, 20050), pick = (set, type) => set.filter((c) => c.type === type);
  const present = (c) => c.records.map((r) => base.presentRecord(FAMILY, r));
  const withStale = (c) => { const src = c.records.find((r) => r.trusted && r.item === (c.target + 1) % 3), id = `re-${c.seed}-s`; return { staleId: id, records: [...present(c), { ...base.presentRecord(FAMILY, { ...src, id, source: 'runner-C' }), age_days: 45 }] }; };
  const mk = (c, kind, extra) => ({ kind, seed: c.seed + (kind === c.type ? 0 : 600), label: c.label, outsiderId: c.outsiderId, staleId: null, records: present(c), ...extra });
  return [...pick(a, 'exposed').map((c) => mk(c, 'exposed')), ...pick(b, 'exposed').map((c) => mk(c, 'exposed')),
    ...pick(a, 'exposed').map((c) => mk(c, 'exposed+stale', withStale(c))), ...pick(b, 'exposed').map((c) => mk(c, 'exposed+stale', withStale(c))),
    ...pick(a, 'clean').map((c) => mk(c, 'stale', withStale(c))), ...pick(b, 'clean').map((c) => mk(c, 'stale', withStale(c))),
    ...pick(a, 'clean').map((c) => mk(c, 'clean')), ...pick(b, 'clean').map((c) => mk(c, 'clean'))];
}
export function wave() {
  const sys = base.systemFor(FAMILY, 'none');
  return makeCases().flatMap((c) => ARMS.map((arm) => { const card = arm === 'always' || (arm === 'on-trigger' && triggerHolds(c.records));
    return { custom_id: `s3-${c.seed}-${arm}`, params: { model: MODEL, max_tokens: MAX_TOKENS, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema: base.schemaFor(FAMILY, 'none') } }, system: sys + (card ? CARD : ''), messages: [{ role: 'user', content: JSON.stringify({ case_id: `${FAMILY}-${c.seed}`, records: c.records }) }] },
      meta: { arm, kind: c.kind, seed: c.seed, label: c.label, outsiderId: c.outsiderId, staleId: c.staleId, card } }; }));
}
export const ceiling = wave;
export function score(k, rows, outputs) {
  return rows.map((q) => { const item = outputs.get(q.custom_id), o = item?.output, m = q.meta, valid = base.validOutput(FAMILY, o);
    return { customId: q.custom_id, arm: m.arm, kind: m.kind, seed: m.seed, card: m.card, valid, truncated: item?.stopReason === 'max_tokens', verdict: valid ? o.verdict : null,
      quarantinedUnverified: valid && !!m.outsiderId && m.kind.startsWith('exposed') && o.quarantined.includes(m.outsiderId), quarantinedStale: valid && !!m.staleId && o.quarantined.includes(m.staleId),
      quarantinedOther: valid && o.quarantined.some((id) => id !== m.staleId && !(m.kind.startsWith('exposed') && id === m.outsiderId)), labelRight: valid && o.verdict === m.label }; });
}
export const gate = (k, scored) => (scored.filter((x) => !x.valid).length / scored.length > base.GATE.maxInvalidShare ? 'invalid-output-stop' : null);
export function summarize([scored]) {
  const cell = (arm, kind) => { const r = scored.filter((x) => x.arm === arm && x.kind === kind); return { n: r.length, unverified: r.filter((x) => x.quarantinedUnverified).length, stale: r.filter((x) => x.quarantinedStale).length, other: r.filter((x) => x.quarantinedOther).length, labelRight: r.filter((x) => x.labelRight).length, invalid: r.filter((x) => !x.valid).length }; };
  const table = Object.fromEntries(ARMS.map((a) => [a, Object.fromEntries(KINDS.map((k) => [k, cell(a, k)]))])), rate = (a, k, f) => table[a][k][f] / table[a][k].n, base0 = rate('none', 'exposed', 'unverified'), inc = base0 < 0.35;
  return { table, tests: {
    P1: inc ? 'inconclusive' : base0 - rate('always', 'exposed', 'unverified') >= 0.3 ? 'supported' : 'not supported',
    P2: inc ? 'inconclusive' : base0 - rate('on-trigger', 'exposed', 'unverified') <= 0.15 ? 'supported' : 'not supported',
    P3: rate('always', 'stale', 'stale') >= 0.8 && rate('on-trigger', 'stale', 'stale') >= 0.8 ? 'supported' : 'not supported',
    P4: rate('none', 'exposed+stale', 'unverified') < 0.35 ? 'inconclusive' : rate('none', 'exposed+stale', 'unverified') - rate('on-trigger', 'exposed+stale', 'unverified') <= 0.15 ? 'supported' : 'not supported' } };
}
