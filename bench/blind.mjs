// Apply the preregistered masking list before any memo enters the blind packet.
export function blindMemo(original, agentLabels) {
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const groups = [
    [
      'path',
      /(?:file:\/\/\/|[a-z]:[\\/]|~\/|\.{1,2}\/|(?<![\p{L}\d])\/(?!\/))[^\s"'\x60<>)]*|(?:[\w.-]+\/)+[\w.-]+\.(?:csv|md|json|sqlite)\b/giu,
    ],
    ['bridge', /\bmcp__openbot_[\w]+\b|\b(?:openbot[._])?(?:send_message|leave_mark|read_marks)\b/gi],
    ['team', /\bagent-[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}\b/gi],
    [
      'treatment',
      /\b(?:BioSwarm|OpenBot|stigwait(?:[-_ ]tiebreak)?|tie[-_ ]?break|community|comunitári[ao]|baseline|braço\s+[ABC]|arm\s+[ABC]|campos?|marcas?|rastros?|pontes?|field|marks?|traces?|bridge)\b/giu,
    ],
  ];
  const labels = agentLabels
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escape);
  if (labels.length)
    groups.push(['team', new RegExp('(?<![\\p{L}\\d_])(?:' + labels.join('|') + ')(?![\\p{L}\\d_])', 'giu')]);
  const matches = [];
  for (const [kind, regex] of groups) {
    for (const m of original.matchAll(regex)) matches.push({ kind, offset: m.index, length: m[0].length });
  }
  matches.sort((a, b) => a.offset - b.offset || b.length - a.length);
  let text = '',
    cursor = 0;
  const removals = [];
  for (const m of matches) {
    if (m.offset + m.length <= cursor) continue;
    if (m.offset < cursor) {
      cursor = m.offset + m.length;
      removals.at(-1).length = cursor - removals.at(-1).offset;
      continue;
    }
    text += original.slice(cursor, m.offset) + '[referência omitida]';
    cursor = m.offset + m.length;
    removals.push({ ...m });
  }
  return { text: text + original.slice(cursor), removals };
}
