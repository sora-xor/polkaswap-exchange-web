import { FPNumber, Operation } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setLegacyStoreOverride } from '@/utils/legacy-store';

const mockStore = vi.hoisted(() => ({
  state: {
    wallet: {
      settings: {
        networkFees: {} as Record<string, string>,
        shouldBalanceBeHidden: false,
      },
      account: {
        fiatPriceObject: {} as Record<string, string>,
      },
    },
  },
  getters: {
    assets: {
      xor: {
        symbol: 'XOR',
        decimals: 18,
        balance: {
          transferable: '1000000000000000000',
        },
      },
    },
    wallet: {
      account: {
        assetsDataTable: {},
        accountAssetsAddressTable: {},
      },
    },
  },
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: mockStore,
}));

const assetsStoreMock = vi.hoisted(() => ({
  assetDataByAddress: (address?: string) =>
    address ? (mockStore.getters.wallet.account.assetsDataTable[address] ?? null) : null,
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
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

mockStore.state.wallet.settings.networkFees[Operation.DemeterFarmingGetRewards] = '10000000000';
mockStore.state.wallet.account.fiatPriceObject = {
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

  mockStore.getters.wallet.account.assetsDataTable = {
    A: {
      address: 'A',
      symbol: 'AAA',
      decimals: 18,
      balance: {
        transferable: '0',
      },
    },
    B: poolAsset,
    R: rewardAsset,
    xor: mockStore.getters.assets.xor,
  } as Record<string, any>;
  mockStore.getters.wallet.account.accountAssetsAddressTable = {
    xor: {
      balance: {
        transferable: '1000000000000000000',
      },
    },
    A: {
      balance: {
        transferable: '0',
      },
    },
    B: poolAsset.balance,
    R: rewardAsset.balance,
  } as Record<string, any>;

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
    setLegacyStoreOverride(mockStore as any);
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
