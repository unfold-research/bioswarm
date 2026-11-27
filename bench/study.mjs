export const bioArm = 'stigwait-tiebreak';
export const ratesPerMillion = { uncachedInput: 2, cachedInput: 0.1, cacheCreation: 2.5, output: 10 };
export function pricedUsage(tokens) {
  return Object.entries(ratesPerMillion).reduce((sum, [name, rate]) => sum + tokens[name] * rate, 0) / 1e6;
}
// Union of completed turn intervals: exclude queueing and gaps, count concurrent work once.
export function observedSeconds(turns) {
  const sorted = turns
    .filter((t) => t.completed_at)
    .map((t) => [Date.parse(t.started_at), Date.parse(t.completed_at)])
    .sort((a, b) => a[0] - b[0]);
  let end = 0,
    milliseconds = 0;
  for (const [start, stop] of sorted) {
    milliseconds += Math.max(0, stop - Math.max(start, end));
    end = Math.max(end, stop);
  }
  return milliseconds / 1000;
}
export function decision(a, c, lowerIsBetter = true) {
  if (a.length !== 3 || c.length !== 3 || ![...a, ...c].every(Number.isFinite)) return 'inconclusiva';
  const deltas = a.map((v, i) => (lowerIsBetter ? 1 : -1) * (v - c[i])).sort((x, y) => x - y);
  if (!lowerIsBetter && deltas.filter((v) => v === 0).length >= 2) return 'sem separação';
  if (deltas[1] <= 0) return 'refutada';
  if (deltas[0] > 0 && deltas[1] > Math.max(...a) - Math.min(...a)) return 'sustentada';
  return 'inconclusiva';
}
