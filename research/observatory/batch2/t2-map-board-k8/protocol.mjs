// T2 stage B, the map: regime board, k = 8. See ../t2-map/protocol.mjs; analysis in ../t2-map/analyze.mjs.
import { study } from "../t2-map/protocol.mjs";
export { MAX_REQUEST_BYTES } from "../t2-map/protocol.mjs";
export const { ID, TITLE, PREREG, WAVES, CONTROLS, wave, ceiling, score, gate, summarize } = study("board", 8);
