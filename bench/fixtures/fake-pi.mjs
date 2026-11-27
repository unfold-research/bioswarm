// Stand-in for `pi -p --mode json` in tests: no model call. It keeps a session file per --session-id, runs the
// real send_message bridge, and prints the events the runner meters. Behaviour per "<name>#<turn>" in FAKE_SCRIPT.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import installBridge from '../pi-bridge/index.js';

const args = process.argv.slice(2);
const flag = (name) => args[args.indexOf(name) + 1];
const sessionFile = join(flag('--session-dir'), flag('--session-id') + '.jsonl');
const prompt = flag('-p');
const turn = (existsSync(sessionFile) ? readFileSync(sessionFile, 'utf8').split('\n').filter(Boolean).length : 0) + 1;
appendFileSync(sessionFile, JSON.stringify({ turn }) + '\n');
const { team } = JSON.parse(readFileSync('.phase1-bridge', 'utf8'));
const self = team.find((m) => process.cwd().endsWith(m.id));
const step = JSON.parse(process.env.FAKE_SCRIPT || '{}')[self.name + '#' + turn] ?? {};
if (step.expect && !prompt.includes(step.expect)) process.exit(3);
let tool;
installBridge({ registerTool: (t) => (tool = t) });
const emit = (e) => process.stdout.write(JSON.stringify(e) + '\n');
emit({ type: 'agent_start' });
for (let i = 0; i < (step.retry ?? 0); i++) emit({ type: 'auto_retry_start' });
await sleep(step.sleep ?? 10);
for (const [to, message] of step.send ?? []) {
  try {
    await tool.execute('call', { to, message });
  } catch {}
}
emit({
  type: 'message_end',
  message: {
    role: 'assistant', model: 'gpt-6.1-sol', stopReason: step.error ? 'error' : 'stop',
    usage: { input: 100, output: 20, cacheRead: 50, cacheWrite: 5, cost: { total: 0.001 } },
  },
});
