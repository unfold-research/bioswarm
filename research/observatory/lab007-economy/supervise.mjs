// Operational supervisor only: reconcile the canceled parallel batch, then resume
// the frozen experiment if it stopped solely for the shared budget reservation.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
import {retrieveBatch,fetchBatchResults} from '../../../library/cards/batch-api.mjs';
import {usageCost,atomic} from './batch.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url)),OUT=path.resolve(HERE,'../../results/lab007-economy');
const canceledId='msgbatch_01YPTJrZAdKrjKDdY9ssuW89',deadline=Date.now()+24*3600000;
function read(name,fallback={}){const f=path.join(OUT,name);return fs.existsSync(f)?JSON.parse(fs.readFileSync(f)):fallback;}
function alive(pid){try{process.kill(pid,0);return true;}catch{return false;}}
const pause=()=>new Promise(r=>setTimeout(r,30000));
let reconciled=false,resumed=false;
atomic(path.join(OUT,'supervisor.json'),{pid:process.pid,status:'monitoring',canceledId,started:new Date().toISOString()});
try{
 while(Date.now()<deadline){
  const lock=read('RUNNING.lock'),active=lock.pid&&alive(lock.pid);
  const remote=await retrieveBatch(canceledId);
  atomic(path.join(OUT,'parallel-batch-status.json'),remote);
  if(remote.processing_status==='ended'&&!active){
   const rows=await fetchBatchResults(remote);
   fs.writeFileSync(path.join(OUT,'parallel-batch-results.jsonl'),rows.map(x=>JSON.stringify(x)).join('\n')+'\n');
   const knownTypes=new Set(['succeeded','errored','canceled','expired']);if(rows.length!==864||rows.some(r=>!knownTypes.has(r.result?.type)))throw new Error('Parallel batch result reconciliation incomplete');
   const cost=rows.reduce((s,r)=>s+(r.result?.type==='succeeded'?usageCost(r.result.message.usage):0),0);
   const journal=read('batches.json');journal.parallelPriorBatch={...journal.parallelPriorBatch,status:'complete',chargedOrReserved:cost,usageCostEstimateUsd:cost,counts:remote.request_counts,reconciledAt:new Date().toISOString()};atomic(path.join(OUT,'batches.json'),journal);reconciled=true;
   const current=read('status.json');
   if(current.status==='budget-stop'&&!resumed){
    const lockPath=path.join(OUT,'RUNNING.lock');if(fs.existsSync(lockPath)&&!alive(read('RUNNING.lock').pid))fs.unlinkSync(lockPath);
    resumed=true;const fd=fs.openSync(path.join(OUT,'run.log'),'a');const child=spawn(process.execPath,[path.join(HERE,'run.mjs'),'--live'],{stdio:['ignore',fd,fd]});fs.closeSync(fd);await new Promise(resolve=>child.on('close',resolve));
   }
   const latest=read('status.json');
   if(['calibration-gate-failed','heldout-complete','integrity-or-api-stop','budget-stop'].includes(latest.status)){
    const summary=read('summary.json'),journal2=read('batches.json');const supplement=Object.values(journal2).filter(e=>e.external||e.reason==='API contract validation, not experimental replicate'||e===journal2.contractProbe).reduce((s,e)=>s+(e.usageCostEstimateUsd||0),0);
    atomic(path.join(OUT,'completion.json'),{generated:new Date().toISOString(),status:latest.status,experimentUsageEstimateUsd:summary.usageCostEstimateUsd||0,parallelAndProbeEstimateUsd:supplement,totalUsageEstimateUsd:(summary.usageCostEstimateUsd||0)+supplement,capUsd:5,parallelBatch:remote.request_counts,resumedAfterReservationRelease:resumed,report:path.join(OUT,'REPORT.md'),limits:'Token-rate estimate; not an invoice. No security advantage inferred from calibration.'});
    atomic(path.join(OUT,'supervisor.json'),{pid:process.pid,status:'complete',reconciled,resumed,finished:new Date().toISOString()});break;
   }
  }
  await pause();
 }
 if(Date.now()>=deadline)throw new Error('24h provider wait deadline; all known IDs/reservations preserved');
}catch(e){atomic(path.join(OUT,'supervisor.json'),{pid:process.pid,status:'stopped',error:e.message,reconciled,resumed,ts:new Date().toISOString()});process.exitCode=1;}
