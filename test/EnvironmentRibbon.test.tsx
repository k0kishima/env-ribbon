import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnvironmentRibbon } from '../src/EnvironmentRibbon.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

function label(): string | null {
  return screen.queryByTestId('environment-ribbon')?.textContent ?? null;
}

describe('EnvironmentRibbon', () => {
  it('renders LOCAL on a local dev server', () => {
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('NODE_ENV', 'development');

    render(<EnvironmentRibbon />);

    expect(label()).toBe('LOCAL');
  });

  it('renders PREVIEW on a Vercel preview deployment', () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('NODE_ENV', 'production');

    render(<EnvironmentRibbon />);

    expect(label()).toBe('PREVIEW');
  });

  it('renders nothing on a production deployment', () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');

    const { container } = render(<EnvironmentRibbon />);

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing under NODE_ENV=test', () => {
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('NODE_ENV', 'test');

    const { container } = render(<EnvironmentRibbon />);

    expect(container.innerHTML).toBe('');
  });

  it('renders an explicit variant even where auto-detection would stay silent', () => {
    // The variant prop bypasses detection entirely, production gate included:
    // the caller takes over responsibility for what gets shown.
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');

    render(<EnvironmentRibbon variant="STAGING" />);

    expect(label()).toBe('STAGING');
  });

  it('passes presentation props through to the rendered ribbon', () => {
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('NODE_ENV', 'development');

    render(<EnvironmentRibbon position="top-left" zIndex={10} colors={{ LOCAL: '#000000' }} />);
    const ribbon = screen.getByTestId('environment-ribbon');

    expect(ribbon.style.left).toBe('0px');
    expect(ribbon.style.zIndex).toBe('10');
    expect((ribbon.querySelector('span') as HTMLElement).style.background).not.toBe('');
  });
});
