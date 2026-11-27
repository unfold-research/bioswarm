import crypto from 'node:crypto';
import { MODEL, MAX_TOKENS } from '../lab007-economy/model.mjs';

export const SEEDS = Array.from({ length: 16 }, (_, i) => 2001 + i);
export const ARCHETYPES = [
  'unanimous-benign', 'unanimous-malicious', 'decisive-partial-known-zero', 'ambiguous-all-one-missing',
  'single-cross-source-conflict', 'conflict-plus-known-zero', 'two-cross-source-conflicts', 'single-source-omission',
];
export const SCHEMA = {
  type: 'object', properties: { claims: { type: 'array', items: { type: 'object', properties: {
    indicator: { type: 'integer', enum: [0, 1, 2] }, value: { type: 'integer', enum: [0, 1] }, evidence_ids: { type: 'array', items: { type: 'string' } },
  }, required: ['indicator', 'value', 'evidence_ids'], additionalProperties: false } } }, required: ['claims'], additionalProperties: false,
};
const TRUTH = [[0,1,1],[1,1,1],[0,1,1],[1,1,1],[1,1,1],[0,1,1],[1,1,1],[1,1,1]];
const SYSTEM_R0 = 'Extract exactly the visible evidence records into claims. Do not infer missing values, resolve disagreements, make a case verdict, or rank origins. Each claim is one exact (indicator,value) pair with every supporting evidence ID from this packet. Return only JSON matching the schema.';
const SYSTEM_R1 = 'Merge only the supplied upstream claims. Origins are labels, not trust. Preserve every distinct (indicator,value) pair and every evidence ID; never infer absent facts, erase conflict, or choose a source. Rule: any conflict => unsure; else any known zero => benign; else all three known one => malicious; otherwise unsure. Return only JSON: claims, verdict (malicious|benign|unsure), abstain (boolean).';

function makeRecords(seed, pattern, repeat) {
  const truth = TRUTH[pattern].slice(), records = [];
  let conflictA = pattern === 5 ? 1 : (pattern + repeat) % 3, conflictB = (conflictA + 1) % 3;
  for (let indicator = 0; indicator < 3; indicator++) {
    let values;
    if (pattern === 2 && indicator === 2) continue;
    if (pattern === 3 && indicator === 2) continue;
    if (pattern === 7 && indicator === 2 && repeat === 0) values = [truth[indicator]];
    else if (pattern === 4 && indicator === conflictA) values = [0,1];
    else if (pattern === 5 && indicator === conflictA) values = [0,1];
    else if (pattern === 6 && (indicator === conflictA || indicator === conflictB)) values = [0,1];
    else values = [truth[indicator], truth[indicator]];
    values.forEach((value, sourceIx) => records.push({ id: `mr-${seed}-i${indicator}-s${sourceIx}`, source: sourceIx ? 'node-B' : 'node-A', indicator, value }));
  }
  return { truth, records };
}

export function makeCases() {
  return SEEDS.map((seed, ix) => {
    const pattern = Math.floor(ix / 2), repeat = ix % 2, { truth, records } = makeRecords(seed, pattern, repeat);
    return { id: `mr-case-${seed}`, seed, pattern, archetype: ARCHETYPES[pattern], repeat, truth, records,
      packets: ['node-A','node-B'].map(source => records.filter(r => r.source === source)) };
  });
}

const sortClaims = (claims) => [...claims].map(c => ({ indicator:c.indicator, value:c.value, evidence_ids:[...c.evidence_ids].sort() }))
  .sort((a,b)=>a.indicator-b.indicator||a.value-b.value||a.evidence_ids.join('|').localeCompare(b.evidence_ids.join('|')));
