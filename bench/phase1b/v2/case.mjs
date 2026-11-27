// Phase 1b case v2 (results/phase1b/CASO-V2.md): annual close of a multichannel retailer. Three marketplaces with
// their own exports and commission contracts, two acquirers with fee contracts and a mid-year switch, a SKU catalog
// migration, returns and chargebacks across periods, and bank deposits by batch. Deterministic integer arithmetic.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { roles, sources as v1sources, team } from '../case.mjs';

export { roles, team };
export const version = 'v2';
export const sampleSeeds = [3109, 3163, 3217, 3271, 3323, 3371];
export const calibrationSeeds = [4019, 4051, 4073];
export const sources = v1sources; // lia: vendas, rui: créditos, teo: repasses
export const inputFiles = ['mka_orders.csv', 'mkb_orders.csv', 'mkc_orders.txt', 'catalog.csv', 'migration.csv', 'contracts.md', 'vendas.notes.md', 'returns.csv', 'chargebacks.csv', 'creditos.notes.md', 'acq1_settlements.csv', 'acq2_settlements.txt', 'deposits.csv', 'acquirers.md', 'repasses.notes.md'];

const ORDERS = 12000,
  SKUS = 120;
const categories = ['ELETRO', 'MODA', 'CASA', 'ESPORTE'];
const pairs = [
  ['lia', 'rui'],
  ['lia', 'teo'],
  ['rui', 'teo'],
];
const lcg = (seed) => {
  let state = seed >>> 0;
  return (n) => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) % n;
};
const hashDraw = (seed, tag) => {
  let counter = 0;
  return (n) => createHash('sha256').update(`phase1b-v2-${tag}:${seed}:${counter++}`).digest().readUInt32BE(0) % n;
};
const round = (x) => Math.round(x); // half up for the non-negative values used here
const pct = (cents, bp) => round((cents * bp) / 10000);
const day = (doy) => new Date(Date.UTC(2026, 0, 1 + doy)); // doy may run into 2027
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (isoDate, n) => iso(new Date(Date.parse(isoDate + 'T00:00:00Z') + n * 86400000));
const reais = (c) => (c < 0 ? '-' : '') + Math.floor(Math.abs(c) / 100) + ',' + String(Math.abs(c) % 100).padStart(2, '0');
const csv = (rows, sep = ',') => rows.map((r) => r.join(sep)).join('\n') + '\n';

// Directed discrepancies: one owner per place; when active, the requirement sits only in another role's notes.
// When inactive, the phenomenon is absent or its rule sits in the owner's own source (class own).
const directedCatalog = {
  'mkb-cutoff': { id: 'orders', place: 'orders.mjs', owner: 'lia', notes: 'repasses.notes.md', holder: 'teo' },
  'return-new-sku': { id: 'returns', place: 'returns.mjs', owner: 'rui', notes: 'vendas.notes.md', holder: 'lia' },
  'acq-chargeback': { id: 'settlements', place: 'settlements.mjs', owner: 'teo', notes: 'creditos.notes.md', holder: 'rui' },
  'mkb-threshold': { id: 'commissions', place: 'commissions.mjs', owner: 'lia', notes: 'repasses.notes.md', holder: 'teo' },
  'acq2-anticipation': { id: 'fees', place: 'fees.mjs', owner: 'teo', notes: 'vendas.notes.md', holder: 'lia' },
  'bank-resend': { id: 'deposits', place: 'deposits.mjs', owner: 'teo', notes: 'creditos.notes.md', holder: 'rui' },
};
// tiers (monthly MKB volume per shop) is a real link: the MKB commission rate of every line depends on it.
const disputes = ['catalog', 'tiers', 'batches', 'balances', 'exceptions'];

