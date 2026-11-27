// HTTP bootstrap for the remote SDK modes (BenchHost activation of 26/11). The Pi CLI installs its undici dispatcher
// before any model call (dist/main.js); a bare SDK session does not, and on BenchHost it then failed to connect. This
// installs the same dispatcher of the pinned Pi 1.5.2 once per process: EnvHttpProxyAgent, so TLS and the launcher's
// HTTPS_PROXY / NO_PROXY apply unchanged, the same for every arm.
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const piRoot = dirname(dirname(fileURLToPath(import.meta.resolve('@earendil-works/pi-coding-agent'))));
export const dispatcherModule = join(piRoot, 'dist', 'core', 'http-dispatcher.js');
let configured = false;

export async function bootstrapHttp({ load = () => import(pathToFileURL(dispatcherModule).href) } = {}) {
  if (configured) return false;
  const { configureHttpDispatcher } = await load();
  configureHttpDispatcher(); // the CLI's default idle timeout (300 s)
  configured = true;
  return true;
}