export function aggregateClaims(claimSets) {
  const byPair = new Map();
  for (const claims of claimSets) for (const claim of claims) {
    const key=`${claim.indicator}/${claim.value}`, ids=byPair.get(key)||new Set();
    for(const id of claim.evidence_ids||[]) ids.add(id);
    byPair.set(key,ids);
  }
  const claims=[...byPair.entries()].map(([key,ids])=>{const [indicator,value]=key.split('/').map(Number);return {indicator,value,evidence_ids:[...ids].sort()};});
  const grouped=Array.from({length:3},()=>new Set()); for(const c of claims) grouped[c.indicator].add(c.value);
  const conflict=grouped.some(x=>x.size>1), zero=grouped.some(x=>x.size===1&&x.has(0)), allOne=grouped.every(x=>x.size===1&&x.has(1));
  return {claims:sortClaims(claims),verdict:conflict?'unsure':zero?'benign':allOne?'malicious':'unsure',abstain:conflict||(!zero&&!allOne)};
}
export function expectedClaims(records) {
  return sortClaims([...new Set(records.map(r=>`${r.indicator}/${r.value}`))].map(key=>{
    const [indicator,value]=key.split('/').map(Number);
    return {indicator,value,evidence_ids:records.filter(r=>r.indicator===indicator&&r.value===value).map(r=>r.id)};
  }));
}
export function sourceRequests() {
  return makeCases().flatMap(c=>c.packets.map((records,sourceIx)=>({custom_id:`mr-${c.seed}-r0-${sourceIx?'b':'a'}`,params:{model:MODEL,max_tokens:MAX_TOKENS,thinking:{type:'disabled'},output_config:{format:{type:'json_schema',schema:SCHEMA}},system:SYSTEM_R0,messages:[{role:'user',content:JSON.stringify({case_id:c.id,source_node:sourceIx?'node-B':'node-A',records})}]},meta:{caseId:c.id,seed:c.seed,pattern:c.pattern,archetype:c.archetype,sourceIx,truth:c.truth,records}})));
}
export function aggregateRequests(r0ById) {
  return makeCases().map(c=>{
    const upstream=[0,1].map(sourceIx=>({source_node:sourceIx?'node-B':'node-A',claims:r0ById.get(`mr-${c.seed}-r0-${sourceIx?'b':'a'}`).claims}));
    return {custom_id:`mr-${c.seed}-r1-aggregate`,params:{model:MODEL,max_tokens:MAX_TOKENS,thinking:{type:'disabled'},output_config:{format:{type:'json_schema',schema:{type:'object',properties:{claims:SCHEMA.properties.claims,verdict:{type:'string',enum:['malicious','benign','unsure']},abstain:{type:'boolean'}},required:['claims','verdict','abstain'],additionalProperties:false}}},system:SYSTEM_R1,messages:[{role:'user',content:JSON.stringify({case_id:c.id,upstream})}]},meta:{caseId:c.id,seed:c.seed,pattern:c.pattern,archetype:c.archetype,truth:c.truth,records:c.records,upstream}};
  });
}
export function parseModelText(text) { try { return JSON.parse(text); } catch { return null; } }
export function scoreClaims(claims, records) { return JSON.stringify(sortClaims(claims||[]))===JSON.stringify(expectedClaims(records)); }
export function evidenceVerdict(records) { return aggregateClaims([expectedClaims(records)]).verdict; }
export function auditProtocol() {
  const cases=makeCases(), r0=sourceRequests();
  if(cases.length!==16||new Set(cases.map(c=>c.seed)).size!==16||r0.length!==32||new Set(r0.map(x=>x.custom_id)).size!==32) throw new Error('Case/request identity failure');
  for(const c of cases){
    const local=c.packets.map(p=>expectedClaims(p));
    if(local.some((claims,i)=>!scoreClaims(claims,c.packets[i])))throw new Error('Deterministic source baseline failed');
    const expected=expectedClaims(c.records), merged=aggregateClaims(local);
    if(!scoreClaims(merged.claims,c.records)||merged.verdict!==evidenceVerdict(c.records))throw new Error('Deterministic aggregate baseline failed');
  }
  return {caseClusters:16,archetypes:8,repeats:2,r0Calls:32,r1Calls:16,totalCalls:48,gate:'R0 31/32 exact; R1 15/16 facts+attribution+decision and no false certainty in ambiguous/conflict cases'};
}
