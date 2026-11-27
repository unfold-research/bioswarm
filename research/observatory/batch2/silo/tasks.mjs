// Silo-Bench instances for T2 (tasks/T2-TRIGGER-DESIGN.md): loading, splitting M shards over k agents, requests, scoring.
// Instances come from the unmodified generator at a pinned commit (export.py); every file is checked against the committed
// manifest before use. The benchmark gives one shard to each agent. Here M shards go to k agents, M/k each and contiguous,
// so that k = 1 is one agent with the whole input.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MODEL } from '../../lab007-economy/model.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DIR = process.env.SILO_INSTANCES || path.join(HERE, 'instances');
export const MANIFEST = JSON.parse(fs.readFileSync(path.join(HERE, 'manifest.json'), 'utf8'));
export const TASKS = MANIFEST.tasks, INSTANCES = MANIFEST.instances, CALIBRATION = 4; // instances 0 to 3 calibrate, 4 to 11 test
export const OUT_MAX = 8192, MAX_REQUEST_BYTES = 400000;
// Sentences added to the benchmark's statement where it leaves the answer open. Nothing else is added.
export const NOTES = { 'III-22': 'The median is the element at 0-based index n/2 of the data sorted in ascending order, n being the total number of elements.' };

// A set is one export: a manifest and a directory of instances. The default set has the large sizes of the first gate;
// 'small' has 1 to 16 shards, with its own leak probe and its own tasks.
const cache = new Map();
export function instanceSet(name = '') {
  const suffix = name ? `-${name}` : '', dir = name ? path.join(HERE, `instances${suffix}`) : DIR, manifest = name ? JSON.parse(fs.readFileSync(path.join(HERE, `manifest${suffix}.json`), 'utf8')) : MANIFEST;
  const cellOf = (task, M) => {
    const file = `${task}_M${M}.json`, key = `${name}/${file}`;
    if (cache.has(key)) return cache.get(key);
    const want = manifest.files[file]; if (!want) throw new Error(`${file} is not in the manifest`);
    const full = path.join(dir, file); if (!fs.existsSync(full)) throw new Error(`${full} missing: run observatory/batch2/silo/export.py (see silo/README.md)`);
    const raw = fs.readFileSync(full); if (crypto.createHash('sha256').update(raw).digest('hex') !== want) throw new Error(`${file} differs from the manifest`);
    const c = JSON.parse(raw); cache.set(key, c); return c;
  };
  return { manifest, tasks: manifest.tasks, sizes: manifest.sizes, instances: manifest.instances, cell: cellOf };
}
export const cell = instanceSet().cell;
export const split = (shards, k) => { if (shards.length % k) throw new Error(`${shards.length} shards do not divide by ${k}`); const n = shards.length / k; return Array.from({ length: k }, (_, a) => ({ first: a * n, shards: shards.slice(a * n, (a + 1) * n) })); };
export const render = ({ first, shards }) => shards.map((s, j) => `Shard ${first + j}: ${JSON.stringify(s)}`).join('\n');
export const statement = (c) => c.statement + (NOTES[c.task] ? `\n\n${NOTES[c.task]}` : '');
export const runId = (task, M, i, k) => `${task}_M${M}_i${i}_k${k}`;
export const callId = (task, M, i, k, wave, agent) => `${runId(task, M, i, k)}_w${wave}_a${agent}`;
export const parseCall = (id) => { const m = /^(I{1,3}-\d+)_M(\d+)_i(\d+)_k(\d+)_w(\d+)_a(\w+)$/.exec(id); return m && { task: m[1], M: +m[2], i: +m[3], k: +m[4], wave: +m[5], agent: m[6], run: runId(m[1], +m[2], +m[3], +m[4]) }; };

const RULES = 'No tool is available and none may be imitated: do the work yourself. Use the field "working" as scratch space for intermediate results; it is not graded.';
const str = (max) => ({ type: 'string', description: `At most ${max} characters` });
export const SCHEMA = {
  answer: { type: 'object', properties: { working: { type: 'string' }, answer: { type: 'integer' } }, required: ['working', 'answer'], additionalProperties: false },
  partial: { type: 'object', properties: { working: { type: 'string' }, partial: str(400) }, required: ['working', 'partial'], additionalProperties: false },
  note: { type: 'object', properties: { working: { type: 'string' }, note: str(1200) }, required: ['working', 'note'], additionalProperties: false },
};
export const req = (system, schema, content) => ({ model: MODEL, max_tokens: OUT_MAX, thinking: { type: 'disabled' }, output_config: { format: { type: 'json_schema', schema } }, system, messages: [{ role: 'user', content }] });
// The same request with adaptive thinking at a stated effort. Thinking tokens are output tokens and count against
// max_tokens, so the limit is raised with it.
export const THINK = { effort: 'high', maxTokens: 16000 };
export const thinking = (r) => ({ ...r, max_tokens: THINK.maxTokens, thinking: { type: 'adaptive' }, output_config: { ...r.output_config, effort: THINK.effort } });

// k = 1: one agent holds every shard and answers.
export const SOLO_SYSTEM = `You solve a data task exactly. ${RULES} Then give the answer.`;
export const soloRequest = (c, inst) => req(SOLO_SYSTEM, SCHEMA.answer, `${statement(c)}\n\nThe data of all agents is given to you below, in ${c.M} shard${c.M > 1 ? 's' : ''}.\n\n${render({ first: 0, shards: inst.shards })}`);

// An answer is right if it is the integer of the instance. A reply cut at the output limit is wrong and is not an invalid
// output: the output limit is part of what one call can do.
export function grade(item, inst) {
  const o = item?.output, truncated = item?.stopReason === 'max_tokens', valid = Number.isInteger(o?.answer);
  return { valid: valid || truncated, truncated, answer: valid ? o.answer : null, right: valid && o.answer === inst.answer };
}

// Token ledger by run: every billed token of every call of a run (agents, merge, board rounds), from the runner's
// ledger.jsonl. This is the matched-cost accounting the benchmark's own metric (output tokens only) does not give.
export function tokensByRun(ledgerRows) {
  const runs = new Map();
  for (const x of ledgerRows) { const c = parseCall(x.customId); if (!c) throw new Error(`unknown call id ${x.customId}`);
    const r = runs.get(c.run) || { run: c.run, task: c.task, M: c.M, i: c.i, k: c.k, calls: 0, input: 0, output: 0, usd: 0 };
    r.calls++; r.input += x.usage.input_tokens; r.output += x.usage.output_tokens; r.usd += x.usageCostUsd; runs.set(c.run, r); }
  return [...runs.values()];
}
