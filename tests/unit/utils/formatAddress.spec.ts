import { describe, expect, it } from 'vitest';

import formatAddress from '@/utils/formatAddress';

describe('formatAddress', () => {
  it('keeps balanced leading and trailing segments around an ellipsis', () => {
    expect(formatAddress('abcdef123456', 6)).toBe('abc...456');
  });

  it('derives the visible length from half of the address by default', () => {
    expect(formatAddress('abcdefghij')).toBe('ab...ij');
  });

  it('rounds odd visible lengths down to balanced segment pairs', () => {
    expect(formatAddress('abcdef', 5)).toBe('ab...ef');
  });
});
