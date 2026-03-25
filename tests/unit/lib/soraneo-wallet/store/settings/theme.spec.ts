import { describe, expect, it } from 'vitest';

import { Theme } from '@/lib/soraneo-wallet/src/consts';
import { normalizeTheme } from '@/stores/wallet/settings/theme';

describe('wallet settings theme normalization', () => {
  it('returns dark only for the explicit dark value', () => {
    expect(normalizeTheme(Theme.Dark)).toBe(Theme.Dark);
  });

  it('falls back to light for empty or unsupported persisted values', () => {
    expect(normalizeTheme(Theme.Light)).toBe(Theme.Light);
    expect(normalizeTheme('')).toBe(Theme.Light);
    expect(normalizeTheme(null)).toBe(Theme.Light);
    expect(normalizeTheme(undefined)).toBe(Theme.Light);
    expect(normalizeTheme('LIGHT')).toBe(Theme.Light);
  });
});
