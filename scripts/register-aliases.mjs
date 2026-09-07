// Resolves the "@/..." path alias for plain Node processes (unit tests and the
// database seed) so they can import application modules without a bundler.
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve(import.meta.dirname, '..', 'src');
const CANDIDATES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolveAlias(specifier) {
  const base = path.join(srcRoot, specifier.slice(2));
  for (const suffix of CANDIDATES) {
    const candidate = `${base}${suffix}`;
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      return pathToFileURL(candidate).href;
    }
  }
  return pathToFileURL(`${base}.ts`).href;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return { url: resolveAlias(specifier), shortCircuit: true };
    }
    if (specifier === 'server-only') {
      return {
        url: pathToFileURL(path.join(import.meta.dirname, 'stubs', 'server-only.js')).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});
