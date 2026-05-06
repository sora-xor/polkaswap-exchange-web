import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WcAccounts from '@/lib/soraneo-wallet/src/services/walletconnect/wallet/accounts';

describe('walletconnect/wallet/accounts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('maps provider accounts into injected accounts and notifies subscribers when refreshed', async () => {
    const provider = {
      getAccounts: vi.fn().mockReturnValue(['alice', 'bob']),
    } as any;
    const accounts = new WcAccounts(provider);
    const callback = vi.fn();

    accounts.subscribe(callback);

    const result = await accounts.get();

    expect(result).toEqual([{ address: 'alice' }, { address: 'bob' }]);
    expect(callback).toHaveBeenCalledWith([{ address: 'alice' }, { address: 'bob' }]);
  });

  it('polls for account updates and stops calling the subscriber after unsubscribe', async () => {
    const provider = {
      getAccounts: vi.fn().mockReturnValue(['charlie']),
    } as any;
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const accounts = new WcAccounts(provider);
    const callback = vi.fn();

    const unsubscribe = accounts.subscribe(callback);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(provider.getAccounts).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith([{ address: 'charlie' }]);

    callback.mockClear();
    unsubscribe();
    await accounts.get();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });
});
