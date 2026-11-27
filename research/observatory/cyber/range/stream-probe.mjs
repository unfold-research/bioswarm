// Probe for lost stream replies (2026-11-22): N rounds of P/S on four streams (two pods, service and maintenance), plus
// forced split commands ("P", 250 ms pause, newline), the case where the old stream's `read -t 0.1` on stdin timed out
// mid-line and dropped the command. Before the fix in sensors.mjs no split command got a reply and about 1 in 250
// ordinary commands was lost; "lost" counts commands with no reply within 3 s.
//   node stream-probe.mjs [rounds=25] [range id=m2q]
import fs from 'node:fs'; import { spawnSync, spawn } from 'node:child_process';
import { up, down } from './range.mjs'; import { STREAM, EXCLUDE_EXES } from './sensors.mjs';
const N = Number(process.argv[2] || 25), ID = process.argv[3] || 'm2q';
spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', `/tmp/r0sp-${ID}`]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const { pods } = up(ID, fs.readFileSync(`/tmp/r0sp-${ID}.pub`, 'utf8').trim());
  await sleep(5000);
  async function probe(c, net, cmds) {
    const p = spawn('docker', ['exec', '-i', '-e', 'R0_HARNESS=x', '-e', `R0_EXCLUDE=${EXCLUDE_EXES.join(' ')}`, c, 'bash', '-c', STREAM, 's', net], { stdio: ['pipe', 'pipe', 'ignore'] });
    let buf = ''; p.stdout.on('data', (d) => buf += d);
    const ends = () => (buf.match(/^END$/mg) || []).length;
    const wait = async (n0, t) => { while (ends() === n0 && Date.now() - t < 3000) await sleep(5); return ends() > n0; };
    const res = []; let lost = 0;
    for (let i = 0; i < N; i++) {
      for (const cmd of cmds) { const n0 = ends(), t = Date.now(); p.stdin.write(cmd + '\n'); if (!await wait(n0, t)) lost++; res.push(Date.now() - t); }
      await sleep(300 + Math.random() * 400);
    }
    let split = 0;
    for (let i = 0; i < 5; i++) { const n0 = ends(), t = Date.now(); p.stdin.write('P'); await sleep(250); p.stdin.write('\n'); if (await wait(n0, t)) split++; }
    p.stdin.end('Q\n'); res.sort((a, b) => a - b);
    return { c, n: res.length, p50: res[res.length >> 1], max: res.at(-1), lost, splitAnswered: `${split}/5` };
  }
  const r = await Promise.all([probe(pods[3].service, '1', ['P', 'S']), probe(pods[3].maint, '0', ['P']), probe(pods[0].service, '1', ['P', 'S']), probe(pods[0].maint, '0', ['P'])]);
  console.log(JSON.stringify(r, null, 1));
} finally { down(ID); fs.rmSync(`/tmp/r0sp-${ID}`, { force: true }); fs.rmSync(`/tmp/r0sp-${ID}.pub`, { force: true }); }
