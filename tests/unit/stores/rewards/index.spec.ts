import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const walletStore = {
    isLoggedIn: true,
  };
  const web3Store = {
    evmAddress: '0xext',
  };
  const liquidityRewardsUnsubscribe = vi.fn();
  const vestedRewardsUnsubscribe = vi.fn();
  const crowdloanRewardsUnsubscribe = vi.fn();
  const getNetworkFee = vi.fn(async () => '10');
  const checkForExternalAccount = vi.fn(async () => []);
  const claim = vi.fn(async () => undefined);
  const getLiquidityProvisionRewardsSubscription = vi.fn(() => ({
    subscribe: (callback: (value: unknown) => void) => {
      callback({ amount: '4' });
      return { unsubscribe: liquidityRewardsUnsubscribe };
    },
  }));
  const getVestedRewardsSubscription = vi.fn(() => ({
    subscribe: (callback: (value: unknown) => void) => {
      callback({ limit: '1', total: '2', rewards: [] });
      return { unsubscribe: vestedRewardsUnsubscribe };
    },
  }));
  const getCrowdloanRewardsSubscription = vi.fn(async () => ({
    subscribe: (callback: (value: unknown) => void) => {
      callback({ crowdloan: [{ amount: '3' }] });
      return { unsubscribe: crowdloanRewardsUnsubscribe };
    },
  }));
  const waitForAccountPair = vi.fn(async (handler?: () => unknown | Promise<unknown>) => {
    await handler?.();
  });
  const groupRewardsByAssetsList = vi.fn((list: unknown[]) => list);
  const accountAddressToHex = vi.fn(() => '0x1234');
  const signMessage = vi.fn(async () => '0xsigned');
  const getSigner = vi.fn(async () => ({
    signMessage,
  }));

  return {
    walletStore,
    web3Store,
    liquidityRewardsUnsubscribe,
    vestedRewardsUnsubscribe,
    crowdloanRewardsUnsubscribe,
    getNetworkFee,
    checkForExternalAccount,
    claim,
    getLiquidityProvisionRewardsSubscription,
    getVestedRewardsSubscription,
    getCrowdloanRewardsSubscription,
    waitForAccountPair,
    groupRewardsByAssetsList,
    accountAddressToHex,
    getSigner,
    signMessage,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => shared.web3Store,
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');
  return {
    ...actual,
    waitForAccountPair: shared.waitForAccountPair,
  };
});

vi.mock('@/lib/soraneo-wallet/src/util', async () => {
  const actual = await vi.importActual<typeof import('@/lib/soraneo-wallet/src/util')>('@/lib/soraneo-wallet/src/util');

  return {
    ...actual,
    groupRewardsByAssetsList: shared.groupRewardsByAssetsList,
  };
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      rewards: {
        getLiquidityProvisionRewardsSubscription: shared.getLiquidityProvisionRewardsSubscription,
        getVestedRewardsSubscription: shared.getVestedRewardsSubscription,
        getCrowdloanRewardsSubscription: shared.getCrowdloanRewardsSubscription,
        getNetworkFee: shared.getNetworkFee,
        checkForExternalAccount: shared.checkForExternalAccount,
        claim: shared.claim,
      },
    },
  });
});

vi.mock('@/utils/ethers-util', () => ({
  __esModule: true,
  default: {
    accountAddressToHex: shared.accountAddressToHex,
    getSigner: shared.getSigner,
  },
}));

import { useRewardsStore } from '@/stores/rewards';

