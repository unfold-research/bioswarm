// /lab/export contract, scorer side (see fixtures/README.md). Colony owns the exporter, research the scorer; this runs the
// scorer's own code (record.mjs, used by drive.mjs) on the versioned example export that Colony CI regenerates
// (colony tests/fixtures/lab-export.v1.json, copied byte for byte) and on one pre-versioning export (v0, LI39).
// Run: node observatory/batch2/colony/export-contract.test.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportRecord, checkExportSchema, EXPORT_SCHEMAS } from './record.mjs';
import { JEV_OFF } from './classifier.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (f) => fs.readFileSync(path.join(DIR, f));
const v1raw = read('lab-export.v1.json');
const v1 = JSON.parse(v1raw), v0 = JSON.parse(read('lab-export.v0.json'));
const volatile = JSON.parse(read('lab-export.v1.volatile.json'));

// 0. the v1 fixture is Colony's, byte for byte (colony e8b8029). Replacing it means a new Colony fixture: update this sha1.
assert.equal(crypto.createHash('sha1').update(v1raw).digest('hex'), 'f377c2ccc622f71a010b9a3301a5f633f407f003', 'v1 fixture is the Colony copy');

// 1. the version: v1 is read, a missing field is a pre-versioning export, anything else is refused with a message that says so
assert.deepEqual(EXPORT_SCHEMAS, [1]);
assert.equal(Object.keys(v1)[0], 'exportSchema', 'exportSchema is the first key');
assert.equal(checkExportSchema(v1), 1, 'v1 exportSchema');
assert.equal(checkExportSchema(v0), null, 'v0: an export from before versioning (every study up to LI39) is still read');
for (const bad of [2, 0, '1', null]) {
  assert.throws(() => checkExportSchema({ ...v1, exportSchema: bad }), /unknown \/lab\/export exportSchema .*this scorer reads 1/, `exportSchema ${JSON.stringify(bad)}`);
  assert.throws(() => exportRecord({ ...v1, exportSchema: bad }, JEV_OFF), /unknown \/lab\/export exportSchema/, `exportRecord refuses exportSchema ${JSON.stringify(bad)}`);
}

// 2. v1: the fields the scorer reads are there, with the types it expects (a rename on the Colony side fails here by name)
for (const k of ['usd', 'calls', 'tokens']) assert.equal(typeof v1.spend?.[k], 'number', `spend.${k}`);
assert.ok(Array.isArray(v1.agents) && v1.agents.length, 'agents[]');
const chats = v1.agents.flatMap((a) => a.tasks);
assert.ok(chats.length >= 1, 'agents[].tasks[]');
for (const t of chats) {
  assert.equal(typeof t.answer, 'string', `tasks[${t.id}].answer`);
  assert.ok(Array.isArray(t.modelCalls) && t.modelCalls.length, `tasks[${t.id}].modelCalls[]`);
  for (const c of t.modelCalls) for (const k of ['input', 'output', 'cacheRead', 'totalTokens', 'costUsd']) assert.equal(typeof c[k], 'number', `tasks[${t.id}].modelCalls[].${k}`);
  assert.ok(Array.isArray(t.classifier), `tasks[${t.id}].classifier[]`);
}
const mcs = chats.flatMap((t) => t.modelCalls);
assert.equal(mcs.length, v1.spend.calls, 'spend.calls counts modelCalls[]');
assert.equal(mcs.reduce((n, c) => n + c.totalTokens, 0), v1.spend.tokens, 'spend.tokens sums modelCalls[].totalTokens');
assert.equal(+mcs.reduce((n, c) => n + c.costUsd, 0).toFixed(6), v1.spend.usd, 'spend.usd sums modelCalls[].costUsd');

// 3. the run record's export-derived fields, as drive.mjs writes them (the code score, solved/holdout/failing, comes from
// the final code, not the export, and is not part of this contract)
const KEYS = ['costUsd', 'calls', 'tokens', 'classifier', 'stalled', 'ants', 'traces', 'antMessages', 'blockedEdits'];
const r1 = exportRecord(v1, JEV_OFF);
assert.deepEqual(Object.keys(r1), KEYS, 'v1 record keys, in order');
// spend, calls and tokens come from `spend` and modelCalls[] (totals.costUsd is 0 and per-chat tokens null in v1)
assert.equal(r1.costUsd, 0.028); assert.equal(r1.calls, 7);
assert.deepEqual(r1.tokens, { input: 6300, output: 840, cached: 0, total: 7560 });
assert.deepEqual(r1.classifier, { requested: { enabled: false }, run: { jevKey: true, jev: { enabled: 'default', version: 'jev-1.14.2' }, providers: { jev: 2 }, decisions: 2 }, recorded: true,
  firstPass: { decisions: 2, byProvider: { jev: 2 }, jevVersions: ['jev-1.14.2'], models: [] } });
