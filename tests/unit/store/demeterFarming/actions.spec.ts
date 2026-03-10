import { describe, expect, it, beforeEach, vi } from 'vitest';

const getPoolsObservableMock = vi.hoisted(() => vi.fn());
const getTokenInfosObservableMock = vi.hoisted(() => vi.fn());
const getAccountPoolsObservableMock = vi.hoisted(() => vi.fn());
const waitForAccountPairMock = vi.hoisted(() => vi.fn());

vi.mock('@wallet', () => ({
  api: {
    demeterFarming: {
      getPoolsObservable: getPoolsObservableMock,
      getTokenInfosObservable: getTokenInfosObservableMock,
      getAccountPoolsObservable: getAccountPoolsObservableMock,
    },
  },
}));

vi.mock('direct-vuex', () => ({
  defineActions: (actions: Record<string, unknown>) => actions,
}));

vi.mock('@/store/demeterFarming', () => ({
  demeterFarmingActionContext: (context: Record<string, unknown>) => context,
}));

vi.mock('@/utils', () => ({
  waitForAccountPair: waitForAccountPairMock,
}));

import actions from '@/store/demeterFarming/actions';

describe('demeterFarming actions', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    getPoolsObservableMock.mockReset();
    getTokenInfosObservableMock.mockReset();
    getAccountPoolsObservableMock.mockReset();
    waitForAccountPairMock.mockReset();
    warnSpy.mockClear();
    vi.useRealTimers();
  });

  it('does not throw when pools observable init fails', async () => {
    getPoolsObservableMock.mockRejectedValue(new Error('api unavailable'));

    const commit = {
      resetPoolsUpdates: vi.fn(),
      setPools: vi.fn(),
      setPoolsUpdates: vi.fn(),
    };
    const context = { commit };

    await expect(actions.subscribeOnPools(context as any)).resolves.toBeUndefined();

    expect(commit.resetPoolsUpdates).toHaveBeenCalledTimes(1);
    expect(commit.setPools).toHaveBeenCalledWith([]);
    expect(commit.setPoolsUpdates).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('resolves subscribeOnPools when first observable emission never arrives', async () => {
    vi.useFakeTimers();

    const subscription = { unsubscribe: vi.fn() };
    getPoolsObservableMock.mockResolvedValue({
      subscribe: vi.fn(() => subscription),
    });

    const commit = {
      resetPoolsUpdates: vi.fn(),
      setPools: vi.fn(),
      setPoolsUpdates: vi.fn(),
    };
    const context = { commit };

    const pending = actions.subscribeOnPools(context as any);
    await vi.advanceTimersByTimeAsync(8_000);
    await expect(pending).resolves.toBeUndefined();

    expect(commit.resetPoolsUpdates).toHaveBeenCalledTimes(1);
    expect(commit.setPoolsUpdates).toHaveBeenCalledWith(subscription);
    expect(commit.setPools).toHaveBeenCalledWith([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('clears account pools immediately when not logged in', async () => {
    const commit = {
      resetAccountPoolsUpdates: vi.fn(),
      setAccountPools: vi.fn(),
      setAccountPoolsUpdates: vi.fn(),
    };
    const context = {
      commit,
      rootGetters: {
        wallet: {
          account: {
            isLoggedIn: false,
          },
        },
      },
    };

    await expect(actions.subscribeOnAccountPools(context as any)).resolves.toBeUndefined();

    expect(commit.resetAccountPoolsUpdates).toHaveBeenCalledTimes(1);
    expect(commit.setAccountPools).toHaveBeenCalledWith([]);
    expect(commit.setAccountPoolsUpdates).not.toHaveBeenCalled();
    expect(waitForAccountPairMock).not.toHaveBeenCalled();
  });
});
