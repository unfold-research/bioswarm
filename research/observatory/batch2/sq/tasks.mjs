// SQ (shuffled quorum) task generator. A case is a ledger of invoice notes from six fictitious suppliers. Each note is
// one record; a worker reads a chunk of records and extracts, per record, the supplier and the overdue outstanding amount
// under fixed rules. The team question is which supplier has the largest overdue total. Deterministic from a seed.
import crypto from 'node:crypto';

export const SUPPLIERS = [['HAL', 'Halvorsen Freight'], ['MIR', 'Mirabel Packaging'], ['OKO', 'Okonkwo Metals'], ['TAV', 'Tavares Logistics'], ['BRE', 'Brekke Chemicals'], ['SUN', 'Sundaram Textiles']];
export const TODAY = '2026-06-30';
export const RULES = [
  `Today is ${TODAY}. For each record give the supplier code and the overdue amount in whole US dollars.`,
  'Overdue amount = the unpaid balance of an invoice whose due date is strictly before today. Otherwise 0.',
  'Partial payments and credit notes reduce the unpaid balance. An invoice paid in full has balance 0.',
  'A disputed invoice or one on hold is never overdue (0), whatever its date.',
  'A scheduled future payment does not change anything: if the due date has passed and it is unpaid, it is overdue.',
  'Purchase order numbers, quantities, invoice numbers and reference codes are never amounts.',
  'A due date equal to today is not overdue. Net-N terms mean the invoice is due N days after its issue date.',
  'Amounts in EUR are converted to USD at the rate stated in the record and rounded to the nearest dollar, before any deduction stated in USD.',
  'A dispute that has been resolved no longer holds the invoice.',
].join('\n');
export const SYSTEM = `You extract figures from accounts-payable notes.\n${RULES}\nSupplier codes: ${SUPPLIERS.map(([c, n]) => `${c} = ${n}`).join('; ')}.`;
export const SCHEMA = { type: 'object', properties: { rows: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, s: { type: 'string', enum: SUPPLIERS.map((x) => x[0]) }, o: { type: 'integer' } }, required: ['id', 's', 'o'], additionalProperties: false } } }, required: ['rows'], additionalProperties: false };

