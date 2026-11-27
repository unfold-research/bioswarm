// Phase 1b fixtures (results/phase1b/PREREG.md): the Phase 1a annual close, with three versioned exports owned by
// three roles, plus seed-specific discrepancies whose requirement sits in the notes of another role's source.
// Everything here is deterministic integer arithmetic: the same seed gives byte-identical inputs on any host.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const sampleSeeds = [1103, 1151, 1201, 1259, 1301, 1361];
export const calibrationSeeds = [2011, 2027, 2039];
// Agent ids double as Pi workspace names. They are the same in every arm and attempt, and differ from business
// words so the blind packet can mask them without touching the memo's content.
export const team = ['lia', 'rui', 'teo'];
export const roles = { lia: 'vendas', rui: 'créditos', teo: 'repasses' };
export const sources = { orders: 'lia', refunds: 'rui', payouts: 'teo' };
export const inputFiles = ['orders.csv', 'refunds.csv', 'payouts.csv', 'orders.notes.md', 'refunds.notes.md', 'payouts.notes.md'];

const columns = {
  orders: ['order', 'revision', 'month', 'shop', 'units', 'unitCents'],
  refunds: ['credit', 'order', 'revision', 'amountCents'],
  payouts: ['deposit', 'order', 'revision', 'paidCents'],
};
const csv = (rows) => rows.map((row) => row.join(',')).join('\n') + '\n';
const key = (...parts) => parts.join(':');
const lcg = (seed) => {
  let state = seed >>> 0;
  return (n) => (state = (Math.imul(1664525, state) + 1013904223) >>> 0) % n;
};
const pairs = [
  ['lia', 'rui'],
  ['lia', 'teo'],
  ['rui', 'teo'],
];

// Directed discrepancies: one owner per place; the requirement is written in the notes of another role's export.
const directedCatalog = {
  'shop-merge': { id: 'orders', place: 'orders.mjs', owner: 'lia', notes: 'payouts.notes.md' },
  'test-credits': { id: 'refunds', place: 'refunds.mjs', owner: 'rui', notes: 'orders.notes.md' },
  'internal-transfers': { id: 'payouts', place: 'payouts.mjs', owner: 'teo', notes: 'refunds.notes.md' },
};

// The design of one seed: which directed discrepancies are present and which two roles share each integration file.
export function design(seed) {
  if (!Number.isSafeInteger(seed) || seed < 1) throw Error('Invalid seed');
  let counter = 0;
  const draw = (n) => createHash('sha256').update('phase1b-design:' + seed + ':' + counter++).digest().readUInt32BE(0) % n;
  const names = Object.keys(directedCatalog);
  const skipped = draw(4); // 0..2 drops one discrepancy, 3 keeps all three: always at least two.
  const directed = names.filter((_, i) => i !== skipped);
  const balancesPair = pairs[draw(3)];
  const others = pairs.filter((p) => p !== balancesPair);
  const exceptionsPair = others[draw(2)];
  return {
    directed,
    mergedShop: 'S' + (1 + draw(9)),
    testCreditStride: 89 + draw(17),
    transferStride: 83 + draw(19),
    balancesOwners: [...balancesPair],
    exceptionsOwners: [...exceptionsPair],
  };
}

// The frozen check map: one stable ID per writable place, with class, owners and the source of the requirement.
export function checkMap(seed) {
  const d = design(seed);
  const checks = Object.entries(directedCatalog).map(([quirk, c]) => {
    const on = d.directed.includes(quirk);
    return {
      id: c.id,
      place: c.place,
      class: on ? 'directed' : 'own',
      owners: [c.owner],
      requirement: on ? { source: c.notes, holder: sources[c.notes.split('.')[0]] } : { source: 'brief', holder: null },
    };
  });
  checks.push(
    { id: 'balances', place: 'balances.mjs', class: 'dispute', owners: d.balancesOwners, requirement: { source: 'brief', holder: null } },
    { id: 'exceptions', place: 'exceptions.mjs', class: 'dispute', owners: d.exceptionsOwners, requirement: { source: 'brief', holder: null } },
    { id: 'memo', place: 'close.md', class: 'own', owners: ['lia'], requirement: { source: 'brief', holder: null } },
  );
  for (const c of checks) if (c.class === 'directed' && c.owners.includes(c.requirement.holder)) throw Error('Directed requirement must sit with another role');
  return checks;
}
export function opportunityTotals(seed) {
  const map = checkMap(seed);
  return {
    dispute: new Set(map.filter((c) => c.class === 'dispute').map((c) => c.id)).size,
    directed: new Set(map.filter((c) => c.class === 'directed').map((c) => c.id)).size,
  };
}

