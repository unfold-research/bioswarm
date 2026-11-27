// D5, decay rate lambda = 1, short horizon. See ../d5-decay/protocol.mjs; analysis in ../d5-decay/analyze.mjs.
import * as base from '../d5-decay/protocol.mjs';
const s = base.study('d5-decay-l100', { lambda: 1, horizon: 'short', seeds: base.range(61001, 150) });
export const { ID, TITLE, PREREG, WAVES, CONTROLS, SPEC, wave, ceiling, score, gate, summarize } = s;
