import fs from 'node:fs';import path from 'node:path';
import {hash,MODEL,MAX_TOKENS} from './model.mjs';
export const HARD_CAP=5;
export function reserveFor(params){
 if(params.model!==MODEL||params.max_tokens!==MAX_TOKENS||params.tools||params.messages.some(m=>typeof m.content!=='string'))throw new Error('Unapproved model/request shape');
 const bytes=Buffer.byteLength(JSON.stringify(params));
 if(bytes>16000)throw new Error('Prompt byte ceiling');
 return {bytes,inputEnvelope:bytes+4096,usd:((bytes+4096)*.25+MAX_TOKENS*1.25)/1e6*1.5};
}
export function usageCost(u){
 const input=u.input_tokens||0,read=u.cache_read_input_tokens||0,write=u.cache_creation_input_tokens||0,output=u.output_tokens||0;
 const long=input+read+write>100000,k=long?5:1;
 const hour=u.cache_creation?.ephemeral_1h_input_tokens||0,five=write-hour;
 return (input*.05+read*.005+five*.0625+hour*.1+output*.25)*k/1e6;
}
export function atomic(file,data){fs.writeFileSync(file+'.tmp',JSON.stringify(data,null,2)+'\n');fs.renameSync(file+'.tmp',file);}
export function commitment(entries){return Object.values(entries).reduce((s,e)=>s+(e.status==='complete'?e.chargedOrReserved:e.reserve),0);}
export class BatchRunner{
 constructor(out,configHash){this.out=out;this.configHash=configHash;fs.mkdirSync(out,{recursive:true});this.journalFile=path.join(out,'batches.json');this.journal=fs.existsSync(this.journalFile)?JSON.parse(fs.readFileSync(this.journalFile)):{};this.ledgerFile=path.join(out,'ledger.jsonl');this.ledger=fs.existsSync(this.ledgerFile)?fs.readFileSync(this.ledgerFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];}
 spent(){return this.ledger.reduce((s,e)=>s+(e.usageCostUsd||0),0);}
 async init(){this.api=await import('../../../library/cards/batch-api.mjs');}
 async tokenProbe(q){
  const keyfile=process.env.ANTHROPIC_API_KEY_FILE||'/data/.config/OpenBot/agent-api-keys/.vault/ANTHROPIC_API_KEY';
  const key=(process.env.ANTHROPIC_API_KEY||fs.readFileSync(keyfile,'utf8')).trim();
  const r=await fetch('https://api.anthropic.com/v1/messages/count_tokens',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:q.params.model,system:q.params.system,messages:q.params.messages}),signal:AbortSignal.timeout(60000)});
  const b=await r.json();if(!r.ok)throw new Error(`Token-count HTTP ${r.status}: ${b.error?.message||'error'}`);
  const reserve=reserveFor(q.params);if(b.input_tokens>reserve.inputEnvelope)throw new Error('Token-count exceeded reservation envelope');
  atomic(path.join(this.out,'token-probe.json'),{model:MODEL,inputTokens:b.input_tokens,reservation:reserve,pricedInputAtShortBatchUsd:b.input_tokens*.05/1e6,freeTokenCountEndpoint:true});return b;
 }
 async wave(name,rows){
  const manifest=rows.map(q=>({custom_id:q.custom_id,params:q.params}));
  const manifestHash=hash({configHash:this.configHash,manifest,scopes:rows.map(q=>q.scope)});
  let entry=this.journal[name];
  const file=path.join(this.out,`${name}.requests.jsonl`),resultsFile=path.join(this.out,`${name}.results.jsonl`);
  if(entry&&entry.manifestHash!==manifestHash)throw new Error('Resume manifest mismatch: '+name);
  if(!entry){
   const reserve=rows.reduce((s,q)=>s+reserveFor(q.params).usd,0);
   if(commitment(this.journal)+reserve>HARD_CAP)throw new Error(`Budget stop: committed + wave reserve exceeds $${HARD_CAP}`);
   fs.writeFileSync(file,manifest.map(q=>JSON.stringify(q)).join('\n')+'\n');
   entry={manifestHash,reserve,status:'intent',requestCount:rows.length,created:new Date().toISOString()};this.journal[name]=entry;atomic(this.journalFile,this.journal);
   // Never retry a POST with an uncertain outcome. Intent is preserved for reconciliation.
   const created=await this.api.createBatch(manifest);entry.batchId=created.id;entry.status='submitted';atomic(this.journalFile,this.journal);
   console.log(JSON.stringify({event:'batch-submitted',name,batchId:created.id,requests:rows.length,reserveUsd:reserve,usageSoFarUsd:this.spent()}));
  }else if(entry.status==='intent')throw new Error('Submission outcome uncertain; reserved, no automatic resubmission: '+name);
  let raw;
  if(fs.existsSync(resultsFile))raw=fs.readFileSync(resultsFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  else{
   const ended=await this.api.waitForBatch(entry.batchId,{intervalMs:15000,timeoutMs:24*60*60*1000});
   raw=await this.api.fetchBatchResults(ended);
   fs.writeFileSync(resultsFile,raw.map(q=>JSON.stringify(q)).join('\n')+'\n');
  }
  const ids=new Set(rows.map(q=>q.custom_id)),rawIds=raw.map(q=>q.custom_id);
  if(raw.length!==rows.length||new Set(rawIds).size!==rows.length||rawIds.some(id=>!ids.has(id)))throw new Error('Missing, duplicate or extraneous batch result IDs');
  const accounted=new Set(this.ledger.map(q=>q.customId)),out=new Map();let charged=0;
  for(const item of raw){
   const q=rows.find(q=>q.custom_id===item.custom_id),m=item.result?.message,u=m?.usage;
   const ok=item.result?.type==='succeeded'&&u&&Number.isFinite(u.input_tokens)&&Number.isFinite(u.output_tokens);
   const knownUnbilled=['errored','canceled','expired'].includes(item.result?.type);
   const cost=ok?usageCost(u):knownUnbilled?0:null,reservation=reserveFor(q.params).usd;
   charged+=cost??reservation;
   if(!accounted.has(item.custom_id)){
    const rec={ts:new Date().toISOString(),batchId:entry.batchId,customId:item.custom_id,model:m?.model||MODEL,status:item.result?.type||'unknown',usage:u||null,usageCostUsd:cost,uncertainReserveUsd:cost===null?reservation:0,stop:m?.stop_reason||null,pricing:'2026-11-09 batch list-price estimate, not invoice'};
    fs.appendFileSync(this.ledgerFile,JSON.stringify(rec)+'\n');this.ledger.push(rec);accounted.add(item.custom_id);
   }
   out.set(item.custom_id,{ok:!!ok,text:m?.content?.filter(c=>c.type==='text').map(c=>c.text).join('')||'',stop:m?.stop_reason,model:m?.model,error:item.result?.error?.message||item.result?.type});
  }
  entry.status='complete';entry.chargedOrReserved=charged;entry.completed=new Date().toISOString();atomic(this.journalFile,this.journal);
  if(commitment(this.journal)>HARD_CAP)throw new Error('Actual usage exceeded budget; stop');
  console.log(JSON.stringify({event:'batch-complete',name,requests:raw.length,usageSoFarUsd:this.spent(),committedUsd:commitment(this.journal)}));return out;
 }
}
