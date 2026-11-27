// The two fixed, scripted regimes of the T2 map for k agents above one. The regime is not what T2 studies: it is held fixed
// so that the number of agents is the only decision. Each returns the requests of a wave given the outputs so far, and the
// collective's answer once the last wave has returned.
//   reduce (level I)   wave 0: every agent reports a partial result of its shards; wave 1: one merge call answers.
//   board (level III)  waves 0 and 1: every agent posts a note that all agents read in the next wave (the benchmark's shared
//                      file protocol, round-synchronous); wave 2: every agent answers. The collective's answer is the one
//                      most agents give; a tie is no answer.
import { split, render, statement, callId, req, SCHEMA } from './tasks.mjs';

const RULES = 'No tool is available and none may be imitated: do the work yourself. Use the field "working" as scratch space; it is not graded.';
const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');
const head = (c, k, a, part) => `${statement(c)}\n\nThe data is in ${c.M} shards held by ${k} agents. You are agent ${a} and hold shards ${part.first} to ${part.first + part.shards.length - 1}.\n\n${render(part)}`;
export const REGIME_OF = (task) => (task.startsWith('III-') ? 'board' : 'reduce');
export const WAVES_OF = { reduce: 2, board: 3 };

const REDUCE_SYSTEM = `You are one of several agents that each hold part of the data of a task. ${RULES} In "partial" report exactly what a coordinator needs from your part to compute the exact global answer, and nothing else.`;
const MERGE_SYSTEM = `You are the coordinator of several agents that each reported a partial result of a data task. ${RULES} Compute the exact global answer from the partial results.`;
const BOARD_SYSTEM = `You are one of several agents that each hold part of the data of a task and share a board. ${RULES} In "note" post what the other agents need from you to reach the exact global answer; every agent reads all notes in the next round.`;
const FINAL_SYSTEM = `You are one of several agents that each hold part of the data of a task and share a board. ${RULES} This is the last round: give the exact global answer.`;

export function wave(c, inst, k, w, outputs) {
  const id = (wv, a) => callId(c.task, c.M, inst.i, k, wv, a), parts = split(inst.shards, k), regime = REGIME_OF(c.task), meta = (extra) => ({ task: c.task, M: c.M, i: inst.i, k, wave: w, ...extra });
  if (regime === 'reduce') {
    if (w === 0) return parts.map((p, a) => ({ custom_id: id(0, a), params: req(REDUCE_SYSTEM, SCHEMA.partial, head(c, k, a, p)), meta: meta({ kind: 'partial', agent: a }) }));
    const partials = parts.map((p, a) => `Agent ${a} (shards ${p.first} to ${p.first + p.shards.length - 1}): ${clip(outputs.get(id(0, a))?.output?.partial, 400) || '[no report]'}`).join('\n');
    return [{ custom_id: id(1, 'm'), params: req(MERGE_SYSTEM, SCHEMA.answer, `${statement(c)}\n\nThe data is in ${c.M} shards held by ${k} agents. Their reports:\n\n${partials}`), meta: meta({ kind: 'answer', agent: 'm' }) }];
  }
  const board = (wv) => parts.map((_, a) => `Agent ${a}: ${clip(outputs.get(id(wv, a))?.output?.note, 1200) || '[no note]'}`).join('\n');
  if (w === 0) return parts.map((p, a) => ({ custom_id: id(0, a), params: req(BOARD_SYSTEM, SCHEMA.note, head(c, k, a, p)), meta: meta({ kind: 'note', agent: a }) }));
  if (w === 1) return parts.map((p, a) => ({ custom_id: id(1, a), params: req(BOARD_SYSTEM, SCHEMA.note, `${head(c, k, a, p)}\n\nNotes of the previous round:\n\n${board(0)}`), meta: meta({ kind: 'note', agent: a }) }));
  return parts.map((p, a) => ({ custom_id: id(2, a), params: req(FINAL_SYSTEM, SCHEMA.answer, `${head(c, k, a, p)}\n\nNotes of the previous round:\n\n${board(1)}`), meta: meta({ kind: 'answer', agent: a }) }));
}

// The collective's answer from the outputs of its last wave.
export function answerOf(c, inst, k, outputs) {
  const regime = REGIME_OF(c.task), last = WAVES_OF[regime] - 1, ids = regime === 'reduce' ? ['m'] : Array.from({ length: k }, (_, a) => a);
  const answers = ids.map((a) => outputs.get(callId(c.task, c.M, inst.i, k, last, a))?.output?.answer).filter(Number.isInteger);
  const count = new Map(); for (const x of answers) count.set(x, (count.get(x) || 0) + 1);
  const ranked = [...count].sort((x, y) => y[1] - x[1]), answer = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;
  return { answer, right: answer === inst.answer, agentsRight: answers.filter((x) => x === inst.answer).length, agentsAnswering: answers.length };
}
