import { afterEach, describe, expect, it, vi } from 'vitest';

const setStorageReferrerMock = vi.hoisted(() => vi.fn());
let shouldThrow = false;

vi.mock('@/stores/referrals', () => ({
  useReferralsStore: () => {
    if (shouldThrow) {
      throw new Error('store unavailable');
    }

    return {
      setStorageReferrer: setStorageReferrerMock,
    };
  },
}));

import { persistReferralAddress } from '@/adapters/wallet/referrals';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  shouldThrow = false;
  setStorageReferrerMock.mockReset();
  warnSpy.mockClear();
});

describe('wallet adapter - referrals', () => {
  it('persists referral when mutation exists', () => {
    persistReferralAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');

    expect(setStorageReferrerMock).toHaveBeenCalledWith('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs when store unavailable', () => {
    shouldThrow = true;

    persistReferralAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');

    expect(warnSpy).toHaveBeenCalledWith('[wallet-adapter] referrals.setStorageReferrer missing');
  });
});
