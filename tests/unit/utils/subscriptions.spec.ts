import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, getAssetBalanceObservableMock } = vi.hoisted(() => {
  const api = {
    assets: {
      getAssetBalanceObservable: vi.fn(),
    },
  };

  return {
    apiMock: api,
    getAssetBalanceObservableMock: api.assets.getAssetBalanceObservable,
  };
});

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: apiMock,
}));

import { TokenBalanceSubscriptions } from '@/utils/subscriptions';

describe('TokenBalanceSubscriptions', () => {
  beforeEach(() => {
    apiMock.assets = { getAssetBalanceObservable: getAssetBalanceObservableMock };
    getAssetBalanceObservableMock.mockReset();
  });

  it('stores null subscriptions when the wallet api does not expose an observable getter', () => {
    apiMock.assets = {} as any;
    const subscriptions = new TokenBalanceSubscriptions();
    const updateBalance = vi.fn();

    subscriptions.add('xor', { updateBalance, token: { address: 'xor' } as any });
    subscriptions.remove('xor');

    expect(updateBalance).toHaveBeenCalledWith(null);
  });

  it('stores null subscriptions when the getter does not return a subscribable observable', () => {
    getAssetBalanceObservableMock.mockReturnValue({});
    const subscriptions = new TokenBalanceSubscriptions();
    const updateBalance = vi.fn();

    subscriptions.add('xor', { updateBalance, token: { address: 'xor' } as any });
    subscriptions.remove('xor');

    expect(getAssetBalanceObservableMock).toHaveBeenCalledWith({ address: 'xor' });
    expect(updateBalance).toHaveBeenCalledWith(null);
  });

  it('stores null subscriptions when the wallet API is not ready to create observables', () => {
    getAssetBalanceObservableMock.mockImplementation(() => {
      throw new TypeError("Cannot read properties of null (reading 'rx')");
    });
    const subscriptions = new TokenBalanceSubscriptions();
    const updateBalance = vi.fn();

    expect(() => subscriptions.add('xor', { updateBalance, token: { address: 'xor' } as any })).not.toThrow();

    subscriptions.remove('xor');

    expect(getAssetBalanceObservableMock).toHaveBeenCalledWith({ address: 'xor' });
    expect(updateBalance).toHaveBeenCalledWith(null);
  });

  it('subscribes to balances and unsubscribes/reset callbacks on remove and reset', () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();
    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();

    getAssetBalanceObservableMock
      .mockReturnValueOnce({
        subscribe: (callback: (value: string) => void) => {
          callback('10');
          return { unsubscribe: firstUnsubscribe };
        },
      })
      .mockReturnValueOnce({
        subscribe: (callback: (value: string) => void) => {
          callback('20');
          return { unsubscribe: secondUnsubscribe };
        },
      });

    const subscriptions = new TokenBalanceSubscriptions();
    subscriptions.add('first', { updateBalance: firstUpdate, token: { address: 'a' } as any });
    subscriptions.add('second', { updateBalance: secondUpdate, token: { address: 'b' } as any });

    expect(firstUpdate).toHaveBeenCalledWith('10');
    expect(secondUpdate).toHaveBeenCalledWith('20');

    subscriptions.remove('first');
    expect(firstUnsubscribe).toHaveBeenCalledTimes(1);
    expect(firstUpdate).toHaveBeenLastCalledWith(null);

    subscriptions.resetSubscriptions();
    expect(secondUnsubscribe).toHaveBeenCalledTimes(1);
    expect(secondUpdate).toHaveBeenLastCalledWith(null);
  });
});