export function design(seed) {
  if (!Number.isSafeInteger(seed) || seed < 1) throw Error('Invalid seed');
  const draw = hashDraw(seed, 'design');
  const names = Object.keys(directedCatalog);
  const skipped = draw(names.length + 1); // at most one inactive: five or six directed conflicts per seed
  const directed = names.filter((_, i) => i !== skipped);
  const owners = Object.fromEntries(disputes.map((id) => [id, [...pairs[draw(3)]]]));
  const cat = () => categories[draw(categories.length)];
  const shops = [];
  while (shops.length < 3) {
    const s = 'S' + (1 + draw(9));
    if (!shops.includes(s)) shops.push(s);
  }
  return {
    directed,
    owners,
    mka: { baseBp: [1100, 1200, 1300][draw(3)], special: cat(), specialBp: [800, 900][draw(2)], minCents: [150, 200, 250][draw(3)], capCents: [12000, 15000][draw(2)] },
    mkb: { thresholdCents: [3500000, 3800000, 4100000][draw(3)], // near the median shop-month MKB volume, so the tier bites both ways
      lowBp: [1400, 1350][draw(2)], highBp: [1100, 1050][draw(2)] },
    mkc: { bp: [900, 1000][draw(2)], fixedCents: [79, 99][draw(2)], special: cat(), specialBp: 1500 },
    acq1: { one: [190, 200, 210][draw(3)], mid: [270, 280, 290][draw(3)], long: [330, 340, 350][draw(3)] },
    acq2: { flatBp: [230, 240, 250][draw(3)], anticipationBp: [120, 150][draw(2)] },
    migrationDate: ['2026-06-01', '2026-07-01', '2026-08-01'][draw(3)],
    switchDate: ['2026-05-15', '2026-09-15'][draw(2)],
    switchShops: shops.sort(),
    recategorized: [draw(SKUS), draw(SKUS)].map((i) => ({ index: i, to: cat() })),
  };
}

export function checkMap(seed) {
  const d = design(seed);
  const checks = Object.entries(directedCatalog).map(([quirk, c]) => {
    const on = d.directed.includes(quirk);
    return { id: c.id, place: c.place, class: on ? 'directed' : 'own', owners: [c.owner], requirement: on ? { source: c.notes, holder: c.holder } : { source: 'brief', holder: null } };
  });
  for (const id of disputes) checks.push({ id, place: id + '.mjs', class: 'dispute', owners: d.owners[id], requirement: { source: 'brief', holder: null } });
  checks.push({ id: 'memo', place: 'close.md', class: 'own', owners: ['lia'], requirement: { source: 'brief', holder: null } });
  return checks;
}
export function opportunityTotals(seed) {
  const map = checkMap(seed);
  return { dispute: map.filter((c) => c.class === 'dispute').length, directed: map.filter((c) => c.class === 'directed').length };
}

// Category of an original SKU index at a date: the recategorization takes effect at the migration.
const categoryOf = (d, catalogBase, index, date) => {
  const r = d.recategorized.find((x) => x.index === index);
  return r && date >= d.migrationDate ? r.to : catalogBase[index];
};
const skuCode = (d, index, date) => (date >= d.migrationDate ? 'N' : 'P') + String(index).padStart(3, '0');
const installmentsOf = (draw) => {
  const r = draw(100);
  return r < 50 ? 1 : r < 85 ? 2 + draw(5) : 7 + draw(6);
};

