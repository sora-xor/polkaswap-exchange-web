import { describe, expect, it } from 'vitest';

import { isValidNewAccountPassword, NEW_ACCOUNT_PASSWORD_MIN_LENGTH } from '@/lib/soraneo-wallet/src/util/password';

describe('new-wallet password policy', () => {
  it('enforces the advertised eight-character minimum', () => {
    expect(NEW_ACCOUNT_PASSWORD_MIN_LENGTH).toBe(8);
    expect(isValidNewAccountPassword('')).toBe(false);
    expect(isValidNewAccountPassword('x')).toBe(false);
    expect(isValidNewAccountPassword('1234567')).toBe(false);
    expect(isValidNewAccountPassword('12345678')).toBe(true);
    expect(isValidNewAccountPassword('a longer password')).toBe(true);
  });

  it('counts Unicode characters rather than allowing surrogate pairs to halve the minimum', () => {
    expect(isValidNewAccountPassword('🔒'.repeat(4))).toBe(false);
    expect(isValidNewAccountPassword('🔒'.repeat(7))).toBe(false);
    expect(isValidNewAccountPassword('🔒'.repeat(8))).toBe(true);
  });

  it('does not trim password whitespace', () => {
    expect(isValidNewAccountPassword(' 123456 ')).toBe(true);
    expect(isValidNewAccountPassword(' 12345 ')).toBe(false);
  });
});