export function rng(seed) { let s = crypto.createHash('sha256').update(String(seed)).digest().readUInt32LE(0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export function shuffle(r, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const fmtAmt = (r, a) => pick(r, [`${a.toLocaleString('en-US')}`, `USD ${a}`, `$${a.toLocaleString('en-US')}.00`, `${a} USD`, `US$ ${a.toLocaleString('en-US')}`]);
const day = (r, past) => { const d = new Date(Date.UTC(2026, 5, 30)); d.setUTCDate(d.getUTCDate() + (past ? -int(r, 1, 90) : int(r, 1, 60))); return d.toISOString().slice(0, 10); };
const fmtDay = (r, iso) => { const [y, m, d] = iso.split('-').map(Number); const mon = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]; return pick(r, [iso, `${d} ${mon} ${y}`, `${mon} ${d}, ${y}`]); };

// One record. Returns { text, s, o } with o the true overdue amount.
function record(r, sCode) {
  const name = SUPPLIERS.find((x) => x[0] === sCode)[1], short = name.split(' ')[0];
  const nm = pick(r, [name, name, short]);
  const A = int(r, 5, 95) * 100 + int(r, 0, 99), inv = `INV-${int(r, 10000, 99999)}`, po = `PO ${int(r, 1000, 99999)}`, qty = `qty ${int(r, 2, 900)}`;
  const past = r() < 0.6, due = day(r, past), D = fmtDay(r, due);
  const t = int(r, 0, 7);
  if (t === 0) return { text: `Invoice ${inv} from ${nm} for ${fmtAmt(r, A)} (${po}) was due ${D} and remains unpaid.`, o: past ? A : 0 };
  if (t === 1) return { text: `${nm} billed ${fmtAmt(r, A)} on ${inv} (${po}, ${qty}), due ${D}; paid in full on ${fmtDay(r, day(r, true))}.`, o: 0 };
  if (t === 2) { const P = int(r, 1, Math.floor(A / 100) - 1) * 100; return { text: `Partial payment on ${inv}: ${nm} invoiced ${fmtAmt(r, A)}, due ${D}; ${fmtAmt(r, P)} received so far, balance outstanding.`, o: past ? A - P : 0 }; }
  if (t === 3) { const C = int(r, 1, Math.floor(A / 200)) * 100; return { text: `Credit note CN-${int(r, 100, 999)} from ${nm} reduces ${inv} by ${fmtAmt(r, C)}. Original amount ${fmtAmt(r, A)}, due ${D}, not yet paid.`, o: past ? A - C : 0 }; }
  if (t === 4) return { text: `${nm}, ${inv}, ${fmtAmt(r, A)}, due ${D}: disputed by receiving (${qty} short), on hold until resolved.`, o: 0 };
  if (t === 5) return { text: `Reminder from ${nm}: ${inv} of ${fmtAmt(r, A)} fell due on ${D} and is still unpaid. Ref ${po}.`, o: past ? A : 0 };
  if (t === 6) return { text: `${nm} ${inv}: amount ${fmtAmt(r, A)}, due ${D}. Payment run scheduled for ${fmtDay(r, day(r, false))}.`, o: past ? A : 0 };
  return { text: `${inv} (${nm}, ${po}): ${fmtAmt(r, A)} due ${D}. Status: open, no payment recorded.`, o: past ? A : 0 };
}

const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const isPast = (iso) => iso < TODAY;
// Hard records: multi-step arithmetic, relative and boundary dates, currency, resolved disputes.
function hardRecord(r, sCode) {
  const name = SUPPLIERS.find((x) => x[0] === sCode)[1], short = name.split(' ')[0], nm = pick(r, [name, name, short]);
  const A = int(r, 20, 95) * 100 + int(r, 0, 99), inv = `INV-${int(r, 10000, 99999)}`, po = `PO ${int(r, 1000, 99999)}`;
  const t = int(r, 0, 7);
  if (t === 0) { const due = day(r, r() < 0.65), P1 = int(r, 2, 6) * 100 + int(r, 0, 99), P2 = int(r, 1, 5) * 100 + int(r, 0, 99);
    return { text: `${nm} ${inv} for ${fmtAmt(r, A)}, due ${fmtDay(r, due)}. Payments received: ${fmtAmt(r, P1)} on ${fmtDay(r, day(r, true))} and ${fmtAmt(r, P2)} on ${fmtDay(r, day(r, true))}. ${po}.`, o: isPast(due) ? A - P1 - P2 : 0 }; }
  if (t === 1) { const E = int(r, 20, 90) * 100 + int(r, 0, 99), rate = pick(r, [1.08, 1.12, 1.07, 1.15]), due = day(r, r() < 0.65);
    return { text: `${nm} invoice ${inv}: EUR ${E.toLocaleString('en-US')}, rate ${rate} USD per EUR, due ${fmtDay(r, due)}, unpaid.`, o: isPast(due) ? Math.round(E * rate) : 0 }; }
  if (t === 2) { const net = pick(r, [15, 30, 45, 60]), issue = addDays(TODAY, -int(r, 5, 100)), due = addDays(issue, net);
    return { text: `${inv} issued by ${nm} on ${fmtDay(r, issue)}, net ${net} terms, ${fmtAmt(r, A)}, no payment yet.`, o: isPast(due) ? A : 0 }; }
  if (t === 3) { const due = pick(r, [addDays(TODAY, -1), TODAY, addDays(TODAY, 1), addDays(TODAY, -2)]);
    return { text: `${nm}: ${inv} ${fmtAmt(r, A)} due ${fmtDay(r, due)}, open. (${po}, qty ${int(r, 2, 900)})`, o: isPast(due) ? A : 0 }; }
  if (t === 4) { const due = day(r, r() < 0.65), C = int(r, 2, 8) * 100, P = int(r, 2, 8) * 100 + int(r, 0, 99);
    return { text: `${inv} from ${nm}, original ${fmtAmt(r, A)}, due ${fmtDay(r, due)}. Credit note CN-${int(r, 100, 999)} for ${fmtAmt(r, C)} applied; ${fmtAmt(r, P)} paid.`, o: isPast(due) ? A - C - P : 0 }; }
  if (t === 5) { const due = day(r, r() < 0.65), resolved = r() < 0.5;
    return { text: resolved ? `${nm} ${inv}, ${fmtAmt(r, A)}, due ${fmtDay(r, due)}: the quantity dispute was resolved on ${fmtDay(r, day(r, true))}; invoice is payable and unpaid.` : `${nm} ${inv}, ${fmtAmt(r, A)}, due ${fmtDay(r, due)}: quantity dispute still open, on hold.`, o: resolved && isPast(due) ? A : 0 }; }
  if (t === 6) { const due = day(r, r() < 0.65), S = int(r, 1, 9) * 100 + int(r, 0, 99);
    return { text: `${nm} ${inv} (${fmtAmt(r, A)}, due ${fmtDay(r, due)}) was settled except for a short-payment of ${fmtAmt(r, S)}, which remains open.`, o: isPast(due) ? S : 0 }; }
  const due = day(r, r() < 0.65), B = int(r, 3, 15) * 100;
  return { text: `${inv}, ${nm}: total ${fmtAmt(r, A)} including a deposit of ${fmtAmt(r, B)} paid upfront; due ${fmtDay(r, due)}; balance unpaid.`, o: isPast(due) ? A - B : 0 };
}

// A case: n records; supplier totals with the winner and runner-up close (margin within marginRange of the winner total).
export function makeCase(seed, n = 240, marginRange = [0.005, 0.05], hardShare = 0) {
  for (let attempt = 0; attempt < 20000; attempt++) {
    const r = rng(`${seed}:${attempt}`);
    const recs = Array.from({ length: n }, (_, i) => { const s = pick(r, SUPPLIERS)[0]; return { id: `R${String(i + 1).padStart(4, '0')}`, s, ...(r() < hardShare ? { hard: true, ...hardRecord(r, s) } : record(r, s)) }; });
    const totals = Object.fromEntries(SUPPLIERS.map(([c]) => [c, 0]));
    for (const x of recs) totals[x.s] += x.o;
    const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const margin = (ranked[0][1] - ranked[1][1]) / ranked[0][1];
    if (margin >= marginRange[0] && margin <= marginRange[1]) return { seed, attempt, records: recs, totals, winner: ranked[0][0], runnerUp: ranked[1][0], margin };
  }
  throw new Error(`no case for seed ${seed}`);
}

export const renderChunk = (recs) => recs.map((x) => `[${x.id}] ${x.text}`).join('\n');
export const request = (model, recs, maxTokens = 4096) => ({ model, max_tokens: maxTokens, system: SYSTEM, output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  messages: [{ role: 'user', content: `Records (${recs.length}):\n${renderChunk(recs)}\n\nReturn one row per record, in any order.` }] });
