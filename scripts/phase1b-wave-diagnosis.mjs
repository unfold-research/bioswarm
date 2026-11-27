// Read-only reconstruction. Run at the bioswarm checkout root with the two private input paths.
// Emits relative times and counts only. The blind key and memos are never inputs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { checkMap } = await import(pathToFileURL(resolve('bench/phase1b/v2/case.mjs')));
const { assignment } = await import(pathToFileURL(resolve('packages/connector-pi/coordination.js')));
const [receiptsFile, controlFile] = process.argv.slice(2);
const attempts = readFileSync(receiptsFile, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const { workspaces } = JSON.parse(readFileSync(controlFile, 'utf8'));
const events = Object.values(workspaces).flatMap(w => w.events);
const team = ['lia', 'rui', 'teo'];
const revision = '75c5bc4fb066c39be11d3299dfa29df003b12110';
const sample = attempts.filter(r => r.revision === revision && r.comparable && ['B','C'].includes(r.arm));
assert.equal(sample.length, 12);
assert.equal(new Set(sample.map(r => r.arm + r.seed)).size, 12);
const totals = {};
const rows = [];
for (const r of sample) {
  const bucket = totals[r.arm] ??= {waves:0, wall:0, agentSeconds:0, recordedTurns:0};
  bucket.waves += r.waves;
  bucket.wall += r.observedWallSeconds;
  bucket.agentSeconds += r.agentHours * 3600;
  const e = events.filter(x => team.includes(x.agent) && x.at >= Date.parse(r.startedAt) && x.at <= Date.parse(r.endedAt));
  bucket.recordedTurns += e.filter(x=>x.type === 'run_end').length;
  if (r.arm !== 'C') continue;
  const map = checkMap(r.seed);
  const turns = Object.fromEntries(team.map(agent => {
    // Keep source order on equal timestamps. Do not match waves by nearest event.
    const log = e.filter(x => x.agent === agent).sort((a,b) => a.at-b.at);
    const spans = [];
    let current;
    for (const event of log) {
      if (event.type === 'run_start') { assert.equal(current, undefined); current = { start:event.at, log:[] }; }
      if (current) current.log.push(event);
      if (event.type === 'run_end') { assert.ok(current); spans.push({...current, end:event.at}); current=undefined; }
    }
    assert.equal(spans.length,r.waves); assert.equal(current,undefined);
    return [agent,spans];
  }));
  let prevEnd = 0;
  for (let w=0; w<r.waves; w++) {
    const first = Math.min(...team.map(a => turns[a][w].start));
    const last = Math.max(...team.map(a => turns[a][w].end));
    assert.ok(first>=prevEnd); prevEnd=last;
    const failing = r.verifications.find(v=>v.afterWave===w).failing;
    const perAgent = {};
    for (const agent of team) {
      const {start,end,log} = turns[agent][w];
      const waits = log.filter(x=>x.rule === 'wait_for_trace');
      const candidateClasses = new Set();
      for (const f of failing) {
        const check = map.find(c=>c.id===f.id);
        assert.equal(check.class,f.class);
        const fallback = r.reassignments.find(a=>a.wave===w+1 && a.check===f.id);
        const assigned = assignment({run:r.run,team,wave:w+1,fallbackAfter:3}, {...check,loneWaves:fallback?.loneWaves??0}, {tieBreak:'hash',waitForTrace:true});
        if (assigned.agent===agent) candidateClasses.add(f.class);
      }
      if (waits.length) assert.ok(candidateClasses.size);
      let untilNextToolMs=0, nextTool=0;
      for (const [i,x] of log.entries()) if (x.rule==='wait_for_trace') {
        const next=log.slice(i+1).find(n=>n.type==='tool' || n.type==='run_end');
        assert.ok(next);
        untilNextToolMs+=next.at-x.at;
        nextTool+=Number(next.type==='tool');
      }
      perAgent[agent]={activeMs:end-start, barrierMs:last-end, dispatchSkewMs:start-first, waits:waits.length,
        yields:log.filter(x=>x.rule==='yielded_place').length, untilNextToolMs, nextTool,
        ownWaitMin:candidateClasses.size===1 && candidateClasses.has('own')?waits.length:0,
        ownWaitMax:candidateClasses.has('own')?waits.length:0};
    }
    rows.push({seed:r.seed,wave:w+1,spanMs:last-first,perAgent});
  }
  const ownRows = rows.filter(x=>x.seed===r.seed);
  for (const [key,rule] of [['waits','wait_for_trace'],['yields','yielded_place']])
    assert.equal(ownRows.flatMap(x=>Object.values(x.perAgent)).reduce((s,x)=>s+x[key],0),r.manipulation.rulesFired[rule]??0);
}
console.log(JSON.stringify({revision,totals,rows},null,2));
