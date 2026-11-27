// Simulated annual close. Each source has its own keys, revisions and data order.
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const seeds = [419, 733, 947];
const columns = {
  orders: ['order', 'revision', 'month', 'shop', 'units', 'unitCents'],
  refunds: ['credit', 'order', 'revision', 'amountCents'],
  payouts: ['deposit', 'order', 'revision', 'paidCents'],
};
const csv = (rows) => rows.map((row) => row.join(',')).join('\n') + '\n';
const key = (...parts) => parts.join(':');

export function prepareCase(seed, dir) {
  if (!seeds.includes(seed)) throw Error('Unknown study seed');
  mkdirSync(dir, { recursive: true });
  let state = seed;
  const draw = (n) => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) % n;
  const rows = { orders: [], refunds: [], payouts: [] };
  const balances = new Map(),
    exceptions = new Map();
  for (let i = 0; i < 7200; i++) {
    const order = 'O' + (seed * 10000 + i);
    const shop = 'S' + (1 + draw(9)),
      month = '2026-' + String(1 + draw(12)).padStart(2, '0');
    const units = 1 + draw(8),
      unitCents = 80 + draw(20000);
    rows.orders.push(
      [order, 1, month, shop, units, unitCents - 10],
      [order, 2, month, shop, units, unitCents],
    );
    const gross = units * unitCents;
    let refund = 0;
    for (let j = 0, credits = draw(3); j < credits; j++) {
      const credit = 'C' + i + '-' + j,
        amount = 1 + draw(Math.max(1, Math.floor(gross / 4)));
      refund += amount;
      rows.refunds.push([credit, order, 1, amount + 5], [credit, order, 2, amount]);
    }
    const delta = i % 17 === 0 ? 1 + draw(700) : i % 23 === 0 ? -1 - draw(400) : 0;
    const missing = i % 71 === 0,
      paid = missing ? 0 : gross - refund + delta;
    if (!missing) {
      const first = Math.floor(paid / 2);
      rows.payouts.push(
        ['A' + i, order, 1, first + 13],
        ['A' + i, order, 2, first],
        ['B' + i, order, 1, paid - first],
      );
    }
    const group = key(month, shop),
      agg = balances.get(group) || [0, 0, 0, 0];
    [gross, refund, paid, paid - (gross - refund)].forEach((v, j) => (agg[j] += v));
    balances.set(group, agg);
    if (missing || delta)
      exceptions.set(order, [missing ? 'missing' : delta > 0 ? 'over' : 'under', paid - (gross - refund)]);
  }
  for (const [name, data] of Object.entries(rows)) {
    // Duplicate identical records and shuffle, including old revisions after final revisions.
    data.push(...data.slice(0, 120));
    for (let i = data.length - 1; i > 0; i--) {
      const j = draw(i + 1);
      [data[i], data[j]] = [data[j], data[i]];
    }
    writeFileSync(join(dir, name + '.csv'), csv([columns[name], ...data]));
  }
  return { balances, exceptions };
}

export const brief = `Faça o fechamento anual das nove lojas a partir de orders.csv, refunds.csv e payouts.csv.
Use as três pessoas da equipe. Dividam as três fontes, confiram entre si as chaves de ligação e integrem os resultados.
Em cada fonte, mantenha a maior revisão por chave própria (order, credit ou deposit) e conte registros idênticos uma única vez.
Uma venda tem zero ou mais créditos e depósitos. Valores são centavos inteiros. Bruto = unidades × preço. Saldo esperado = bruto menos créditos.
Entregue balances.csv (month,shop,grossCents,refundCents,paidCents,differenceCents), uma linha por mês/loja existente.
A diferença é recebido menos esperado. Em exceptions.csv (order,reason,differenceCents) liste todos e somente os pedidos sem depósito
(reason missing), com pagamento acima (over) ou abaixo (under). A ausência de depósito tem precedência. Use cabeçalhos exatamente como especificados.
Em close.md, dê o total anual de cada medida, o número de exceções e uma ação para cada motivo, em português.
Colegas e líder devem trabalhar apenas na pasta de trabalho indicada. Não faça contato externo e não use outros agentes.`;

function exactTable(dir, file, header, keys, expected) {
  try {
    if (!lstatSync(join(dir, file)).isFile()) return false;
    const [head, ...lines] = readFileSync(join(dir, file), 'utf8').trimEnd().split(/\r?\n/);
    if (head !== header || lines.length !== expected.size) return false;
    const seen = new Set();
    for (const line of lines) {
      const cols = line.split(','),
        id = key(...cols.slice(0, keys)),
        value = expected.get(id);
      if (seen.has(id) || !value || cols.slice(keys).join(',') !== value.join(',')) return false;
      seen.add(id);
    }
    return true;
  } catch {
    return false;
  }
}
export function score(dir, { balances, exceptions }) {
  const totals = [...balances.values()].reduce((sum, row) => sum.map((v, i) => v + row[i]), [0, 0, 0, 0]);
  let memo = '';
  try {
    if (lstatSync(join(dir, 'close.md')).isFile()) memo = readFileSync(join(dir, 'close.md'), 'utf8');
  } catch {}
  const numbers = [...memo.matchAll(/-?\d+/g)].map((m) => m[0]);
  return {
    balances: exactTable(
      dir,
      'balances.csv',
      'month,shop,grossCents,refundCents,paidCents,differenceCents',
      2,
      balances,
    ),
    exceptions: exactTable(dir, 'exceptions.csv', 'order,reason,differenceCents', 1, exceptions),
    memoTotals: [...totals, exceptions.size].every((v) => numbers.includes(String(v))),
  };
}
