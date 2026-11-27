// Tool containment for the direct Pi smoke. Loaded first, so it decides before any other tool_call handler.
// Only the listed tools run; read and write reach only the attempt's allowed folders. Paths are resolved with
// Pi's own resolver (pinned 1.5.2: @ prefix, ~, file://, relative to cwd) plus the name variants Pi's read tries,
// then checked through real paths: folders are followed to where they really are, a symlink as the file itself or
// any path that cannot be checked is refused.
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const piRoot = dirname(dirname(fileURLToPath(import.meta.resolve('@earendil-works/pi-coding-agent'))));
const { resolvePath } = await import(pathToFileURL(join(piRoot, 'dist', 'utils', 'paths.js')).href);
const options = { normalizeUnicodeSpaces: true, stripAtPrefix: true };

// Same candidates as Pi's resolveReadPath: AM/PM narrow space, NFD, curly quote, NFD + curly quote.
const variants = (p) => {
  const nfd = p.normalize('NFD');
  return [...new Set([p, p.replace(/ (AM|PM)\./gi, ' $1.'), nfd, p.replace(/'/g, '’'), nfd.replace(/'/g, '’')])];
};

const inside = (child, root) => {
  const r = relative(root, child);
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
};

// Real location of a path that may not exist yet. No component of it may be a symlink.
export function realTarget(path) {
  let probe = path;
  const rest = [];
  for (;;) {
    const stat = lstatSync(probe, { throwIfNoEntry: false });
    if (stat) {
      if (stat.isSymbolicLink()) return null;
      break;
    }
    if (dirname(probe) === probe) return null;
    rest.unshift(basename(probe));
    probe = dirname(probe);
  }
  // Symlinked folders on the way are followed here, so the root check below sees where the file really lands.
  return join(realpathSync(probe), ...rest);
}

export function allowedPath(raw, cwd, roots) {
  if (typeof raw !== 'string' || !raw.trim() || raw.includes('\0')) return false;
  let resolved;
  try {
    resolved = resolvePath(raw, cwd, options);
  } catch {
    return false;
  }
  const realRoots = roots.map((r) => realpathSync(r));
  return variants(resolved).every((candidate) => {
    let target;
    try {
      target = realTarget(candidate);
    } catch {
      return false;
    }
    return target !== null && realRoots.some((root) => inside(target, root));
  });
}

export function installJail(pi, cwd = process.cwd()) {
  const marker = join(cwd, '.phase1-jail');
  if (!existsSync(marker)) return;
  const { tools, read, write } = JSON.parse(readFileSync(marker, 'utf8'));
  const refuse = (reason) => ({ block: true, reason });
  pi.on('tool_call', (event) => {
    const name = event.toolName;
    if (!tools.includes(name)) return refuse('This tool is not available in this task.');
    if (name === 'read' && !allowedPath(event.input?.path, cwd, read))
      return refuse('Reading is limited to the task folder.');
    if (name === 'write' && !allowedPath(event.input?.path, cwd, write))
      return refuse('Writing is limited to the task folder.');
    return undefined;
  });
}
export default installJail;
