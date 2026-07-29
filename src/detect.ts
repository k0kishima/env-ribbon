/**
 * Platform-agnostic environment detection.
 *
 * This module has zero dependencies and never touches `process.env` itself:
 * callers pass the signals in. That keeps it reusable from any runtime
 * (Next.js server, plain Node, React Native, tests).
 */

export type DetectedVariant = 'LOCAL' | 'PREVIEW';

export interface EnvSignals {
  /** `process.env.VERCEL_ENV` — 'production' | 'preview' | 'development' on Vercel, undefined elsewhere. */
  vercelEnv?: string;
  /** `process.env.NODE_ENV` */
  nodeEnv?: string;
}

/**
 * Decide which ribbon (if any) should be shown for the given environment.
 *
 * Returns `null` whenever the environment cannot be positively identified as
 * local or preview — showing nothing is always the safe outcome.
 */
export function detectEnvironmentVariant(signals: EnvSignals): DetectedVariant | null {
  const { vercelEnv, nodeEnv } = signals;

  // Hard gate: never render on a production deployment.
  if (vercelEnv === 'production') return null;

  // Keep the ribbon out of E2E runs (Playwright et al.).
  if (nodeEnv === 'test') return null;

  // Vercel preview builds run with NODE_ENV === 'production', so NODE_ENV must
  // not take part in this branch: VERCEL_ENV is the only signal that tells
  // preview and production apart.
  if (vercelEnv === 'preview') return 'PREVIEW';

  // The NODE_ENV guard matters for self-hosted / non-Vercel production builds,
  // which have no VERCEL_ENV at all: without it they would be labelled LOCAL.
  if ((vercelEnv === 'development' || vercelEnv === undefined) && nodeEnv !== 'production') {
    return 'LOCAL';
  }

  // Fail-safe: unknown environment renders nothing.
  return null;
}
