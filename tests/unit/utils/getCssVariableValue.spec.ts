import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lang', () => ({
  __esModule: true,
  default: {
    te: vi.fn(),
    t: vi.fn(),
  },
}));

vi.mock('@/consts', () => ({
  app: { name: 'Polkaswap', title: 'Polkaswap' },
  TranslationConsts: {},
}));

import { getCssVariableValue } from '@/utils';

describe('getCssVariableValue', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
  });

  it('reads variables from the active sora theme provider scope first', () => {
    document.documentElement.style.setProperty('--s-color-theme-accent', '#000000');

    const provider = document.createElement('div');
    provider.className = 'sora-theme-provider';
    provider.setAttribute('data-theme', 'light');
    provider.style.setProperty('--s-color-theme-accent', '#f8087b');

    document.body.appendChild(provider);

    expect(getCssVariableValue('--s-color-theme-accent')).toBe('#f8087b');
  });

  it('falls back to document root when provider scoped variable is missing', () => {
    document.documentElement.style.setProperty('--s-color-theme-accent', '#123456');

    const provider = document.createElement('div');
    provider.className = 'sora-theme-provider';
    provider.setAttribute('data-theme', 'light');
    document.body.appendChild(provider);

    expect(getCssVariableValue('--s-color-theme-accent')).toBe('#123456');
  });
});