describe('rewards store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.isLoggedIn = true;
    shared.web3Store.evmAddress = '0xext';
    shared.liquidityRewardsUnsubscribe.mockReset();
    shared.vestedRewardsUnsubscribe.mockReset();
    shared.crowdloanRewardsUnsubscribe.mockReset();
    shared.getNetworkFee.mockReset();
    shared.getNetworkFee.mockResolvedValue('10');
    shared.checkForExternalAccount.mockReset();
    shared.checkForExternalAccount.mockResolvedValue([]);
    shared.claim.mockReset();
    shared.claim.mockResolvedValue(undefined);
    shared.getLiquidityProvisionRewardsSubscription.mockClear();
    shared.getVestedRewardsSubscription.mockClear();
    shared.getCrowdloanRewardsSubscription.mockClear();
    shared.waitForAccountPair.mockClear();
    shared.groupRewardsByAssetsList.mockClear();
    shared.accountAddressToHex.mockReset();
    shared.accountAddressToHex.mockReturnValue('0x1234');
    shared.getSigner.mockReset();
    shared.getSigner.mockResolvedValue({ signMessage: shared.signMessage });
    shared.signMessage.mockReset();
    shared.signMessage.mockResolvedValue('0xsigned');
  });

  it('derives rewards getters from local pinia state', () => {
    const store = useRewardsStore();

    Object.assign(store, {
      internalRewards: { amount: '4' },
      vestedRewards: { limit: '1', total: '2', rewards: [] },
      externalRewards: [{ amount: '5' }],
      selectedInternal: { amount: '4' },
      selectedVested: { limit: '1', total: '2', rewards: [] },
      selectedExternal: [{ amount: '5' }],
      selectedCrowdloan: { crowdloan: [{ amount: '3' }] },
      crowdloanRewards: { crowdloan: [{ amount: '3' }] },
    });

    expect(store.rewardsAvailable).toBe(true);
    expect(store.externalRewardsAvailable).toBe(true);
    expect(store.externalRewardsSelected).toBe(true);
    expect(store.internalRewardsAvailable).toBe(true);
    expect(store.vestedRewardsAvailable).toBe(true);
    expect(store.crowdloanRewardsAvailable).toEqual(['crowdloan']);
    expect(store.claimableRewards).toEqual([
      { amount: '5' },
      { amount: '3' },
      { amount: '4' },
      { limit: '1', total: '2', rewards: [] },
    ]);
  });

  it('updates selected rewards and refreshes the fee', async () => {
    const store = useRewardsStore();

    await store.setSelectedRewards({ selectedExternal: [{ amount: '5' }] } as any);

    expect(shared.getNetworkFee).toHaveBeenCalledWith([{ amount: '5' }]);
    expect(store.selectedExternal).toEqual([{ amount: '5' }]);
    expect(store.fee).toBe('10');
  });

  it('loads external rewards into local state', async () => {
    const store = useRewardsStore();
    shared.checkForExternalAccount.mockResolvedValue([{ amount: '7' }]);

    await store.getExternalRewards('0xext');

    expect(shared.checkForExternalAccount).toHaveBeenCalledWith('0xext');
    expect(store.externalRewards).toEqual([{ amount: '7' }]);
    expect(store.selectedExternal).toEqual([{ amount: '7' }]);
  });

  it('subscribes and unsubscribes rewards without the legacy bridge', async () => {
    const store = useRewardsStore();

    await store.subscribeOnRewards();

    expect(shared.waitForAccountPair).toHaveBeenCalledTimes(1);
    expect(shared.getLiquidityProvisionRewardsSubscription).toHaveBeenCalledTimes(1);
    expect(shared.getVestedRewardsSubscription).toHaveBeenCalledTimes(1);
    expect(shared.getCrowdloanRewardsSubscription).toHaveBeenCalledTimes(1);
    expect(store.internalRewards).toEqual({ amount: '4' });
    expect(store.vestedRewards).toEqual({ limit: '1', total: '2', rewards: [] });
    expect(store.crowdloanRewards).toEqual({ crowdloan: [{ amount: '3' }] });
    expect(store.selectedInternal).toEqual({ amount: '4' });
    expect(store.selectedVested).toEqual({ limit: '1', total: '2', rewards: [] });
    expect(store.selectedCrowdloan).toEqual({ crowdloan: [{ amount: '3' }] });

    store.unsubscribeFromRewards();

    expect(shared.liquidityRewardsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.vestedRewardsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.crowdloanRewardsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(store.internalRewards).toBeNull();
    expect(store.vestedRewards).toBeNull();
    expect(store.crowdloanRewards).toEqual({});
  });

  it('claims rewards with the external-signature flow', async () => {
    const store = useRewardsStore();
    Object.assign(store, {
      selectedExternal: [{ amount: '5' }],
      fee: '10',
    });
    shared.groupRewardsByAssetsList.mockReturnValue([{ symbol: 'PSWAP', amount: '5' }]);

    await store.claimRewards({ internalAddress: 'sora', externalAddress: '0xext' });

    expect(shared.accountAddressToHex).toHaveBeenCalledWith('sora');
    expect(shared.getSigner).toHaveBeenCalledTimes(1);
    expect(shared.signMessage).toHaveBeenCalledTimes(1);
    expect(shared.claim).toHaveBeenCalledWith([{ amount: '5' }], '0xsigned', '10', '0xext');
    expect(store.receivedRewards).toEqual([{ symbol: 'PSWAP', amount: '5' }]);
    expect(store.transactionStep).toBe(1);
    expect(store.rewardsClaiming).toBe(false);
  });
});