export function prepareCase(seed, dir) {
  const d = design(seed);
  mkdirSync(dir, { recursive: true });
  const draw = lcg(seed);
  const on = (q) => d.directed.includes(q);
  const catalogBase = Array.from({ length: SKUS }, (_, i) => categories[(i * 7 + seed) % categories.length]);
  const out = { mka: [], mkb: [], mkc: [], returns: [], chargebacks: [], acq1: [], acq2: [], deposits: [] };
  const orders = {},
    returns = {},
    settlements = {},
    commissions = { lines: {}, refunds: {} },
    fees = {},
    deposits = {};
  const exceptions = new Map();
  const lineInfo = []; // for derived aggregates
  const batches = new Map(); // batch -> { acquirer, date, net, rows }
  const addBatchRow = (batch, acquirer, date, net) => {
    const b = batches.get(batch) ?? { acquirer, date, net: 0 };
    b.net += net;
    batches.set(batch, b);
  };
  const reproc = [];
  for (let k = 0; k < ORDERS; k++) {
    const marketplace = ['MKA', 'MKB', 'MKC'][k % 3];
    const order = marketplace[2] + (seed * 100000 + k);
    let doy = draw(365),
      hour = draw(24),
      minute = draw(60);
    if (marketplace === 'MKB' && draw(30) === 0) {
      // Late-evening orders on the last day of a month: the competence cutoff decides their month.
      const m = draw(12);
      doy = Math.round((Date.UTC(2026, m + 1, 0) - Date.UTC(2026, 0, 1)) / 86400000);
      hour = 21 + draw(3);
    }
    const date = iso(day(doy));
    const month = date.slice(0, 7);
    const shop = 'S' + (1 + draw(9));
    const n = 1 + draw(3);
    const used = new Set();
    const lines = [];
    for (let j = 0; j < n; j++) {
      let index = draw(SKUS);
      while (used.has(index)) index = (index + 1) % SKUS;
      used.add(index);
      const qty = 1 + draw(4),
        unit = 500 + draw(40000);
      lines.push({ index, sku: skuCode(d, index, date), category: categoryOf(d, catalogBase, index, date), qty, unit, gross: qty * unit });
    }
    const local = `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    // Exports: revision 1 with an older price, then the final revision.
    if (marketplace === 'MKA') {
      const dmy = date.slice(8, 10) + '/' + date.slice(5, 7) + '/' + date.slice(0, 4);
      for (const l of lines) out.mka.push([order, dmy, shop, l.sku, l.qty, reais(l.unit + 7), 1], [order, dmy, shop, l.sku, l.qty, reais(l.unit), 2]);
    } else if (marketplace === 'MKB') {
      const stamp = on('mkb-cutoff') ? new Date(Date.parse(local + 'Z') + 3 * 3600000).toISOString().slice(0, 19) + 'Z' : local + '-03:00';
      for (const l of lines) out.mkb.push([order, stamp, shop, l.sku, l.qty, l.unit - 3, 1], [order, stamp, shop, l.sku, l.qty, l.unit, 2]);
    } else {
      const enc = (ls, delta) => ls.map((l) => `${l.sku}:${l.qty}:${l.unit + delta}`).join('+');
      out.mkc.push([order, date + ' ' + local.slice(11, 16), shop, enc(lines, 11), 1], [order, date + ' ' + local.slice(11, 16), shop, enc(lines, 0), 2]);
    }
    // Commission tiers for MKB are monthly per shop: computed after the loop.
    for (const l of lines) {
      const line = `${marketplace}:${order}:${l.sku}`;
      orders[line] = { order, marketplace, shop, month, sku: l.sku, category: l.category, qty: l.qty, grossCents: l.gross };
      lineInfo.push({ line, marketplace, shop, month, date, gross: l.gross, category: l.category, index: l.index });
      // Card payment: acquirer by shop and date, installments, fees by contract, rare over/under charges.
      const acquirer = d.switchShops.includes(shop) && date >= d.switchDate ? 'ACQ2' : 'ACQ1';
      const installments = installmentsOf(draw);
      const base = Math.floor(l.gross / installments);
      for (let i = 1; i <= installments; i++) {
        const gross = base + (i === 1 ? l.gross - base * installments : 0);
        const id = `${acquirer === 'ACQ1' ? 'S1' : 'S2'}-${lineInfo.length}-${i}`;
        let contract, payDate, batch;
        if (acquirer === 'ACQ1') {
          contract = pct(gross, installments === 1 ? d.acq1.one : installments <= 6 ? d.acq1.mid : d.acq1.long);
          payDate = addDays(date, 30 * i);
          batch = 'L1-' + payDate.replaceAll('-', '');
        } else {
          contract = pct(gross, d.acq2.flatBp) + pct(gross, d.acq2.anticipationBp * (i - 1));
          payDate = addDays(date, 2);
          batch = 'L2-' + payDate.replaceAll('-', '');
        }
        const r = draw(1000);
        const charged = r < 5 ? contract + 1 + draw(300) : r < 7 && contract > 1 ? contract - 1 - draw(Math.min(200, contract - 1)) : contract;
        const net = gross - charged;
        settlements[id] = { line, acquirer, batch, installment: i, installments, grossCents: gross, chargedFeeCents: charged, netCents: net, anticipated: acquirer === 'ACQ2' && installments > 1 };
        fees[id] = contract;
        if (charged !== contract) exceptions.set(id, [charged > contract ? 'fee_over' : 'fee_under', charged - contract]);
        addBatchRow(batch, acquirer, payDate, net);
        if (acquirer === 'ACQ1') out.acq1.push([id, order, l.sku, i, installments, gross, charged, net, batch, 'OK']);
        else {
          out.acq2.push([id, order, l.sku, i, installments, reais(gross), reais(charged), installments > 1 ? 'S' : 'N', reais(net), payDate, 'OK']);
          // Overlap week after the switch: ACQ1 reprocesses these sales; those rows are never paid.
          if (date < addDays(d.switchDate, 7)) reproc.push(['R1-' + id.slice(3), order, l.sku, i, installments, gross, charged, net, 'L1-' + addDays(date, 30 * i).replaceAll('-', ''), 'REPROC']);
        }
      }
    }
  }
  out.acq1.push(...reproc);
  // MKB monthly tier per shop, then commissions for every line.
  const gmv = new Map();
  for (const l of lineInfo) if (l.marketplace === 'MKB') gmv.set(l.shop + l.month, (gmv.get(l.shop + l.month) ?? 0) + l.gross);
  const rateOf = (l) =>
    l.marketplace === 'MKA' ? (l.category === d.mka.special ? d.mka.specialBp : d.mka.baseBp) : l.marketplace === 'MKB' ? (gmv.get(l.shop + l.month) <= d.mkb.thresholdCents ? d.mkb.lowBp : d.mkb.highBp) : l.category === d.mkc.special ? d.mkc.specialBp : d.mkc.bp;
  for (const l of lineInfo) {
    let c = pct(l.gross, rateOf(l));
    if (l.marketplace === 'MKA') c = Math.min(d.mka.capCents, Math.max(d.mka.minCents, c));
    if (l.marketplace === 'MKC') c += d.mkc.fixedCents;
    commissions.lines[l.line] = c;
  }
  // Returns (partial, possibly in another period, final revision kept) and chargebacks (full line).
  const byLine = new Map(lineInfo.map((l) => [l.line, l]));
  let rn = 0,
    cn = 0;
  const chargebacked = new Set();
  for (const l of lineInfo) {
    const r = draw(1000);
    if (r < 70) {
      const date = addDays(l.date, 5 + draw(76));
      if (date > '2026-12-31') continue;
      const o = orders[l.line];
      const qty = 1 + draw(o.qty);
      const amount = qty * (o.grossCents / o.qty);
      const id = 'R' + String(++rn).padStart(6, '0');
      const index = l.index;
      const sku = on('return-new-sku') && date >= d.migrationDate && l.date < d.migrationDate ? 'N' + String(index).padStart(3, '0') : o.sku;
      out.returns.push([id, 1, o.order, l.marketplace, sku, qty, amount + 9, date], [id, 2, o.order, l.marketplace, sku, qty, amount, date]);
      returns[id] = { line: l.line, month: date.slice(0, 7), kind: 'return', refundCents: amount };
      const rate = rateOf(l);
      commissions.refunds[id] = l.marketplace === 'MKB' ? 0 : pct(amount, rate);
    } else if (r < 80) {
      const date = addDays(l.date, 10 + draw(51));
      if (date > '2026-12-31') continue;
      const o = orders[l.line];
      const id = 'CB' + String(++cn).padStart(5, '0');
      out.chargebacks.push([id, o.order, l.marketplace, o.sku, o.grossCents, date]);
      returns[id] = { line: l.line, month: date.slice(0, 7), kind: 'chargeback', refundCents: o.grossCents };
      chargebacked.add(l.line);
      if (on('acq-chargeback')) {
        const acq = d.switchShops.includes(o.shop) && l.date >= d.switchDate ? 'ACQ2' : 'ACQ1';
        if (acq === 'ACQ1') out.acq1.push(['C1-' + id, o.order, o.sku, 1, 1, -o.grossCents, 0, -o.grossCents, 'L1-' + date.replaceAll('-', ''), 'CB']);
        else out.acq2.push(['C2-' + id, o.order, o.sku, 1, 1, reais(-o.grossCents), reais(0), 'N', reais(-o.grossCents), date, 'CB']);
      }
    } else if (r < 83) {
      // A return that points to no sold line (wrong SKU): it must be reported, not booked.
      const date = addDays(l.date, 5 + draw(30));
      if (date > '2026-12-31') continue;
      const o = orders[l.line];
      const id = 'R' + String(++rn).padStart(6, '0');
      const amount = 100 + draw(5000);
      out.returns.push([id, 1, o.order, l.marketplace, 'X' + String(draw(900)).padStart(3, '0'), 1, amount, date]);
      returns[id] = { unmatched: true, amountCents: amount };
      exceptions.set(id, ['return_unmatched', amount]);
    }
  }
  // Deposits: one per batch, in date order; some batches unpaid, some paid twice.
  let dn = 0;
  const paidBatches = new Set();
  const ordered = [...batches].sort((x, y) => (x[1].date < y[1].date ? -1 : x[1].date > y[1].date ? 1 : x[0] < y[0] ? -1 : 1));
  for (const [pos, [batch, b]] of ordered.entries()) {
    // At least two unpaid and two resent batches per seed (fixed positions), plus rare random ones.
    const r = pos === 101 || pos === 457 ? 0 : pos === 233 || pos === 611 ? 12 : draw(1000);
    if (r < 10) {
      exceptions.set(batch, ['missing_payout', b.net]);
      continue;
    }
    const memo = b.acquirer === 'ACQ1' ? 'ACQ1 LOTE ' + batch : 'ACQ2 REPASSE';
    const id = 'D' + String(++dn).padStart(5, '0');
    out.deposits.push([id, b.date, b.net, memo]);
    deposits[id] = { batch, status: 'paid' };
    paidBatches.add(batch);
    if (r < 15) {
      const dup = 'D' + String(++dn).padStart(5, '0');
      out.deposits.push([dup, b.date, b.net, memo]);
      deposits[dup] = { batch, status: 'duplicate' };
      exceptions.set(dup, ['duplicate_deposit', b.net]);
    }
  }
  // Monthly matrix: sale month for gross, fees and paid; event month for refunds and commission refunds.
  const balances = new Map();
  const cell = (month, shop) => {
    const key = month + ':' + shop;
    if (!balances.has(key)) balances.set(key, [0, 0, 0, 0, 0, 0]);
    return balances.get(key);
  };
  for (const l of lineInfo) {
    const c = cell(l.month, l.shop);
    c[0] += l.gross;
    c[2] += commissions.lines[l.line];
  }
  for (const [id, s] of Object.entries(settlements)) {
    const l = byLine.get(s.line);
    const c = cell(l.month, l.shop);
    c[3] += fees[id];
    if (paidBatches.has(s.batch)) c[4] += s.netCents;
  }
  for (const [id, r] of Object.entries(returns)) {
    if (r.unmatched) continue;
    const c = cell(r.month, byLine.get(r.line).shop);
    c[1] += r.refundCents;
    if (r.kind === 'return') c[2] -= commissions.refunds[id];
  }
  for (const c of balances.values()) c[5] = c[4] - (c[0] - c[3]);
  // Shuffle exports with duplicates; write notes and contracts.
  const shuffle = (rows) => {
    rows.push(...rows.slice(0, Math.min(150, rows.length)));
    for (let i = rows.length - 1; i > 0; i--) {
      const j = draw(i + 1);
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows;
  };
  const files = {
    'mka_orders.csv': csv([['pedido', 'data', 'loja', 'sku', 'qtd', 'preco_unit', 'versao'], ...shuffle(out.mka)], ';'),
    'mkb_orders.csv': csv([['order_id', 'created_at', 'store', 'item_sku', 'quantity', 'unit_price_cents', 'rev'], ...shuffle(out.mkb)]),
    'mkc_orders.txt': csv([['id', 'ts', 'shop', 'lines', 'seq'], ...shuffle(out.mkc)], '|'),
    'catalog.csv': csv([['sku', 'category'], ...catalogBase.map((c, i) => ['P' + String(i).padStart(3, '0'), c])]),
    'migration.csv': csv([['old_sku', 'new_sku', 'new_category', 'effective'], ...catalogBase.map((c, i) => ['P' + String(i).padStart(3, '0'), 'N' + String(i).padStart(3, '0'), d.recategorized.find((x) => x.index === i)?.to ?? c, d.migrationDate])]),
    'returns.csv': csv([['return_id', 'rev', 'order_ref', 'marketplace', 'sku', 'qty', 'amount_cents', 'date'], ...shuffle(out.returns)]),
    'chargebacks.csv': csv([['cb_id', 'order_ref', 'marketplace', 'sku', 'amount_cents', 'date'], ...shuffle(out.chargebacks)]),
    'acq1_settlements.csv': csv([['settlement_id', 'order_ref', 'sku', 'installment', 'installments', 'gross_cents', 'fee_cents', 'net_cents', 'batch', 'status'], ...shuffle(out.acq1)]),
    'acq2_settlements.txt': csv([['liq', 'pedido', 'sku', 'parcela', 'parcelas', 'valor_bruto', 'taxa', 'antecipado', 'valor_liquido', 'data', 'status'], ...shuffle(out.acq2)], ';'),
    'deposits.csv': csv([['deposit_id', 'date', 'amount_cents', 'memo'], ...out.deposits]),
    'contracts.md': contractsText(d, on),
    'acquirers.md': acquirersText(d, on),
    ...notesText(d, on),
  };
  for (const [f, text] of Object.entries(files)) writeFileSync(join(dir, f), text);
  const catalog = {};
  catalogBase.forEach((c, i) => {
    const code = String(i).padStart(3, '0');
    catalog['P' + code] = { original: 'P' + code, category: c };
    catalog['N' + code] = { original: 'P' + code, category: d.recategorized.find((x) => x.index === i)?.to ?? c };
  });
  const batchOut = {};
  for (const [batch, b] of batches) batchOut[batch] = { acquirer: b.acquirer, date: b.date, netCents: b.net };
  const tiers = Object.fromEntries([...gmv].map(([k, v]) => [k.slice(0, 2) + ':' + k.slice(2), v]));
  return { seed, version, catalog, orders, tiers, returns, settlements, commissions, fees, batches: batchOut, deposits, balances, exceptions };
}

function contractsText(d, on) {
  return `# Contratos de comissão (marketplaces)

Valores em centavos e pontos-base (1 pb = 0,01%). Arredondamento ao centavo mais próximo, metade para cima, por linha.
A categoria é a do catálogo vigente na data da venda. Chargeback não gera estorno de comissão.

## MKA
- Comissão: ${d.mka.baseBp} pb do valor bruto da linha; categoria ${d.mka.special}: ${d.mka.specialBp} pb.
- Mínimo por linha: ${d.mka.minCents} centavos. Teto por linha: ${d.mka.capCents} centavos.
- Devolução: estorno da comissão proporcional ao valor devolvido, à taxa da linha (sem mínimo nem teto).

## MKB
- Faixa mensal por loja: se o valor bruto MKB da loja no mês for até o limite da faixa, ${d.mkb.lowBp} pb; acima, ${d.mkb.highBp} pb, para todas as linhas MKB da loja naquele mês.
${on('mkb-threshold') ? '- O limite da faixa é informado pelo MKB no extrato de repasse.' : `- Limite da faixa: ${d.mkb.thresholdCents} centavos.`}
- Devolução: sem estorno de comissão.

## MKC
- Comissão: ${d.mkc.bp} pb mais ${d.mkc.fixedCents} centavos fixos por linha; categoria ${d.mkc.special}: ${d.mkc.specialBp} pb mais o fixo.
- Devolução: estorno só da parte percentual, proporcional ao valor devolvido; o fixo não volta.
`;
}
function acquirersText(d, on) {
  return `# Contratos das adquirentes

Taxa de contrato por parcela = valor bruto da parcela × taxa, arredondado ao centavo (metade para cima).

## ACQ1
- 1x: ${d.acq1.one} pb; 2x a 6x: ${d.acq1.mid} pb; 7x a 12x: ${d.acq1.long} pb, conforme o número total de parcelas da venda.
- Liquida a parcela i 30 × i dias após a venda, em lotes diários identificados no extrato (memo "ACQ1 LOTE <lote>").

## ACQ2
- ${d.acq2.flatBp} pb por parcela.
${on('acq2-anticipation') ? '- Vendas parceladas são antecipadas (antecipado = S) nas condições do acordo comercial.' : `- Antecipação: ${d.acq2.anticipationBp} pb × (i − 1) na parcela i quando a venda é parcelada (antecipado = S).`}
- Liquida tudo 2 dias após a venda, um repasse por dia (memo "ACQ2 REPASSE"), casado por data e valor.

## Troca de adquirente
- As lojas ${d.switchShops.join(', ')} passam da ACQ1 para a ACQ2 nas vendas a partir de ${d.switchDate}.
`;
}
function notesText(d, on) {
  const vendas = [
    '# Notas de vendas (lia)\n\n',
    'Três exportações de marketplace com esquemas próprios. Cada linha de pedido é um par pedido + SKU; mantenha a maior revisão (versao, rev ou seq) e conte linhas idênticas uma vez.\n',
    `- O catálogo migra em ${d.migrationDate}: vendas a partir dessa data usam o SKU novo (Nxxx); a categoria nova vale a partir da mesma data (migration.csv).\n`,
    '- MKA usa reais com vírgula e data dd/mm/aaaa; MKC traz várias linhas num campo sku:qtd:preço separado por +.\n',
  ];
  const creditos = ['# Notas de créditos (rui)\n\n', 'Devoluções podem ser parciais e ocorrer em outro mês; mantenha a maior revisão por return_id. Chargebacks valem o valor integral da linha.\n', '- Uma devolução que não aponta para uma linha vendida deve ser reportada como exceção, não lançada.\n'];
  const repasses = ['# Notas de repasses (teo)\n\n', 'Dois arquivos de liquidação com esquemas próprios. Um lote por dia e por adquirente.\n', '- Linhas REPROC da ACQ1 são reprocessamentos da troca de adquirente e não são pagas.\n'];
  const resend = '- O banco às vezes reenvia o crédito de um lote: vale só o primeiro depósito de cada lote (menor deposit_id); os seguintes são duplicidade.\n';
  if (on('bank-resend')) creditos.push('- Para repasses (tesouraria):' + resend.slice(1));
  else repasses.push(resend);
  if (on('mkb-threshold')) repasses.push(`- Para vendas: o limite da faixa mensal do MKB, informado no extrato, é ${d.mkb.thresholdCents} centavos de valor bruto MKB por loja e mês.\n`);
  if (on('acq2-anticipation')) vendas.push(`- Para repasses: o acordo comercial com a ACQ2 cobra antecipação de ${d.acq2.anticipationBp} pb × (i − 1) na parcela i das vendas parceladas, além da taxa fixa.\n`);
  if (on('return-new-sku')) vendas.push('- Para créditos: devoluções lançadas depois da migração usam o SKU novo, mesmo quando a venda foi feita com o antigo. Leve ao SKU vendido pela migration.csv.\n');
  if (on('acq-chargeback')) creditos.push('- Para repasses: cada chargeback também aparece no arquivo da adquirente como linha CB negativa. Já está em chargebacks.csv; a linha CB não é repasse.\n');
  if (on('mkb-cutoff')) repasses.push('- Para vendas: o extrato do MKB fecha às 03:00 UTC (meia-noite de Brasília). created_at vem em UTC; o mês de competência é o do horário de Brasília (UTC−3).\n');
  return { 'vendas.notes.md': vendas.join(''), 'creditos.notes.md': creditos.join(''), 'repasses.notes.md': repasses.join('') };
}

export function inputHashes(seed, dir) {
  prepareCase(seed, dir);
  return Object.fromEntries(inputFiles.map((f) => [f, createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')]));
}

export const places = {
  'catalog.mjs': 'export default function ({ catalog, migration }) → { [sku antigo ou novo]: { original, category } }, com a categoria vigente para aquele código',
  'orders.mjs': 'export default function ({ mka, mkb, mkc, catalog }) → { [marketplace:pedido:sku]: { order, marketplace, shop, month, sku, category, qty, grossCents } }; catalog é a saída de catalog.mjs',
  'returns.mjs': 'export default function ({ returns, chargebacks, catalog, orders }) → { [return_id | cb_id]: { line, month, kind: "return" | "chargeback", refundCents } | { unmatched: true, amountCents } }',
  'settlements.mjs': 'export default function ({ acq1, acq2 }) → { [settlement_id]: { line, acquirer, batch, installment, installments, grossCents, chargedFeeCents, netCents, anticipated } } só das liquidações válidas',
  'tiers.mjs': 'export default function ({ orders }) → { [loja:mês]: valor bruto MKB em centavos } para cada loja e mês com venda MKB',
  'commissions.mjs': 'export default function ({ orders, returns, tiers }) → { lines: { [linha]: commissionCents }, refunds: { [return_id]: commissionRefundCents } }',
  'fees.mjs': 'export default function ({ orders, settlements }) → { [settlement_id]: contractFeeCents }',
  'batches.mjs': 'export default function ({ settlements }) → { [lote]: { acquirer, date, netCents } }',
  'deposits.mjs': 'export default function ({ batches, deposits }) → { [deposit_id]: { batch, status: "paid" | "duplicate" } }',
  'balances.mjs': 'export default function ({ orders, returns, settlements, commissions, fees, batches, deposits }) → texto completo de balances.csv',
  'exceptions.mjs': 'export default function ({ orders, returns, settlements, commissions, fees, batches, deposits }) → texto completo de exceptions.csv',
  'close.md': 'memorando de fechamento escrito pela equipe',
};
export const stub = (place) => (place.endsWith('.md') ? null : `// Contrato: ${places[place]}\nexport default function () {\n  throw new Error('não implementado');\n}\n`);

export function brief(seed, folder) {
  const who = checkMap(seed).map((c) => `- ${c.place}: ${c.owners.join(' e ')}`).join('\n');
  return `Façam o fechamento anual de 2026 de um varejista com nove lojas que vende em três marketplaces (MKA, MKB, MKC) e recebe cartões por duas adquirentes (ACQ1, ACQ2).
Fontes: vendas (lia): mka_orders.csv, mkb_orders.csv, mkc_orders.txt, catalog.csv, migration.csv, contracts.md, vendas.notes.md. Créditos (rui): returns.csv, chargebacks.csv, creditos.notes.md. Repasses (teo): acq1_settlements.csv, acq2_settlements.txt, deposits.csv, acquirers.md, repasses.notes.md.
Ninguém executa programas. Vocês escrevem módulos JavaScript (ESM, sem dependências) e o executor os roda entre as ondas, compondo a cadeia. Contratos:
${Object.entries(places).filter(([p]) => p.endsWith('.mjs')).map(([p, c]) => `- ${p}: ${c}`).join('\n')}
Definições. Linha = marketplace:pedido:sku vendido. Bruto, comissão de venda, taxa de contrato da adquirente e valor pago contam no mês e na loja da venda; devoluções, chargebacks e estornos de comissão, no mês do evento e na loja do pedido. Pago = soma líquida das liquidações válidas cujo lote foi depositado (o primeiro depósito do lote).
balances.csv (month,shop,grossCents,refundCents,commissionCents,acquirerFeeCents,paidCents,differenceCents), uma linha por mês/loja com movimento: commissionCents = comissões de venda menos estornos; differenceCents = paidCents − (grossCents − acquirerFeeCents).
exceptions.csv (ref,reason,amountCents): fee_over e fee_under por liquidação (cobrada − contrato), missing_payout por lote sem depósito (valor do lote), duplicate_deposit por depósito repetido (valor) e return_unmatched por devolução sem linha vendida (valor). Usem cabeçalhos exatamente como especificados.
Em close.md, deem o total anual de bruto, devoluções e chargebacks (refundCents), pago e diferença, o número total de exceções e uma ação para cada um destes três motivos: missing (lotes sem depósito, missing_payout), over (taxa cobrada acima do contrato, fee_over) e under (taxa cobrada abaixo, fee_under). Em português, com números inteiros sem separador de milhar.
Arquivos de trabalho e responsáveis:
${who}
Pasta: ${folder}. A cada onda o verificador informa os checks em falha. Uma onda termina quando os três terminam. Trabalhem apenas na pasta indicada. Não façam contato externo e não usem outros agentes.`;
}
