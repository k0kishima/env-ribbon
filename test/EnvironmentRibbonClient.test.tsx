import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { EnvironmentRibbonClient } from '../src/EnvironmentRibbonClient.js';

/**
 * Run a CSS value through jsdom the same way the rendered element did, so the
 * assertions do not depend on how jsdom normalizes colors or lengths.
 */
function css(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  const normalized = probe.style.getPropertyValue(property);
  if (normalized === '') throw new Error(`jsdom did not accept ${property}: ${value}`);
  return normalized;
}

function ribbon() {
  return screen.getByTestId('environment-ribbon');
}

function band(): HTMLElement {
  const span = ribbon().querySelector('span');
  if (span === null) throw new Error('ribbon band not found');
  return span as HTMLElement;
}

describe('EnvironmentRibbonClient', () => {
  it('renders the variant as its label', () => {
    render(<EnvironmentRibbonClient variant="LOCAL" />);

    expect(ribbon()).toBeTruthy();
    expect(band().textContent).toBe('LOCAL');
  });

  it('renders an accessible dismiss button', () => {
    render(<EnvironmentRibbonClient variant="PREVIEW" />);

    expect(ribbon().tagName).toBe('BUTTON');
    expect(ribbon().getAttribute('type')).toBe('button');
    expect(ribbon().getAttribute('aria-label')).toBe('Dismiss PREVIEW environment indicator');
  });

  describe('dismissing', () => {
    it('disappears when clicked', async () => {
      const user = userEvent.setup();
      render(<EnvironmentRibbonClient variant="LOCAL" />);

      await user.click(ribbon());

      expect(screen.queryByTestId('environment-ribbon')).toBeNull();
    });

    it('disappears on Enter', async () => {
      const user = userEvent.setup();
      render(<EnvironmentRibbonClient variant="LOCAL" />);

      ribbon().focus();
      await user.keyboard('{Enter}');

      expect(screen.queryByTestId('environment-ribbon')).toBeNull();
    });

    it('disappears on Space', async () => {
      const user = userEvent.setup();
      render(<EnvironmentRibbonClient variant="LOCAL" />);

      ribbon().focus();
      await user.keyboard('[Space]');

      expect(screen.queryByTestId('environment-ribbon')).toBeNull();
    });

    it('comes back on a fresh mount, because the state is not persisted', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<EnvironmentRibbonClient variant="LOCAL" />);
      await user.click(ribbon());
      unmount();

      render(<EnvironmentRibbonClient variant="LOCAL" />);

      expect(screen.queryByTestId('environment-ribbon')).not.toBeNull();
    });
  });

  it('uses the label verbatim, without casing changes', () => {
    render(<EnvironmentRibbonClient variant="staging" />);

    expect(band().textContent).toBe('staging');
    expect(ribbon().getAttribute('aria-label')).toBe('Dismiss staging environment indicator');
  });

  describe('colors', () => {
    it('defaults to green for LOCAL and yellow for PREVIEW', () => {
      const { unmount } = render(<EnvironmentRibbonClient variant="LOCAL" />);
      expect(band().style.background).toBe(css('background', '#22c55e'));
      unmount();

      render(<EnvironmentRibbonClient variant="PREVIEW" />);
      expect(band().style.background).toBe(css('background', '#facc15'));
    });

    it('falls back to grey for an unmapped variant', () => {
      render(<EnvironmentRibbonClient variant="STAGING" />);

      expect(band().style.background).toBe(css('background', '#6b7280'));
    });

    it('merges the colors prop over the defaults', () => {
      render(<EnvironmentRibbonClient variant="STAGING" colors={{ STAGING: '#0ea5e9' }} />);

      expect(band().style.background).toBe(css('background', '#0ea5e9'));
    });

    it('lets the colors prop override a default', () => {
      render(<EnvironmentRibbonClient variant="PREVIEW" colors={{ PREVIEW: '#ff0000' }} />);

      expect(band().style.background).toBe(css('background', '#ff0000'));
    });

    it('always writes the label in white', () => {
      render(<EnvironmentRibbonClient variant="PREVIEW" />);

      expect(band().style.color).toBe(css('color', '#fff'));
    });
  });

  describe('position', () => {
    it('anchors to the top right by default', () => {
      render(<EnvironmentRibbonClient variant="LOCAL" />);

      expect(ribbon().style.right).toBe('0px');
      expect(ribbon().style.left).toBe('');
      expect(band().style.right).toBe('-36px');
      expect(band().style.transform).toBe('rotate(45deg)');
    });

    it('mirrors to the top left when asked', () => {
      render(<EnvironmentRibbonClient variant="LOCAL" position="top-left" />);

      expect(ribbon().style.left).toBe('0px');
      expect(ribbon().style.right).toBe('');
      expect(band().style.left).toBe('-36px');
      expect(band().style.transform).toBe('rotate(-45deg)');
    });

    it('keeps the fixed 96x96 hit area', () => {
      render(<EnvironmentRibbonClient variant="LOCAL" />);

      expect(ribbon().style.position).toBe('fixed');
      expect(ribbon().style.top).toBe('0px');
      expect(ribbon().style.width).toBe('96px');
      expect(ribbon().style.height).toBe('96px');
      expect(ribbon().style.overflow).toBe('hidden');
    });
  });

  describe('zIndex', () => {
    it('defaults to 60', () => {
      render(<EnvironmentRibbonClient variant="LOCAL" />);

      expect(ribbon().style.zIndex).toBe('60');
    });

    it('honours the zIndex prop', () => {
      render(<EnvironmentRibbonClient variant="LOCAL" zIndex={9999} />);

      expect(ribbon().style.zIndex).toBe('9999');
    });
  });

  // These two rules cannot live in the inline style attribute, so they are the
  // easiest thing to lose in a refactor (see spec section 5.2).
  describe('rules that need a <style> tag', () => {
    it('hides the ribbon when printing and outlines it on keyboard focus', () => {
      const { container } = render(<EnvironmentRibbonClient variant="LOCAL" />);
      const style = container.querySelector('style');

      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('@media print');
      expect(style?.textContent).toContain('display:none');
      expect(style?.textContent).toContain(':focus-visible');
      expect(style?.textContent).toContain('outline:2px solid #fff');
    });

    it('scopes those rules with the class name carried by the button', () => {
      const { container } = render(<EnvironmentRibbonClient variant="LOCAL" />);

      expect(ribbon().className).toBe('env-ribbon');
      expect(container.querySelector('style')?.textContent).toContain('.env-ribbon');
    });
  });
});
