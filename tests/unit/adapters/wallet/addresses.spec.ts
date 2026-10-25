import { describe, expect, it, vi } from 'vitest';

vi.mock('@tests/stubs/walletRuntime', () => ({
  api: {
    validateAddress: vi.fn(),
  },
}));

import { isValidWalletAddress } from '@/adapters/wallet/addresses';
import { api } from '@/lib/soraneo-wallet/src/api';

describe('wallet adapter - addresses', () => {
  it('returns false for empty input', () => {
    expect(isValidWalletAddress('')).toBe(false);
    expect(isValidWalletAddress(undefined)).toBe(false);
    expect(isValidWalletAddress('   ')).toBe(false);
  });

  it('returns false when wallet validator is missing', () => {
    const original = api.validateAddress;
    // @ts-expect-error - force missing validator
    api.validateAddress = undefined;

    expect(isValidWalletAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ')).toBe(false);

    api.validateAddress = original;
  });

  it('defers to wallet validator when available', () => {
    const validator = vi.fn().mockReturnValue(true);
    api.validateAddress = validator;

    const address = '5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ';
    expect(isValidWalletAddress(address)).toBe(true);
    expect(validator).toHaveBeenCalledWith(address);
  });

  it('returns false and warns when the wallet validator throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = new Error('validation failed');
    api.validateAddress = vi.fn(() => {
      throw error;
    });

    expect(isValidWalletAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ')).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('[wallet-adapter] validateAddress failed', error);
  });
});
