import { describe, expect, it, beforeEach, vi } from 'vitest';

const getPoolsObservableMock = vi.hoisted(() => vi.fn());
const getTokenInfosObservableMock = vi.hoisted(() => vi.fn());
const getAccountPoolsObservableMock = vi.hoisted(() => vi.fn());

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
  waitForAccountPair: vi.fn(),
}));

import actions from '@/store/demeterFarming/actions';

describe('demeterFarming actions', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  beforeEach(() => {
    getPoolsObservableMock.mockReset();
    getTokenInfosObservableMock.mockReset();
    getAccountPoolsObservableMock.mockReset();
    warnSpy.mockClear();
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
});
