// Checks for observatory/batch2/colony/classifier.mjs (offline). Run: node observatory/batch2/colony/classifier.test.mjs
import assert from 'node:assert/strict';
import { jevFor, classifierSummary, JEV_OFF } from './classifier.mjs';

// off by default; on only when the spec asks, with a pinned version
assert.deepEqual(jevFor({}, 'market'), JEV_OFF);
assert.deepEqual(jevFor({ bench: { colony: 'main' } }, 'market'), { enabled: false });
assert.deepEqual(jevFor({ bench: { jev: { enabled: true, version: 'jev-1.14.0' } } }, 'a'), { enabled: true, version: 'jev-1.14.0' });
assert.throws(() => jevFor({ bench: { jev: { enabled: true } } }, 'a'), /not pinned/);
assert.throws(() => jevFor({ bench: { jev: { enabled: true, version: 'jev-latest' } } }, 'a'), /not pinned/);
// an arm can turn Jev on against a spec-level off, or off against a spec-level on
const cfg = { bench: { jev: { enabled: false } }, armSpecs: { jev: { jev: { enabled: true, version: 'jev-1.13.0' } }, model: {} } };
assert.deepEqual(jevFor(cfg, 'jev'), { enabled: true, version: 'jev-1.13.0' });
assert.deepEqual(jevFor(cfg, 'model'), JEV_OFF);
assert.deepEqual(jevFor({ bench: { jev: { enabled: true, version: 'jev-1.14.0' } }, armSpecs: { off: { jev: { enabled: false } } } }, 'off'), JEV_OFF);

// summary from a ba2ce00 export
const exp = { classifier: { jevKey: true, jev: { enabled: true, version: 'jev-1.14.0' }, providers: { jev: 2, model: 1, none: 0 }, decisions: 3 },
  agents: [{ tasks: [{ classifier: [
    { decision: 'goal-first-pass', provider: 'jev', version: 'jev-1.14.0', action: 'ended-goal-solved' },
    { decision: 'goal-first-pass', provider: 'model', model: { provider: 'openai', id: 'gpt-x', effort: 'low' }, action: 'called-llm-judge' },
    { decision: 'chat-assist', provider: 'jev', version: 'jev-1.14.0' }] }, { classifier: [] }, {}] }] };
const s = classifierSummary(exp, { enabled: true, version: 'jev-1.14.0' });
assert.equal(s.recorded, true);
assert.equal(s.firstPass.decisions, 2);
assert.deepEqual(s.firstPass.byProvider, { jev: 1, model: 1 });
assert.deepEqual(s.firstPass.jevVersions, ['jev-1.14.0']);
assert.deepEqual(s.firstPass.models, ['openai/gpt-x@low']);
assert.equal(s.run.jevKey, true);
// an export from Colony before ba2ce00 has no classifier block
const old = classifierSummary({ agents: [{ tasks: [{}] }] }, JEV_OFF);
assert.equal(old.recorded, false); assert.equal(old.run, null); assert.equal(old.firstPass.decisions, 0);
console.log('classifier ok');
