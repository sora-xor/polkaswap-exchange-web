import { describe, expect, it } from 'vitest';

import { AppHandledError } from '@/utils/error';

describe('AppHandledError', () => {
  it('stores translation metadata while preserving Error behavior', () => {
    const payload = { amount: '10 XOR' };
    const error = new AppHandledError({ key: 'wallet.insufficientBalance', payload }, 'Balance is too low');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppHandledError');
    expect(error.message).toBe('Balance is too low');
    expect(error.translationKey).toBe('wallet.insufficientBalance');
    expect(error.translationPayload).toBe(payload);
  });

  it('defaults translation metadata when no payload is provided', () => {
    const error = new AppHandledError();

    expect(error.name).toBe('AppHandledError');
    expect(error.message).toBe('');
    expect(error.translationKey).toBe('');
    expect(error.translationPayload).toEqual({});
  });
});
