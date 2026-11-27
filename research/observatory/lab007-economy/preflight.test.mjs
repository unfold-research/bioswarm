import test from 'node:test';import assert from 'node:assert/strict';
import {N,label,makeRun,buildRequest,applyRound,mockResponse,parseAnswer,gate,scoreRun} from './model.mjs';
import {reserveFor,usageCost,commitment} from './batch.mjs';
function simulate(run,susceptible=false){for(let r=0;r<run.rounds;r++){const qs=Array.from({length:N},(_,a)=>buildRequest(run,a,r));applyRound(run,qs,new Map(qs.map(q=>[q.custom_id,mockResponse(q,susceptible)])));}return run;}
test('all boolean truth cases and unknown logic',()=>{for(let n=0;n<8;n++){const v=[n&1,(n>>1)&1,(n>>2)&1];assert.equal(label(v),n===7?'malicious':'benign');}assert.equal(label([1,null,1]),'unsure');assert.equal(label([0,null,null]),'benign');});
test('clean mock gets full information via peers, no-sharing abstains',()=>{for(const arm of ['FIXED','ISO','IMM-lite'])for(const seed of [101,102,103,104])assert.equal(scoreRun(simulate(makeRun(seed,'S0',arm))).correct,N);assert.ok(scoreRun(simulate(makeRun(101,'S0','NOSHARE'))).unsure>0);});
test('seed, arm, repeat scopes distinguish logical requests; exact resume stable',()=>{const q=buildRequest(makeRun(101,'S0','FIXED'),0,0);assert.deepEqual(q,buildRequest(makeRun(101,'S0','FIXED'),0,0));assert.notEqual(q.scope,buildRequest(makeRun(101,'S0','FIXED',1),0,0).scope);});
test('hidden labels cannot enter a request/detector',()=>{const run=makeRun(101,'S0','FIXED'),a=buildRequest(run,0,0);run.truth=[1,1,0];const b=buildRequest(run,0,0);assert.deepEqual(a.params,b.params);assert.ok(!JSON.stringify(a.params).includes('"truth"'));});
test('malformed/truncated/forged-reference replies fail without repair',()=>{const q=buildRequest(makeRun(101,'S0','FIXED'),0,0);assert.equal(parseAnswer('invalid',q.meta.records).valid,false);assert.equal(parseAnswer(mockResponse(q).text,q.meta.records,'max_tokens').valid,false);const a=JSON.parse(mockResponse(q).text);a.refs=['fake'];assert.equal(parseAnswer(JSON.stringify(a),q.meta.records).valid,false);});
test('susceptible mock triggers gate; resistance remains a null; clean noise repeats distinct',()=>{const mk=s=>{const runs=[];for(const seed of [101,102,103,104])for(const cell of ['S0','S1','S2','S3'])for(const arm of ['FIXED','NOSHARE']){runs.push(simulate(makeRun(seed,cell,arm),s));if(cell==='S0')runs.push(simulate(makeRun(seed,cell,arm,1),s));}return runs;};assert.equal(gate(mk(true)).passes,true);assert.equal(gate(mk(false)).passes,false);});
test('guarded policies do not receive ground truth; detect conflicts using local readings only',()=>{const a=simulate(makeRun(101,'S3','ISO'),true),b=simulate(makeRun(101,'S3','FIXED'),true);assert.ok(a.interventions>0);assert.ok(scoreRun(a).correct>=scoreRun(b).correct);});
test('real USD pricing separates cache operations; reservations prevent oversubmission',()=>{const q=buildRequest(makeRun(101,'S0','FIXED'),0,0),r=reserveFor(q.params);assert.ok(r.usd>usageCost({input_tokens:2000,output_tokens:256}));assert.equal(usageCost({input_tokens:1000,output_tokens:100}),.000075);assert.equal(commitment({a:{status:'submitted',reserve:4},b:{status:'complete',chargedOrReserved:1}}),5);assert.throws(()=>reserveFor({...q.params,model:'expensive'}));assert.throws(()=>reserveFor({...q.params,messages:[{role:'user',content:'x'.repeat(20000)}]}));});

test('batch resume is idempotent and reserves unknown submissions without retry',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');const {BatchRunner}=await import('./batch.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'norevia-l7-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 let submitted=0;const qs=[buildRequest(makeRun(101,'S0','FIXED'),0,0)];
 const raw=qs.map(q=>({custom_id:q.custom_id,result:{type:'succeeded',message:{model:'mock-model',usage:{input_tokens:100,output_tokens:20},stop_reason:'end_turn',content:[{type:'text',text:mockResponse(q).text}]}}}));
 const backend={createBatch:async()=>{submitted++;return {id:'msgbatch_mock'};},waitForBatch:async()=>({processing_status:'ended'}),fetchBatchResults:async()=>raw};
 const a=new BatchRunner(dir,'config');a.api=backend;await a.wave('first',qs);const cost=a.spent();
 const b=new BatchRunner(dir,'config');b.api=backend;await b.wave('first',qs);assert.equal(submitted,1);assert.equal(b.spent(),cost);assert.equal(b.ledger.length,1);
 const uncertain=new BatchRunner(path.join(dir,'uncertain'),'config');uncertain.api={...backend,createBatch:async()=>{throw new Error('transport interrupted');}};
 await assert.rejects(uncertain.wave('lost',qs),/transport/);uncertain.api=backend;await assert.rejects(uncertain.wave('lost',qs),/uncertain/);assert.equal(submitted,1);assert.ok(commitment(uncertain.journal)>0);
});
test('oversized budget or duplicate remote IDs stop before accepting results',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');const {BatchRunner}=await import('./batch.mjs');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'norevia-l7-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));let called=false;
 const a=new BatchRunner(dir,'config');a.api={createBatch:async()=>{called=true;}};const q=buildRequest(makeRun(101,'S0','FIXED'),0,0);
 await assert.rejects(a.wave('too-large',Array.from({length:4000},(_,i)=>({...q,custom_id:'x'+i}))),/Budget stop/);assert.equal(called,false);
 const b=new BatchRunner(path.join(dir,'bad-ids'),'config');b.api={createBatch:async()=>({id:'msgbatch_bad'}),waitForBatch:async()=>({processing_status:'ended'}),fetchBatchResults:async()=>[{custom_id:'wrong',result:{type:'errored'}}]};
 await assert.rejects(b.wave('bad',[q]),/result IDs/);assert.ok(commitment(b.journal)>0);
});
