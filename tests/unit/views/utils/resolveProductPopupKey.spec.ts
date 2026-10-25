import { describe, expect, it } from 'vitest';

import { resolveProductPopupKey } from '@/views/utils/resolveProductPopupKey';

describe('resolveProductPopupKey', () => {
  it('returns the expected popup key for known product values', () => {
    expect(resolveProductPopupKey('soraMobile')).toBe('showSoraMobilePopup');
  });

  it('falls back to the Sora Mobile popup key when product is missing', () => {
    expect(resolveProductPopupKey()).toBe('showSoraMobilePopup');
    expect(resolveProductPopupKey('')).toBe('showSoraMobilePopup');
    expect(resolveProductPopupKey('   ')).toBe('showSoraMobilePopup');
  });

  it('supports custom product names', () => {
    expect(resolveProductPopupKey('example')).toBe('showExamplePopup');
  });
});
