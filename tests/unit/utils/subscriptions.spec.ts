import { config, EMPTY, Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccountBalance } from '@sora-substrate/sdk/build/assets/types';

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

import { subscribeAndWaitForFirst, TokenBalanceSubscriptions } from '@/utils/subscriptions';

describe('subscribeAndWaitForFirst', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the subscription handle after a synchronous first emission', async () => {
    const onValue = vi.fn();

    const subscription = await subscribeAndWaitForFirst(of('ready'), onValue);

    expect(onValue).toHaveBeenCalledWith('ready');
    expect(subscription).toEqual(expect.objectContaining({ unsubscribe: expect.any(Function) }));
  });

  it('rejects when the source errors or completes without an emission', async () => {
    await expect(
      subscribeAndWaitForFirst(
        throwError(() => new Error('source failed')),
        vi.fn()
      )
    ).rejects.toThrow('source failed');
    await expect(subscribeAndWaitForFirst(EMPTY, vi.fn())).rejects.toThrow(
      'Observable completed before its first emission'
    );
  });

  it('times out and tears down a source that never emits', async () => {
    vi.useFakeTimers();
    const teardown = vi.fn();
    const observable = new Observable<void>(() => teardown);
    const pending = subscribeAndWaitForFirst(observable, vi.fn(), 50);
    const rejection = expect(pending).rejects.toThrow('Observable did not emit within 50 ms');

    await vi.advanceTimersByTimeAsync(50);
    await rejection;

    expect(teardown).toHaveBeenCalledTimes(1);
  });
});

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
    expect(updateBalance).toHaveBeenCalledWith(null);
    subscriptions.remove('xor');

    expect(updateBalance).toHaveBeenCalledWith(null);
  });

  it('stores null subscriptions when the getter does not return a subscribable observable', () => {
    getAssetBalanceObservableMock.mockReturnValue({});
    const subscriptions = new TokenBalanceSubscriptions();
    const updateBalance = vi.fn();

    subscriptions.add('xor', { updateBalance, token: { address: 'xor' } as any });
    expect(updateBalance).toHaveBeenCalledWith(null);
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
    expect(updateBalance).toHaveBeenCalledWith(null);

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

  it('replaces an existing key without keeping the previous balance stream alive', () => {
    const first = new Subject<AccountBalance>();
    const second = new Subject<AccountBalance>();
    const subscriptions = new TokenBalanceSubscriptions();
    const updateBalance = vi.fn();
    const token = { address: 'xor' } as never;
    getAssetBalanceObservableMock.mockReturnValueOnce(first).mockReturnValueOnce(second);

    subscriptions.add('from', { token, updateBalance });
    subscriptions.add('from', { token, updateBalance });

    expect(first.observed).toBe(false);
    expect(second.observed).toBe(true);
    updateBalance.mockClear();
    first.next({ transferable: '999' } as AccountBalance);
    second.next({ transferable: '7' } as AccountBalance);
    expect(updateBalance.mock.calls).toEqual([[{ transferable: '7' }]]);
    subscriptions.resetSubscriptions();
    expect(second.observed).toBe(false);
  });

  it.each(['synchronous', 'later'] as const)('invalidates balances on a %s stream error', async (timing) => {
    vi.useFakeTimers();
    const previousUnhandledError = config.onUnhandledError;
    const unhandledError = vi.fn();
    config.onUnhandledError = unhandledError;
    const subscriptions = new TokenBalanceSubscriptions();

    try {
      const source = new Subject<AccountBalance>();
      const updateBalance = vi.fn();
      getAssetBalanceObservableMock.mockReturnValue(
        timing === 'synchronous' ? throwError(() => new Error('connection lost')) : source
      );
      subscriptions.add('from', { token: { address: 'xor' } as never, updateBalance });
      if (timing === 'later') {
        source.next({ transferable: '10' } as AccountBalance);
        source.error(new Error('connection lost'));
      }
      await vi.runAllTimersAsync();

      expect(updateBalance).toHaveBeenLastCalledWith(null);
      expect(unhandledError).not.toHaveBeenCalled();
      expect(source.observed).toBe(false);
    } finally {
      subscriptions.resetSubscriptions();
      config.onUnhandledError = previousUnhandledError;
      vi.useRealTimers();
    }
  });

  it.each(['empty', 'after a balance'] as const)('invalidates a stream that completes %s', (timing) => {
    const source = new Subject<AccountBalance>();
    const updateBalance = vi.fn();
    const subscriptions = new TokenBalanceSubscriptions();
    getAssetBalanceObservableMock.mockReturnValue(timing === 'empty' ? EMPTY : source);
    subscriptions.add('from', { token: { address: 'xor' } as never, updateBalance });
    if (timing === 'after a balance') {
      source.next({ transferable: '10' } as AccountBalance);
      source.complete();
    }

    expect(updateBalance).toHaveBeenLastCalledWith(null);
    expect(source.observed).toBe(false);
    subscriptions.resetSubscriptions();
  });

  it('ignores a late callback from a removed stream after its key is reused', () => {
    let emitOldBalance!: (balance: AccountBalance) => void;
    const updateBalance = vi.fn();
    const subscriptions = new TokenBalanceSubscriptions();
    const token = { address: 'xor' } as never;
    const current = new Subject<AccountBalance>();
    getAssetBalanceObservableMock
      .mockReturnValueOnce({
        subscribe: (next: typeof emitOldBalance) => {
          emitOldBalance = next;
          return { unsubscribe: vi.fn() };
        },
      })
      .mockReturnValueOnce(current);
    subscriptions.add('from', { token, updateBalance });
    subscriptions.remove('from');
    subscriptions.add('from', { token, updateBalance });
    current.next({ transferable: '3' } as AccountBalance);

    emitOldBalance({ transferable: '99' } as AccountBalance);

    expect(updateBalance).toHaveBeenLastCalledWith({ transferable: '3' });
    subscriptions.resetSubscriptions();
  });
});
