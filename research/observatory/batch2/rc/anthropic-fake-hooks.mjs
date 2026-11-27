// Module hook for tests: resolves library/cards/batch-api.mjs to anthropic-fake.mjs (node --import this file).
import { register } from 'node:module';
if (!globalThis.__rcFakeHooks) { globalThis.__rcFakeHooks = true; register(new URL(import.meta.url)); }
const FAKE = new URL('./anthropic-fake.mjs', import.meta.url).href;
export async function resolve(specifier, context, next) { if (specifier.endsWith('/library/cards/batch-api.mjs')) return { url: FAKE, shortCircuit: true }; return next(specifier, context); }
