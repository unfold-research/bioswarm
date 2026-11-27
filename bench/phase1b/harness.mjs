// Runs one agent-written module under Node's permission model: read access to the module only, no writes, no child
// processes, no workers. Input arrives on stdin, the result leaves on stdout as JSON. Started by verify.mjs.
import { pathToFileURL } from 'node:url';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
const mod = await import(pathToFileURL(process.argv[2]).href + '?v=' + Date.now());
if (typeof mod.default !== 'function') throw Error('default export is not a function');
const result = await mod.default(input);
process.stdout.write(JSON.stringify({ result }));