assert.equal(r1.stalled, false);
assert.equal(r1.ants, 1); assert.equal(r1.traces, 0); assert.equal(r1.antMessages, 0); assert.equal(r1.blockedEdits, 0);
// Tool telemetry reads tasks[].tools[] (lab telemetry, same shape in v0 and v1; Colony colony-tools.cjs:161, lab-export.cjs:45),
// never tasks[].calls (the executor's view, no command text or block reason). The v1 fixture is a fake-model run that does not
// go through colony-tools, so its tools[] is empty and the record has no telemetry; Colony will extend the fixture with one of
// each kind (same exportSchema 1, new sha1). Until then: v0's tool entries placed in a v1 export give the same telemetry.
assert.ok(chats.every((t) => Array.isArray(t.tools) && !t.tools.length) && !('telemetry' in r1), 'v1 fixture: tools[] empty, no telemetry');
const withTools = JSON.parse(JSON.stringify(v1));
withTools.agents[0].tasks[0].tools = v0.agents.flatMap((a) => a.tasks.flatMap((t) => t.tools || []));
assert.deepEqual(exportRecord(withTools, JEV_OFF).telemetry, { calls: 12, errors: 4, blocked: 1, edits: 2, testRuns: 4, antSendFailed: 0, fieldTraceFailed: 0 }, 'v1 telemetry from tools[]');

// v0 (LI39): unchanged from before versioning, so every past Colony record still reproduces
const r0 = exportRecord(v0, JEV_OFF);
assert.deepEqual(Object.keys(r0), [...KEYS, 'telemetry'], 'v0 record keys, in order');
assert.equal(r0.costUsd, 0.46736942); assert.equal(r0.calls, 6);
assert.deepEqual(r0.tokens, { input: 907626, output: 79309, cached: 33695232, total: 34682167 });
assert.deepEqual(r0.classifier, { requested: { enabled: false }, run: null, recorded: false, firstPass: { decisions: 0, byProvider: {}, jevVersions: [], models: [] } });
assert.equal(r0.stalled, false);
assert.equal(r0.ants, 3); assert.equal(r0.traces, 2); assert.equal(r0.antMessages, 2); assert.equal(r0.blockedEdits, 1);
assert.deepEqual(r0.telemetry, { calls: 12, errors: 4, blocked: 1, edits: 2, testRuns: 4, antSendFailed: 0, fieldTraceFailed: 0 });

// 4. Colony's volatile list (a bare name matches at any depth; a /path with * matches only there) names fields v1 has, and
// the scorer's record does not change when every volatile value changes
function walk(o, fn, p = []) { fn(o, p); if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, fn, [...p, k]); }
const matches = (rule, p) => (rule.startsWith('/') ? (() => { const r = rule.slice(1).split('/'); return r.length === p.length && r.every((s, i) => s === '*' || s === p[i]); })() : p[p.length - 1] === rule);
assert.ok(Array.isArray(volatile) && volatile.length, 'volatile list');
for (const rule of volatile) { let n = 0; walk(v1, (_, p) => { if (p.length && matches(rule, p)) n++; }); assert.ok(n, `volatile ${rule} is not in the fixture`); }
const shuffled = JSON.parse(JSON.stringify(v1));
walk(shuffled, (o, p) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) if (volatile.some((r) => matches(r, [...p, k]))) o[k] = typeof o[k] === 'number' ? o[k] + 1 : typeof o[k] === 'string' ? o[k] + '~' : o[k]; });
assert.deepEqual(exportRecord(shuffled, JEV_OFF), r1, 'the record does not depend on volatile values');

console.log(`lab/export contract (scorer side): ok (v1 Colony e8b8029, ${chats.length} chat, ${mcs.length} model calls; v0 LI39; ${volatile.length} volatile rules)`);
