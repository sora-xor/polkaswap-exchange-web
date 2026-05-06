import { beforeEach, describe, expect, it, vi } from 'vitest';

const addMock = vi.fn();
const removeMock = vi.fn();
const resetMock = vi.fn();
const walletStoreState = vi.hoisted(() => ({
  isLoggedIn: true,
  accountAssetsAddressTable: {} as Record<string, { balance?: unknown }>,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: vi.fn(() => walletStoreState),
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
  walletStoreState.isLoggedIn = true;
  walletStoreState.accountAssetsAddressTable = {};
});

describe('useSwapBalanceSubscriptions', () => {
  it('adds subscriptions for logged in users', () => {
    const manager = useSwapBalanceSubscriptions();
    const token = { address: '0x123' } as any;

    manager.updateSubscription('from', token, vi.fn());

    expect(removeMock).toHaveBeenCalledWith('from');
    expect(addMock).toHaveBeenCalled();
  });

  it('hydrates the existing wallet balance and keeps the subscription active', () => {
    const manager = useSwapBalanceSubscriptions();
    const token = { address: '0x123' } as any;
    const updateBalance = vi.fn();

    walletStoreState.accountAssetsAddressTable = {
      '0x123': {
        balance: {
          transferable: '42000000000000000000',
        },
      },
    };

    manager.updateSubscription('from', token, updateBalance);

    expect(removeMock).toHaveBeenCalledWith('from');
    expect(updateBalance).toHaveBeenCalledWith({
      transferable: '42000000000000000000',
    });
    expect(addMock).toHaveBeenCalledWith('from', {
      token,
      updateBalance,
    });
  });

  it('resets subscriptions', () => {
    const manager = useSwapBalanceSubscriptions();
    manager.resetSubscriptions();

    expect(resetMock).toHaveBeenCalled();
  });
});
