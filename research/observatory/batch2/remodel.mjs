// Replication of a Haiku study on Claude Sonnet 5.5. Sonnet 5.5 rejects `thinking: {type: "disabled"}`, so the request omits
// `thinking` (adaptive thinking is on), sets effort low and raises max_tokens so that thinking tokens do not truncate the JSON.
export const SONNET = 'claude-sonnet-5-5';
export const toSonnet = (rows) => rows.map((q) => { const { thinking, ...p } = q.params; return { ...q, params: { ...p, model: SONNET, max_tokens: 2048, output_config: { ...p.output_config, effort: 'low' } } }; });
