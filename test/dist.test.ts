// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the build output. Losing the "use client" directive (a classic
 * side effect of switching to a bundler) breaks consumers at runtime with an
 * error that is hard to trace back to this package, so it is asserted here.
 *
 * `pnpm test` runs the build first — see the test script in package.json.
 */
function dist(file: string): string {
  return readFileSync(resolve(process.cwd(), 'dist', file), 'utf8');
}

describe('build output', () => {
  it('keeps "use client" on the first line of the client component', () => {
    const firstLine = dist('EnvironmentRibbonClient.js').split('\n')[0]?.trim();

    expect(firstLine).toBe('"use client";');
  });

  it('does not mark the server component as a client component', () => {
    expect(dist('EnvironmentRibbon.js')).not.toContain('use client');
  });

  it('emits ESM', () => {
    expect(dist('index.js')).toContain('export ');
    expect(dist('index.js')).not.toContain('require(');
  });

  it('emits type declarations for both entry points', () => {
    expect(dist('index.d.ts')).toContain('EnvironmentRibbon');
    expect(dist('detect.d.ts')).toContain('detectEnvironmentVariant');
  });

  it('keeps detect.js free of imports and of environment access', () => {
    // Comments stripped: detect.ts documents `process.env.*` in its JSDoc, but
    // must never read it — that is what makes it reusable off Node.
    const detect = dist('detect.js')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    expect(detect).not.toMatch(/\bprocess\.env\b/);
    expect(detect).not.toMatch(/^\s*import\b/m);
    expect(detect).not.toMatch(/\brequire\(/);
  });
});
