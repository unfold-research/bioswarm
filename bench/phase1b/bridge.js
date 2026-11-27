// Local message bridge for Pi direct (amendment of 25/11): send_message queues a private request for a teammate.
// The runner delivers each queue at the recipient's next wave, in every arm. Under B and C the BioSwarm connector
// sees the same tool name and applies its message ceilings before the bridge runs. Counters only leave the bridge.
import { appendFileSync, mkdirSync, readFileSync, renameSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Type } from 'typebox';

export function createBridge({ self, team, inbox, counts }) {
  return (pi) => {
    pi.registerTool({
      name: 'send_message',
      label: 'Send message',
      description: 'Send a private message to one teammate. It is delivered at the start of their next wave.',
      parameters: Type.Object({ to: Type.String(), message: Type.String() }),
      async execute(_id, params) {
        if (!team.includes(params.to) || params.to === self || !params.message.trim()) {
          counts.refused++;
          throw Error('Unknown recipient or empty message. Teammates: ' + team.filter((a) => a !== self).join(', '));
        }
        mkdirSync(inbox, { recursive: true, mode: 0o700 });
        appendFileSync(join(inbox, params.to + '.jsonl'), JSON.stringify({ from: self, message: params.message }) + '\n', { mode: 0o600 });
        counts.accepted++;
        counts.chars += params.message.length;
        return { content: [{ type: 'text', text: 'Mensagem enfileirada para ' + params.to + '; entrega na próxima onda.' }], details: {} };
      },
    });
  };
}

// Takes the whole queue of one agent atomically, so a message sent during delivery waits for the next wave.
export function drainInbox(inbox, agent) {
  const file = join(inbox, agent + '.jsonl');
  if (!existsSync(file)) return [];
  const taken = file + '.taken';
  renameSync(file, taken);
  const items = readFileSync(taken, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  writeFileSync(taken, '');
  return items;
}
