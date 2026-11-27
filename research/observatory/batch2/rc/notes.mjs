// GN1 notes between cases (tasks/GN1-MEMORY-PREREG.md, build B3). Arms:
//   none      no notes
//   notebook  (FLD-04) each member writes at most NOTE_TOKENS for itself; in the next case its own notes are shown in
//             every member request under "Your notes from the previous case"
//   library   (FLD-03) each member writes at most NOTE_TOKENS for the team, each line tagged with the module it is about
//             ("M12: ..."); in the next case a member is shown the lines about its own module written by anyone, ordered
//             by author module ascending, cut at NOTE_TOKENS
// Every cut is token-counted (the free count_tokens endpoint in a real run, bytes / 3 offline) at a word boundary, and
// recorded: { text, tokens, rawTokens, cut, counter }.
export const NOTE_TOKENS = 300;
export const NOTE_ARMS = ['notebook', 'library'];
export const NOTES_SCHEMA = { type: 'object', properties: { notes: { type: 'string' } }, required: ['notes'], additionalProperties: false };
const mod = (i) => `M${i + 1}`;

// counters: async (text) => tokens, with a label recorded next to every cut
export const bytesCounter = Object.assign(async (t) => Math.ceil(Buffer.byteLength(String(t)) / 3), { label: 'bytes/3' });
// the tokens of a text alone: count_tokens of a one-message request minus that of a one-character message, plus one
export function apiCounter(countTokens, model) {
  const cache = new Map(); let base = null;
  const once = (t) => { if (!cache.has(t)) cache.set(t, Promise.resolve(countTokens({ model, messages: [{ role: 'user', content: t }] }))); return cache.get(t); };
  return Object.assign(async (t) => { t = String(t); if (!t) return 0; base ??= (await once('.')) - 1; return Math.max(0, (await once(t)) - base); }, { label: 'count_tokens' });
}

// The longest word-boundary prefix of text within max tokens (the whole text when it fits).
export async function cutToTokens(text, max, count) {
  text = String(text ?? '').trim();
  const rawTokens = await count(text);
  if (rawTokens <= max) return { text, tokens: rawTokens, rawTokens, cut: false, counter: count.label || 'custom' };
  const parts = text.split(/(?=\s)/); // each part starts at a whitespace run, so a prefix of parts ends at a word boundary
  let lo = 0, hi = parts.length - 1, best = '', bestTok = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, t = parts.slice(0, mid).join('').trimEnd(), n = await count(t);
    if (n <= max) { best = t; bestTok = n; lo = mid + 1; } else hi = mid - 1;
  }
  return { text: best, tokens: bestTok, rawTokens, cut: true, counter: count.label || 'custom' };
}

// Library lines: "M12: ..." (also "- M12: ...", "[M12] ...", "M12 - ..."); untagged lines and unknown modules are dropped.
const TAG = /^\s*(?:[-*•]\s*)?(?:\[M(\d+)\]\s*[:\-–—]?|M(\d+)\s*[:\-–—])\s*(.*\S)\s*$/;
export function parseLibrary(text, k) {
  const lines = [], dropped = [];
  for (const l of String(text || '').split('\n')) {
    if (!l.trim()) continue;
    const x = l.match(TAG), n = x ? Number(x[1] ?? x[2]) : 0;
    if (n >= 1 && n <= k) lines.push({ about: n - 1, text: l.trim() }); else dropped.push(l.trim());
  }
  return { lines, dropped };
}
// What reader m sees in the library arm: every author's (already write-cut) lines about module m, author ascending,
// lines in the order written, then cut at max tokens.
export async function libraryRead(written, m, k, max, count) {
  const lines = [];
  for (let a = 0; a < k; a++) for (const l of parseLibrary(written[a]?.text, k).lines) if (l.about === m) lines.push({ author: a, text: l.text });
  const cut = await cutToTokens(lines.map((l) => l.text).join('\n'), max, count);
  return { ...cut, authors: [...new Set(lines.map((l) => l.author))], lines: lines.length };
}

// At most the last SEEN_MAX failing checks a member saw go into its note request, the same in every arm (implementation
// choice fixed before the data, 2026-11-23); the runner records per member how many were left out.
export const SEEN_MAX = 40;
// The extra request each member gets at the end of a case: its specification, final code and the checks it saw fail.
// prior: the notes the member read during that case (after case 2: the case-1 notes of the same arm; notebook its own,
// library the lines about its module cut at NOTE_TOKENS), shown in the same block as in its member requests (fixed before
// the data, 2026-11-23); null when it read none (after case 1).
export function noteRequest(model, inst, m, code, seen, arm, maxTokens, effort = null, prior = null) {
  const failed = seen.length ? seen.map((t) => `- ${t}`).join('\n') : '(none)';
  const notes = prior != null ? notesBlock(arm, prior) : '';
  let t = `You are the developer of module ${mod(m)} in a small JavaScript codebase written by ${inst.k} developers, one module each. This case of the codebase is finished.\nYour module had to provide:\n${inst.specs[m].map((x) => `- ${x}`).join('\n')}\n${notes}--- your final code of ${mod(m)} ---\n${code[m] || '(empty)'}\nChecks involving your module that you saw fail during this case:\n${failed}\n`;
  if (arm === 'notebook') t += `You will also work on the next case of the same codebase. Write notes for yourself, to be shown to you in every request of that case: what you learned in this case that would help you get your module right the first time. At most ${NOTE_TOKENS} tokens; longer notes are cut. Return them in "notes".`;
  else if (arm === 'library') t += `You and the other developers will also work on the next case of the same codebase. Write notes for the team: every line must start with the module it is about, e.g. "M12: ...". In the next case each developer is shown only the lines about their own module, from every developer. At most ${NOTE_TOKENS} tokens in all; longer notes are cut. Return them in "notes".`;
  else throw Error(`no notes in arm ${arm}`);
  return { model, max_tokens: maxTokens, output_config: { format: { type: 'json_schema', schema: NOTES_SCHEMA }, ...(effort ? { effort } : {}) }, messages: [{ role: 'user', content: t }] };
}

// The notes block of a member request in the next case, placed before the member's current code.
export const NOTES_HEAD = { notebook: 'Your notes from the previous case', library: 'Team notes about your module from the previous case (lines about your module written by any developer)' };
const notesBlock = (arm, text) => { if (!NOTE_ARMS.includes(arm)) throw Error(`no notes in arm ${arm}`); return `${NOTES_HEAD[arm]}:\n${text && text.trim() ? text.trim() : '(none)'}\n`; };
export function withNotes(params, m, arm, text) {
  if (!NOTE_ARMS.includes(arm)) return params;
  const block = notesBlock(arm, text), marker = `--- current code of ${mod(m)} ---\n`, content = params.messages[0].content;
  if (!content.includes(marker)) throw Error('member request without its code marker');
  return { ...params, messages: [{ ...params.messages[0], content: content.replace(marker, block + marker) }] };
}
