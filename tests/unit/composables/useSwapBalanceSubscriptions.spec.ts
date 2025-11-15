import { beforeEach, describe, expect, it, vi } from 'vitest';

const addMock = vi.fn();
const removeMock = vi.fn();
const resetMock = vi.fn();

vi.mock('@/stores/wallet', () => ({
  useWalletStore: vi.fn(() => ({
    isLoggedIn: true,
    accountAssetsAddressTable: {},
  })),
}));

vi.mock('@/utils/subscriptions', () => {
  class TokenBalanceSubscriptionsMock {
    add = addMock;
    remove = removeMock;
    resetSubscriptions = resetMock;
  }

  return {
    TokenBalanceSubscriptions: TokenBalanceSubscriptionsMock,
  };
});

import { useSwapBalanceSubscriptions } from '@/composables/useSwapBalanceSubscriptions';

beforeEach(() => {
  addMock.mockClear();
  removeMock.mockClear();
  resetMock.mockClear();
});

describe('useSwapBalanceSubscriptions', () => {
  it('adds subscriptions for logged in users', () => {
    const manager = useSwapBalanceSubscriptions();
    const token = { address: '0x123' } as any;

    manager.updateSubscription('from', token, vi.fn());

    expect(removeMock).toHaveBeenCalledWith('from');
    expect(addMock).toHaveBeenCalled();
  });

  it('resets subscriptions', () => {
    const manager = useSwapBalanceSubscriptions();
    manager.resetSubscriptions();

    expect(resetMock).toHaveBeenCalled();
  });
});
