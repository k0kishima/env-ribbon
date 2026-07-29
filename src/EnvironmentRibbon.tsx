import { detectEnvironmentVariant } from './detect.js';
import { EnvironmentRibbonClient } from './EnvironmentRibbonClient.js';

export interface EnvironmentRibbonProps {
  /**
   * Render this label unconditionally, bypassing auto-detection entirely —
   * including the production hard gate and the NODE_ENV=test guard. Use it on
   * non-Vercel hosts (Netlify, Cloudflare, self-hosted) where you decide what
   * to show; the responsibility for not shipping it to production is yours.
   *
   * The string is used as the label verbatim, with no casing applied.
   */
  variant?: string;

  /**
   * Variant name to background color, merged over the defaults
   * `{ LOCAL: '#22c55e', PREVIEW: '#facc15' }`.
   * Variants with no entry fall back to '#6b7280'.
   */
  colors?: Record<string, string>;

  /** @default 'top-right' */
  position?: 'top-right' | 'top-left';

  /** @default 60 */
  zIndex?: number;
}

/**
 * Server Component. Reads the environment on the server and hands only the
 * resolved variant string to the client, so `VERCEL_ENV` never has to be
 * exposed through a `NEXT_PUBLIC_*` variable.
 *
 * Mount it inside `<body>` of your root layout. It must stay in the server
 * tree — imported from a client component it cannot read the environment.
 */
export function EnvironmentRibbon({
  variant,
  colors,
  position,
  zIndex,
}: EnvironmentRibbonProps = {}) {
  const resolved =
    variant ??
    detectEnvironmentVariant({
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV,
    });

  if (resolved === null || resolved === undefined) return null;

  return (
    <EnvironmentRibbonClient
      variant={resolved}
      colors={colors}
      position={position}
      zIndex={zIndex}
    />
  );
}
