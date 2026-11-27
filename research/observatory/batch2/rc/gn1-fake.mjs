// A stub model for GN1 dry runs and tests: no network, no ledger, no cost. It answers each request from its prompt alone:
//   member requests  stub code declaring every function the module must provide (each returns its argument), and a
//                    trace on every bracketed check it is asked to trace
//   note requests    notes built from the module's specification lines: a notebook of plain lines, or library lines
//                    tagged with every module the specification mentions; long enough that some get cut
// Usage is reported as bytes / 3 so the runner's accounting paths run; usd is 0.
import fs from 'node:fs';
import path from 'node:path';
import { requireRecord } from './run-gn1.mjs';
import { fits } from './gn1-batch.mjs';
const fnNames = (content) => [...content.matchAll(/^- (\w+)\((?:s|rec|str)\):/gm)].map((x) => x[1]);
export function fakeAnswer(params) {
  const content = params.messages[0].content, props = params.output_config.format.schema.properties;
  if (props.notes) {
    const me = content.match(/developer of module (M\d+)/)[1], specs = content.split('\n').filter((l) => /^- \w+\(/.test(l)).map((l) => l.slice(2));
    if (content.includes('every line must start with the module')) {
      const lines = specs.flatMap((l) => [...new Set([me, ...(l.match(/M\d+/g) || [])])].map((t) => `${t}: ${me} learned that ${l.slice(0, 160)}`));
      return { notes: lines.join('\n') };
    }
    return { notes: specs.map((l) => `Remember: ${l.slice(0, 220)}`).join('\n') };
  }
  const out = {};
  if (props.code) out.code = fnNames(content).map((n) => `function ${n}(x) { return x; }`).join('\n');
  if (props.traces) out.traces = [...content.matchAll(/^- \[([^\]]+)\]/gm)].map((x) => ({ check: x[1], text: 'the helper must return what the caller specification says' }));
  return out;
}
// usdPerRequest: a price per stub request (dry runs of the cost rule); priorSpentUsd, record: as gn1-batch.mjs (the cap
// rule committed + full reservation <= cap, request by request, the stub's price being both reservation and actual: the
// requests that fit are charged, and if not all of the wave fits it stops with capStop, the same fields as the real
// backend; the cost-rule record is required the same way);
// outDir: a journal of the stub's spend (spent.json), so a resumed dry run keeps it.
export function fakeBackend({ cfg, log = () => {}, usdPerRequest = 0, priorSpentUsd = 0, record = null, outDir = null } = {}) {
  const seen = [], jf = outDir ? path.join(outDir, 'fake-spent.json') : null;
  let own = jf && fs.existsSync(jf) ? JSON.parse(fs.readFileSync(jf, 'utf8')).usd : 0;
  const backend = {
    label: 'fake', waves: seen, spent: () => own, capStopped: false, capStop: null,
    async wave(wk, rows) {
      if (record) requireRecord(record);
      if (rows.some((q) => q.params.model !== cfg.model)) throw Error('fake backend: unexpected model');
      const reserveUsd = rows.length * usdPerRequest;
      let sent = 0; while (sent < rows.length && fits({ spentUsd: priorSpentUsd + own + sent * usdPerRequest, reserveUsd: usdPerRequest, capUsd: cfg.studyCapUsd })) sent++;
      if (sent < rows.length) { own += sent * usdPerRequest; if (jf) fs.writeFileSync(jf, JSON.stringify({ usd: own }) + '\n');
        backend.capStopped = true; backend.capStop = { wave: wk, part: sent ? 1 : 0, requestsLeft: rows.length - sent, spentUsd: +(priorSpentUsd + own).toFixed(6), partReserveUsd: usdPerRequest, capUsd: cfg.studyCapUsd, waveReserveUsd: +reserveUsd.toFixed(6) }; log({ wave: wk, stop: 'study cap' }); return null; }
      const outputs = new Map();
      for (const q of rows) {
        const json = fakeAnswer(q.params), text = JSON.stringify(json);
        outputs.set(q.custom_id, { json, usage: { input_tokens: Math.ceil(Buffer.byteLength(q.params.messages[0].content) / 3), output_tokens: Math.ceil(Buffer.byteLength(text) / 3) }, stop: 'end_turn', blocks: ['text'], usd: usdPerRequest });
      }
      own += rows.length * usdPerRequest; if (jf) fs.writeFileSync(jf, JSON.stringify({ usd: own }) + '\n');
      seen.push({ wave: wk, requests: rows.length });
      log({ fakeWave: wk, requests: rows.length });
      return outputs;
    },
  };
  return backend;
}
