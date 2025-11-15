import { afterEach, describe, expect, it, vi } from 'vitest';

let storeShape: any = null;

vi.mock('@/utils/legacy-store', () => ({
  withLegacyStore: (cb: (store: any) => unknown) => {
    if (!storeShape) {
      return undefined;
    }

    return cb(storeShape);
  },
}));

import { persistReferralAddress } from '@/adapters/wallet/referrals';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

afterEach(() => {
  storeShape = null;
  warnSpy.mockClear();
});

describe('wallet adapter - referrals', () => {
  it('persists referral when mutation exists', () => {
    const setter = vi.fn();
    storeShape = {
      commit: {
        referrals: {
          setStorageReferrer: setter,
        },
      },
    };

    persistReferralAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');

    expect(setter).toHaveBeenCalledWith('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs when mutation is missing', () => {
    storeShape = {
      commit: {
        referrals: {},
      },
    };

    persistReferralAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');

    expect(warnSpy).toHaveBeenCalledWith('[wallet-adapter] referrals.setStorageReferrer missing');
  });

  it('logs when store unavailable', () => {
    persistReferralAddress('5F3sa2TJAWMqDhXG6jhV4N8ko9GZVZpo5TJ');

    expect(warnSpy).toHaveBeenCalledWith('[wallet-adapter] referrals.setStorageReferrer missing');
  });
});
