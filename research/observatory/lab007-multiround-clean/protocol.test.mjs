import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCases, sourceRequests, aggregateRequests, expectedClaims, aggregateClaims, scoreClaims, evidenceVerdict, auditProtocol } from './protocol.mjs';

test('fresh paired clusters and source inputs are uniquely identified',()=>{
  const c=makeCases(),r=sourceRequests(); assert.equal(c.length,16);assert.equal(new Set(c.map(x=>x.seed)).size,16);assert.equal(r.length,32);assert.equal(new Set(r.map(x=>x.custom_id)).size,32);
});
test('visible-evidence deterministic control preserves missing and conflict without truth',()=>{
  const c=makeCases();for(const x of c){const m=aggregateClaims(x.packets.map(expectedClaims));assert.equal(m.verdict,evidenceVerdict(x.records));assert.equal(scoreClaims(m.claims,x.records),true);}
  assert.equal(aggregateClaims([[{indicator:0,value:0,evidence_ids:['a']},{indicator:0,value:1,evidence_ids:['b']}]]).verdict,'unsure');
  assert.equal(aggregateClaims([[{indicator:0,value:1,evidence_ids:['a']}]]).verdict,'unsure');
});
test('exact scoring flags absent, wrong, and unsupported citations',()=>{
  const c=makeCases()[0], expected=expectedClaims(c.packets[0]);assert.equal(scoreClaims(expected,c.packets[0]),true);
  assert.equal(scoreClaims(expected.map(x=>({...x,evidence_ids:[]})),c.packets[0]),false);
  assert.equal(scoreClaims(expected.map(x=>({...x,evidence_ids:['bogus']})),c.packets[0]),false);
  assert.equal(scoreClaims([...expected,{indicator:2,value:0,evidence_ids:['unsupported']}],c.packets[0]),false);
});
test('round 1 receives only persisted round-0 claims and exact case IDs',()=>{
  const rows=sourceRequests(), map=new Map();for(const row of rows) map.set(row.custom_id,{claims:row.meta.records.map(r=>({indicator:r.indicator,value:r.value,evidence_ids:[r.id]}))});
  const r1=aggregateRequests(map);assert.equal(r1.length,16);assert.ok(r1.every(x=>x.params.messages[0].content.includes('"upstream"')));assert.ok(r1.every(x=>!x.params.messages[0].content.includes('"records"')));
});
test('protocol declares 32 dependent extractions and 16 gated aggregations',()=>{assert.deepEqual(auditProtocol(),{caseClusters:16,archetypes:8,repeats:2,r0Calls:32,r1Calls:16,totalCalls:48,gate:'R0 31/32 exact; R1 15/16 facts+attribution+decision and no false certainty in ambiguous/conflict cases'});});