function notes(seed, d) {
  const common = (name, keyName) =>
    `# Notas da exportação ${name}\n\nCada linha é uma revisão de um registro identificado por \`${keyName}\`. ` +
    'Mantenha a maior revisão de cada chave; linhas idênticas repetidas são a mesma linha. Valores em centavos inteiros.\n';
  const orders = [common('de vendas (orders.csv)', 'order'), '\n## Avisos às outras áreas\n'];
  const refunds = [common('de créditos (refunds.csv)', 'credit'), '\n## Avisos às outras áreas\n'];
  const payouts = [common('de repasses (payouts.csv)', 'deposit'), '\n## Avisos às outras áreas\n'];
  orders.push('- O relatório de vendas é gerado no fuso de São Paulo; o mês de competência já vem resolvido na coluna month.\n');
  refunds.push('- Créditos parciais do mesmo pedido têm identificadores distintos e se somam.\n');
  payouts.push('- Um pedido pode receber mais de um depósito parcial; todos se somam.\n');
  if (d.directed.includes('test-credits'))
    orders.push('- Para créditos: os créditos com identificador iniciado por X foram lançados pelo time de vendas em homologação e não existem. Não entram no fechamento.\n');
  if (d.directed.includes('internal-transfers'))
    refunds.push('- Para repasses: depósitos com identificador iniciado por T são devoluções que o time de créditos já lançou como crédito. Não contam como valor recebido do pedido.\n');
  if (d.directed.includes('shop-merge'))
    payouts.push(`- Para vendas: o banco liquida a loja S10 na conta da loja ${d.mergedShop}. No fechamento, as vendas de S10 pertencem a ${d.mergedShop}; não existe uma décima loja.\n`);
  return { 'orders.notes.md': orders.join(''), 'refunds.notes.md': refunds.join(''), 'payouts.notes.md': payouts.join('') };
}

// Writes the six inputs into dir and returns the reference values. The reference never enters the task folder.
export function prepareCase(seed, dir) {
  const d = design(seed);
  mkdirSync(dir, { recursive: true });
  const draw = lcg(seed);
  const rows = { orders: [], refunds: [], payouts: [] };
  const orders = {},
    refunds = {},
    payouts = {};
  const balances = new Map(),
    exceptions = new Map();
  const merge = d.directed.includes('shop-merge'),
    testCredits = d.directed.includes('test-credits'),
    transfers = d.directed.includes('internal-transfers');
  for (let i = 0; i < 7200; i++) {
    const order = 'O' + (seed * 10000 + i);
    let shop = 'S' + (1 + draw(9));
    const month = '2026-' + String(1 + draw(12)).padStart(2, '0');
    const units = 1 + draw(8),
      unitCents = 80 + draw(20000);
    const exported = merge && shop === d.mergedShop && draw(3) === 0 ? 'S10' : shop;
    rows.orders.push([order, 1, month, exported, units, unitCents - 10], [order, 2, month, exported, units, unitCents]);
    const gross = units * unitCents;
    let refund = 0;
    for (let j = 0, credits = draw(3); j < credits; j++) {
      const credit = 'C' + i + '-' + j,
        amount = 1 + draw(Math.max(1, Math.floor(gross / 4)));
      refund += amount;
      rows.refunds.push([credit, order, 1, amount + 5], [credit, order, 2, amount]);
    }
    if (testCredits && i % d.testCreditStride === 3) rows.refunds.push(['X' + i, order, 1, 1 + draw(900)]);
    const delta = i % 17 === 0 ? 1 + draw(700) : i % 23 === 0 ? -1 - draw(400) : 0;
    const missing = i % 71 === 0,
      paid = missing ? 0 : gross - refund + delta;
    let deposits = 0;
    if (!missing) {
      const first = Math.floor(paid / 2);
      rows.payouts.push(['A' + i, order, 1, first + 13], ['A' + i, order, 2, first], ['B' + i, order, 1, paid - first]);
      deposits = 2;
    }
    if (transfers && (i % d.transferStride === 5 || (missing && i % 2 === 0))) rows.payouts.push(['T' + i, order, 1, 1 + draw(1500)], ['T' + i, order, 2, 1 + draw(1500)]);
    orders[order] = { month, shop, grossCents: gross };
    if (refund) refunds[order] = refund;
    if (deposits) payouts[order] = { paidCents: paid, deposits };
    const group = key(month, shop),
      agg = balances.get(group) || [0, 0, 0, 0];
    [gross, refund, paid, paid - (gross - refund)].forEach((v, j) => (agg[j] += v));
    balances.set(group, agg);
    if (missing || delta) exceptions.set(order, [missing ? 'missing' : delta > 0 ? 'over' : 'under', paid - (gross - refund)]);
  }
  for (const [name, data] of Object.entries(rows)) {
    data.push(...data.slice(0, 120));
    for (let i = data.length - 1; i > 0; i--) {
      const j = draw(i + 1);
      [data[i], data[j]] = [data[j], data[i]];
    }
    writeFileSync(join(dir, name + '.csv'), csv([columns[name], ...data]));
  }
  for (const [file, text] of Object.entries(notes(seed, d))) writeFileSync(join(dir, file), text);
  return { seed, orders, refunds, payouts, balances, exceptions };
}

