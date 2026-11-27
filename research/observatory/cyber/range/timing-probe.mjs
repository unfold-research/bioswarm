import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
import { up, down } from './range.mjs'; import { SUBNET, SEGMENTS } from './net.mjs'; import { Sensors } from './sensors.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-f', '/tmp/r0tp-k']);
const { router, pods } = up('m2p', fs.readFileSync('/tmp/r0tp-k.pub', 'utf8').trim());
await sleep(8000);
const S = new Sensors({ hosts: pods, router: { name: router, ips: SEGMENTS.map((s) => SUBNET[s].replace(/\.0\/24$/, '.254')) } });
for (let i = 0; i < 12; i++) { const o = await S.step(); console.log(o.ms, JSON.stringify(o.timing)); await sleep(1500); }
const st = spawnSync('docker', ['stats', '--no-stream', '--format', '{{.Name}} {{.CPUPerc}}'], { encoding: 'utf8' }).stdout.split('\n').filter((l) => l.includes('m2p')); console.log(st.join('\n'));
S.close(); down('m2p'); fs.rmSync('/tmp/r0tp-k'); fs.rmSync('/tmp/r0tp-k.pub');
