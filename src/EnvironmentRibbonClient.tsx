"use client";

import { useState, type CSSProperties } from 'react';

/** Background colors for the auto-detected variants. */
const DEFAULT_COLORS: Record<string, string> = {
  LOCAL: '#22c55e',
  PREVIEW: '#facc15',
};

/** Used for any variant that has no color mapping (e.g. an explicit "STAGING"). */
const FALLBACK_COLOR = '#6b7280';

const CLASS_NAME = 'env-ribbon';

/**
 * Media queries and pseudo-classes cannot be expressed in the inline `style`
 * attribute, so these two rules live in a `<style>` tag instead:
 *
 * - `@media print` keeps the ribbon off printed pages.
 * - `:focus-visible` keeps keyboard focus visible.
 *
 * The expected usage is one ribbon per app, so there is no dedup mechanism.
 * If several instances mount, the duplicated `<style>` tags are harmless.
 */
const STYLE_RULES = `
.${CLASS_NAME}:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media print{.${CLASS_NAME}{display:none}}
`;

export interface EnvironmentRibbonClientProps {
  /** Label rendered on the ribbon, verbatim. */
  variant: string;
  colors?: Record<string, string>;
  position?: 'top-right' | 'top-left';
  zIndex?: number;
}

export function EnvironmentRibbonClient({
  variant,
  colors,
  position = 'top-right',
  zIndex = 60,
}: EnvironmentRibbonClientProps) {
  // Dismiss state lives in React memory only — a reload brings the ribbon back.
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isLeft = position === 'top-left';
  const background = { ...DEFAULT_COLORS, ...colors }[variant] ?? FALLBACK_COLOR;

  // Hit area and clipping box for the diagonal band.
  const buttonStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    ...(isLeft ? { left: 0 } : { right: 0 }),
    width: 96,
    height: 96,
    overflow: 'hidden',
    background: 'transparent',
    border: 0,
    padding: 0,
    cursor: 'pointer',
    zIndex,
  };

  const bandStyle: CSSProperties = {
    position: 'absolute',
    top: 18,
    ...(isLeft ? { left: -36 } : { right: -36 }),
    width: 140,
    transform: isLeft ? 'rotate(-45deg)' : 'rotate(45deg)',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    padding: '4px 0',
    // White on yellow is weak on contrast, but it matches the established
    // deploy-preview ribbon convention.
    color: '#fff',
    background,
  };

  return (
    <>
      <style>{STYLE_RULES}</style>
      {/* A real <button> gives keyboard dismissal (Enter / Space) for free. */}
      <button
        type="button"
        className={CLASS_NAME}
        data-testid="environment-ribbon"
        aria-label={`Dismiss ${variant} environment indicator`}
        onClick={() => setDismissed(true)}
        style={buttonStyle}
      >
        <span style={bandStyle}>{variant}</span>
      </button>
    </>
  );
}
