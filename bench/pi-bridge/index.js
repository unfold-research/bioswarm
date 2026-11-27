// Local send_message bridge for the direct Pi host. Loaded identically in arms A, B and C.
// It queues a private request for a teammate; the runner delivers it as that teammate's next turn.
// It registers no coordination tool and records no text outside the attempt's private queue.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { Type } from 'typebox';
import { enqueue, refuse } from '../bridge-queue.mjs';

export const bridgeTool = 'send_message';

export function installBridge(pi, cwd = process.cwd()) {
  const marker = join(cwd, '.phase1-bridge');
  if (!existsSync(marker)) return;
  const { queue, team } = JSON.parse(readFileSync(marker, 'utf8'));
  const self = basename(cwd);
  const find = (to) => {
    const key = String(to ?? '').trim().toLowerCase();
    return team.find((m) => m.id.toLowerCase() === key || m.name.toLowerCase() === key);
  };
  pi.registerTool({
    name: bridgeTool,
    label: 'Send message',
    description:
      'Send a private message to one teammate. It is queued and delivered as that teammate’s next request; ' +
      'their reply, if any, arrives the same way. Teammates: ' +
      team
        .filter((m) => m.id !== self)
        .map((m) => m.name)
        .join(', ') +
      '.',
    promptSnippet: 'Send a private message to one teammate by name',
    parameters: Type.Object({ to: Type.String(), message: Type.String() }),
    async execute(_id, params) {
      const target = find(params.to);
      const body = String(params.message ?? '');
      const reason = !target ? 'unknown_recipient' : target.id === self ? 'self' : !body.trim() ? 'empty' : null;
      if (reason) {
        refuse(queue, { sender: self, reason });
        throw Error('Not sent: name one teammate and write a message.');
      }
      enqueue(queue, { sender: self, recipient: target.id, body });
      return { content: [{ type: 'text', text: 'Queued for ' + target.name + '.' }], details: {} };
    },
  });
}
export default installBridge;
