import { describe, expect, it } from 'vitest';
import {
  detectEnvironmentVariant,
  type DetectedVariant,
  type EnvSignals,
} from '../src/detect.js';

type Case = EnvSignals & { expected: DetectedVariant | null; why: string };

const cases: Case[] = [
  // 1. Production hard gate — wins over everything else.
  { vercelEnv: 'production', nodeEnv: 'production', expected: null, why: 'Vercel production' },
  { vercelEnv: 'production', nodeEnv: 'development', expected: null, why: 'production gate beats NODE_ENV' },
  { vercelEnv: 'production', nodeEnv: 'test', expected: null, why: 'production gate with NODE_ENV=test' },

  // 2. Test guard — keeps the ribbon out of E2E runs.
  { vercelEnv: undefined, nodeEnv: 'test', expected: null, why: 'local test run' },
  { vercelEnv: 'development', nodeEnv: 'test', expected: null, why: 'vercel dev test run' },
  { vercelEnv: 'preview', nodeEnv: 'test', expected: null, why: 'test guard beats preview' },

  // 3. Preview — note that Vercel preview builds run with NODE_ENV=production.
  { vercelEnv: 'preview', nodeEnv: 'production', expected: 'PREVIEW', why: 'Vercel preview build (NODE_ENV=production)' },
  { vercelEnv: 'preview', nodeEnv: 'development', expected: 'PREVIEW', why: 'preview with dev NODE_ENV' },
  { vercelEnv: 'preview', nodeEnv: undefined, expected: 'PREVIEW', why: 'preview with no NODE_ENV' },

  // 4. Local.
  { vercelEnv: undefined, nodeEnv: 'development', expected: 'LOCAL', why: 'plain local dev server' },
  { vercelEnv: 'development', nodeEnv: 'development', expected: 'LOCAL', why: '`vercel dev`' },
  { vercelEnv: undefined, nodeEnv: undefined, expected: 'LOCAL', why: 'no signals at all' },
  { vercelEnv: 'development', nodeEnv: undefined, expected: 'LOCAL', why: 'vercel dev, no NODE_ENV' },

  // 5. Fail-safe.
  { vercelEnv: undefined, nodeEnv: 'production', expected: null, why: 'self-hosted production build' },
  { vercelEnv: 'development', nodeEnv: 'production', expected: null, why: 'VERCEL_ENV=development on a production build' },
  { vercelEnv: 'staging', nodeEnv: 'production', expected: null, why: 'unknown VERCEL_ENV value' },
  { vercelEnv: 'staging', nodeEnv: 'development', expected: null, why: 'unknown VERCEL_ENV value in dev' },
  { vercelEnv: '', nodeEnv: 'development', expected: null, why: 'empty VERCEL_ENV is not undefined' },
];

describe('detectEnvironmentVariant', () => {
  it.each(cases)(
    'returns $expected when VERCEL_ENV=$vercelEnv, NODE_ENV=$nodeEnv ($why)',
    ({ vercelEnv, nodeEnv, expected }) => {
      expect(detectEnvironmentVariant({ vercelEnv, nodeEnv })).toBe(expected);
    },
  );

  it('shows PREVIEW even though a Vercel preview build reports NODE_ENV=production', () => {
    expect(detectEnvironmentVariant({ vercelEnv: 'preview', nodeEnv: 'production' })).toBe('PREVIEW');
  });

  it('shows nothing on a self-hosted production build (no VERCEL_ENV, NODE_ENV=production)', () => {
    expect(detectEnvironmentVariant({ vercelEnv: undefined, nodeEnv: 'production' })).toBeNull();
  });

  it('accepts an empty signals object', () => {
    expect(detectEnvironmentVariant({})).toBe('LOCAL');
  });
});
