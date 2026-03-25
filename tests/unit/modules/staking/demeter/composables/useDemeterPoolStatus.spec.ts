import { FPNumber, Operation } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({
  walletStore: {
    fiatPriceObject: {} as Record<string, string>,
  },
  settingsStore: {
    networkFees: {} as Record<string, string>,
    shouldBalanceBeHidden: false,
  },
  assetsStore: {
    xor: {
      symbol: 'XOR',
      decimals: 18,
      balance: {
        transferable: '1000000000000000000',
      },
    } as any,
    assetDataByAddress: vi.fn((address?: string) => (address ? null : null)),
  },
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => shared.settingsStore,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => shared.assetsStore,
}));

vi.mock('@sora-substrate/sdk/build/assets/consts', () => import('@stubs/sdk-assets-consts'));

vi.mock('@/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils')>();
  return {
    ...actual,
    hasInsufficientXorForFee: vi.fn(() => false),
  };
});

import { useDemeterPoolCard } from '@/modules/staking/demeter/composables/useDemeterPoolCard';
import { useDemeterPoolStatus } from '@/modules/staking/demeter/composables/useDemeterPoolStatus';

shared.settingsStore.networkFees[Operation.DemeterFarmingGetRewards] = '10000000000';
shared.walletStore.fiatPriceObject = {
  B: '1',
  R: '2',
  XOR: '1',
};

describe('useDemeterPoolStatus & useDemeterPoolCard', () => {
  const poolAsset = {
    address: 'B',
    symbol: 'BBB',
    decimals: 18,
    balance: {
      transferable: '2000000000000000000',
    },
    price: FPNumber.fromCodecValue('1'),
  } as any;

  const rewardAsset = {
    address: 'R',
    symbol: 'RRR',
    decimals: 18,
    balance: {
      transferable: '0',
    },
    price: FPNumber.fromCodecValue('2'),
  } as any;

  const pool = {
    baseAsset: 'A',
    poolAsset: 'B',
    rewardAsset: 'R',
    isFarm: false,
    isRemoved: false,
    depositFee: 0.01,
    totalTokensInPool: new FPNumber(1000),
  } as any;

  const accountPool = {
    rewardAsset: 'R',
    pooledTokens: new FPNumber(100),
    rewards: new FPNumber(5),
    isFarm: false,
  } as any;

  let statusApi: ReturnType<typeof useDemeterPoolStatus>;
  let cardApi: ReturnType<typeof useDemeterPoolCard>;

  beforeEach(() => {
    setActivePinia(createPinia());
    shared.assetsStore.assetDataByAddress.mockImplementation((address?: string) => {
      if (!address) return null;

      switch (address) {
        case 'A':
          return {
            address: 'A',
            symbol: 'AAA',
            decimals: 18,
            balance: {
              transferable: '0',
            },
          };
        case 'B':
          return poolAsset;
        case 'R':
          return rewardAsset;
        case 'xor':
          return shared.assetsStore.xor;
        default:
          return null;
      }
    });
    statusApi = useDemeterPoolStatus({
      pool: () => pool,
      accountPool: () => accountPool,
      poolAsset: () => poolAsset,
      rewardAsset: () => rewardAsset,
    });
    cardApi = useDemeterPoolCard(statusApi);
  });

  it('exposes available funds and emit params', () => {
    expect(statusApi.availableFunds.value.toNumber()).toBeGreaterThan(0);
    expect(statusApi.depositDisabled.value).toBe(false);
    expect(statusApi.emitParams.value).toEqual({
      baseAsset: 'A',
      poolAsset: 'B',
      rewardAsset: 'R',
    });
  });

  it('computes reward information and fee sufficiency', () => {
    expect(cardApi.rewardsFormatted.value).toBe('5');
    expect(cardApi.networkFeeFormatted.value).toBeDefined();
    expect(cardApi.isInsufficientXorForFee.value).toBe(false);
  });

  it('derives pool share metrics for non-farm pools', () => {
    expect(cardApi.poolShareFormatted.value).toBe('100');
    expect(cardApi.poolShareFiat.value).not.toBeNull();
  });
});
