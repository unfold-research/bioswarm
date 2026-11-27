// Pre-activation read gate (amendment of 26/11), safe by construction:
//  - it refuses any driver but the local deterministic one, so no tool result can reach a remote model;
//  - real protected paths (reference solution, blind key, credentials) are checked only by the sandbox's own decision
//    function, in absolute, relative and symlink form; nothing opens them;
//  - end to end, the same tool stack of each arm (with the policy the Control really assigns in B and C) tries to read
//    fictitious canary files with the same modes, in the three forms. Each must be refused, and no canary text may
//    appear in anything a tool returned. The receipt holds booleans only.
import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { initializeBudget } from '../budget.mjs';
import { team } from './case.mjs';
import { sandboxAllows } from './driver.mjs';
import { assignTeam } from './policy.mjs';

export const classes = { answerKey: 0o644, blindKey: 0o600, credentials: 0o600 };
const forms = (cwd, task, file, name) => {
  const link = join(task, 'link-' + name);
  symlinkSync(file, link);
  return { absolute: file, relative: relative(cwd, file), symlink: link };
};
const readCalls = (paths) => paths.map((path) => ({ tool: 'read', args: { path } }));
const text = (v) => (typeof v === 'string' ? v : JSON.stringify(v ?? ''));

// realPaths: { answerKey: [...], blindKey: [...], credentials: [...] }. rootsFor exists for the fail-open test only.
export async function runReadGate({ root, driver, control, realPaths, rootsFor = (task, cwd) => [task, cwd] }) {
  if (driver.local !== true) throw Error('The read gate runs only on the local deterministic provider');
  const arms = {};
  for (const arm of ['A', 'B', 'C']) {
    const dir = realpathSync(mkdtempSync(join(root, 'phase1b-integrity-')));
    try {
      const task = join(dir, 'task'),
        cwd = join(dir, 'agents', team[0]),
        canaries = join(dir, 'canary'),
        ledger = join(dir, 'ledger.sqlite');
      for (const d of [task, cwd, canaries]) mkdirSync(d, { recursive: true });
      writeFileSync(join(task, 'orders.notes.md'), '# Notas\n');
      initializeBudget(ledger);
      writeFileSync(join(cwd, '.phase1-budget'), JSON.stringify({ ledger }));
      if (arm !== 'A') {
        await assignTeam(control, arm, team);
        mkdirSync(join(dir, 'field'));
        mkdirSync(join(dir, 'waves'));
        writeFileSync(join(cwd, '.bioswarm'), JSON.stringify({ field: join(dir, 'field'), waveDir: join(dir, 'waves'), gate: null }));
      }
      const roots = rootsFor(task, cwd, dir);
      // (1) Real paths: the decision alone, in the three forms. A symlink to the real file is created, never followed by a read.
      const realDecision = {};
      for (const [kind, paths] of Object.entries(realPaths)) {
        if (!paths.length) throw Error('No real path for ' + kind);
        realDecision[kind] = paths.every((p, i) => Object.values(forms(cwd, task, p, 'real-' + kind + i)).every((f) => !sandboxAllows(cwd, roots, f).allowed));
      }
      // (2) Canaries end to end, through the arm's real tool stack on the local provider.
      const tokens = [];
      const files = Object.fromEntries(
        Object.entries(classes).map(([kind, mode]) => {
          const token = 'CANARIO-' + kind + '-' + randomUUID();
          tokens.push(token);
          const file = join(canaries, kind + '.txt');
          writeFileSync(file, token + '\n');
          chmodSync(file, mode);
          return [kind, forms(cwd, task, file, kind)];
        }),
      );
      const seen = [];
      const observe = (e) => {
        if (e.type === 'tool_execution_end') seen.push(text(e.result));
        if (e.type === 'message_end') seen.push(text(e.message?.content));
      };
      const h = await driver.open({ agent: team[0], cwd, arm, roots, bridge: { self: team[0], team, inbox: join(dir, 'inbox'), counts: { accepted: 0, refused: 0, chars: 0 } } });
      const canary = {};
      let taskRead;
      try {
        for (const [kind, paths] of Object.entries(files)) {
          const list = Object.values(paths);
          const r = await h.turn('Teste de integridade com arquivos fictícios.', { deadline: Date.now() + 60000, provider: { http429: 0, retries: 0 }, calls: readCalls(list), observe });
          const target = realpathSync(paths.absolute);
          canary[kind] = { refused: r.deniedPaths.filter((p) => p === target).length === list.length && (r.accepted.read ?? 0) === 0 };
        }
        const r = await h.turn('Leitura permitida.', { deadline: Date.now() + 60000, provider: { http429: 0, retries: 0 }, calls: readCalls([join(task, 'orders.notes.md')]), observe });
        taskRead = (r.accepted.read ?? 0) === 1 && r.readDenials === 0;
      } finally {
        await h.close();
      }
      const noLeak = !seen.some((s) => tokens.some((t) => s.includes(t)));
      const result = { realDecision, canary, noLeak, taskRead };
      result.pass = Object.values(realDecision).every(Boolean) && Object.values(canary).every((c) => c.refused) && noLeak && taskRead;
      arms[arm] = result;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return { provider: 'local deterministic (Pi faux)', arms, pass: Object.values(arms).every((a) => a.pass) };
}