export function inputHashes(seed, dir) {
  prepareCase(seed, dir);
  return Object.fromEntries(
    inputFiles.map((f) => [f, createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')]),
  );
}

// Module contracts the agents implement. The runner executes them between waves; agents never run code.
export const places = {
  'orders.mjs': 'export default function (ordersCsv) → { [order]: { month, shop, grossCents } } para todos os pedidos',
  'refunds.mjs': 'export default function (refundsCsv) → { [order]: refundCents } para pedidos com crédito válido',
  'payouts.mjs': 'export default function (payoutsCsv) → { [order]: { paidCents, deposits } } para pedidos com ao menos um depósito válido',
  'balances.mjs': 'export default function ({ orders, refunds, payouts }) → texto completo de balances.csv',
  'exceptions.mjs': 'export default function ({ orders, refunds, payouts }) → texto completo de exceptions.csv',
  'close.md': 'memorando de fechamento escrito pela equipe',
};
export const stub = (place) =>
  place.endsWith('.md') ? null : `// Contrato: ${places[place]}\nexport default function () {\n  throw new Error('não implementado');\n}\n`;

export function brief(seed, folder) {
  const map = checkMap(seed);
  const who = map.map((c) => `- ${c.place}: ${c.owners.join(' e ')}`).join('\n');
  return `Façam o fechamento anual das nove lojas a partir de três exportações versionadas: orders.csv (vendas, responsável lia), refunds.csv (créditos, responsável rui) e payouts.csv (repasses, responsável teo). Cada exportação tem notas em <fonte>.notes.md, mantidas por seu responsável.
Em cada fonte, mantenham a maior revisão por chave própria (order, credit ou deposit) e contem registros idênticos uma única vez. Uma venda tem zero ou mais créditos e depósitos. Valores são centavos inteiros. Bruto = unidades × preço. Saldo esperado = bruto menos créditos. A diferença é recebido menos esperado.
Ninguém executa programas. Vocês escrevem módulos JavaScript (ESM, sem dependências) e o executor os roda entre as ondas para produzir balances.csv e exceptions.csv na pasta. Contratos:
${Object.entries(places).filter(([p]) => p.endsWith('.mjs')).map(([p, c]) => `- ${p}: ${c}`).join('\n')}
balances.csv (month,shop,grossCents,refundCents,paidCents,differenceCents): uma linha por mês/loja existente. exceptions.csv (order,reason,differenceCents): todos e somente os pedidos sem depósito (reason missing), com pagamento acima (over) ou abaixo (under). A ausência de depósito tem precedência. Usem cabeçalhos exatamente como especificados.
Em close.md, deem o total anual de cada medida, o número de exceções e uma ação para cada motivo, em português, com números inteiros sem separador de milhar.
Arquivos de trabalho e responsáveis:
${who}
Pasta: ${folder}. A cada onda o verificador informa os checks em falha. Uma onda termina quando os três terminam. Trabalhem apenas na pasta indicada. Não façam contato externo e não usem outros agentes.`;
}
