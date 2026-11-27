// The part of a Colony run record that comes from the run's /lab/export (drive.mjs writes it next to the code score).
// Pure: no fleet, no files. Factored out of drive.mjs unchanged so the /lab/export contract test
// (export-contract.test.mjs) runs the scorer's own code on the fixture in fixtures/.
import { classifierSummary } from './classifier.mjs';

// /lab/export schema versions this scorer reads. Exports with no `exportSchema` predate versioning (every Colony study up to
// LI39) and are read as they always were; any other value is refused, so a schema change needs a scorer PR here too.
export const EXPORT_SCHEMAS = Object.freeze([1]);
export function checkExportSchema(exported) {
  const v = exported?.exportSchema;
  if (v === undefined) return null;
  if (!EXPORT_SCHEMAS.includes(v)) throw Error(`unknown /lab/export exportSchema ${JSON.stringify(v)}: this scorer reads ${EXPORT_SCHEMAS.join(', ')} (observatory/batch2/colony/record.mjs); a schema change needs the scorer PR in research too`);
  return v;
}

// `requested` is what the bench asked for (jevFor(cfg, arm)). Keys in the order drive.mjs writes them.
// Spend, calls and tokens: exports before versioning carry them in totals and per-chat `tokens`. From exportSchema 1
// (Colony e8b8029) per-chat `tokens` is null and totals.costUsd/calls no longer count model calls; the run's spend is
// `spend` (the sum of every modelCalls[] entry, the figure Colony's cap uses) and tokens come from modelCalls[].
// `thinking` is inside totalTokens and is not split out, so the record's keys stay the same for every version.
function spendAndTokens(exported) {
  const chats = exported.agents?.flatMap((a) => a.tasks || []);
  if (checkExportSchema(exported) === null) return { costUsd: exported.totals?.costUsd ?? null, calls: exported.totals?.calls ?? null,
    tokens: chats?.reduce((n, t) => ({ input: n.input + (t.tokens?.inputTokens || 0), output: n.output + (t.tokens?.outputTokens || 0), cached: n.cached + (t.tokens?.cachedInputTokens || 0), total: n.total + (t.tokens?.totalTokens || 0) }), { input: 0, output: 0, cached: 0, total: 0 }) };
  return { costUsd: exported.spend?.usd ?? null, calls: exported.spend?.calls ?? null,
    tokens: (chats || []).flatMap((t) => t.modelCalls || []).reduce((n, c) => ({ input: n.input + (c.input || 0), output: n.output + (c.output || 0), cached: n.cached + (c.cacheRead || 0), total: n.total + (c.totalTokens || 0) }), { input: 0, output: 0, cached: 0, total: 0 }) };
}

export function exportRecord(exported, requested) {
  const text = JSON.stringify(exported), count = (re) => (text.match(re) || []).length;
  return { ...spendAndTokens(exported),
    classifier: classifierSummary(exported, requested),
    stalled: (exported.agents || []).some((a) => (a.tasks || []).some((t) => !t.parentId && /\?\s*$/.test(String(t.answer || '').trim()))),
    ants: exported.agents?.flatMap((a) => a.tasks || []).length ?? null, traces: count(/Rastro no campo de/g), antMessages: exported.totals?.antMessages ?? count(/\[Mensagem de /g), blockedEdits: count(/Esse arquivo não é seu/g),
    // Colony lab telemetry (ca8e3df on): every tool call with its result
    ...(() => { const tools = (exported.agents || []).flatMap((a) => (a.tasks || []).flatMap((t) => t.tools || [])); if (!tools.length) return {}; const by = (f) => tools.filter(f).length;
      return { telemetry: { calls: tools.length, errors: by((c) => c.isError), blocked: by((c) => c.blocked), edits: by((c) => ['write', 'edit'].includes(c.tool) && !c.blocked), testRuns: by((c) => c.tool === 'bash' && /test\/run\.mjs/.test(c.input?.command || '')), antSendFailed: by((c) => c.tool === 'ant_send' && c.isError), fieldTraceFailed: by((c) => c.tool === 'field_trace' && c.isError) } }; })() };
}
