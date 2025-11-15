import { FPNumber } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAssetMock = vi.hoisted(() => vi.fn());

const assetsStoreMock = vi.hoisted(() => ({
  assetDataByAddress: (address?: string) => getAssetMock(address ?? ''),
}));

const mockStore = vi.hoisted(() => ({
  state: {
    demeterFarming: {
      tokens: [] as any[],
      pools: [] as any[],
      accountPools: [] as any[],
    },
    pool: {
      accountLiquidity: [] as any[],
    },
  },
  getters: {
    assets: {
      assetDataByAddress: getAssetMock,
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

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => assetsStoreMock,
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

const aprApiStub = vi.hoisted(() => ({
  getEmission: vi.fn(() => new FPNumber(2)),
  getTvl: vi.fn(() => new FPNumber(50)),
  getApr: vi.fn(() => new FPNumber(10)),
  formatApr: vi.fn(() => '10%'),
  getAssetFiatPrice: vi.fn(() => '1'),
  getFiatAmountByFPNumber: vi.fn(),
  formatCodecNumber: vi.fn(),
}));

vi.mock('@/modules/staking/demeter/composables/useDemeterApr', () => ({
  useDemeterApr: () => aprApiStub,
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getAssetFiatPrice: vi.fn(() => '1'),
    getFiatAmountByFPNumber: vi.fn(),
    formatCodecNumber: vi.fn(),
    getFPNumberFromCodec: (value: string) => FPNumber.fromCodecValue(value),
  }),
}));

import { useDemeterBasePage } from '@/modules/staking/demeter/composables/useDemeterBasePage';

describe('useDemeterBasePage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    getAssetMock.mockReset();
    aprApiStub.getEmission.mockClear();
    aprApiStub.getTvl.mockClear();
    aprApiStub.getApr.mockClear();
    aprApiStub.formatApr.mockClear();

    const baseAsset = {
      address: 'A',
      symbol: 'AAA',
      decimals: 18,
    } as any;
    const poolAsset = {
      address: 'B',
      symbol: 'BBB',
      decimals: 18,
    } as any;
    const rewardAsset = {
      address: 'R',
      symbol: 'RRR',
      decimals: 18,
    } as any;

    mockStore.getters.wallet.account.assetsDataTable = {
      A: baseAsset,
      B: poolAsset,
      R: rewardAsset,
    } as Record<string, any>;
    mockStore.getters.wallet.account.accountAssetsAddressTable = {
      A: { balance: { transferable: '0' } },
      B: { balance: { transferable: '0' } },
      R: { balance: { transferable: '0' } },
    } as Record<string, any>;

    getAssetMock.mockImplementation((address: string) => {
      switch (address) {
        case 'A':
          return baseAsset;
        case 'B':
          return poolAsset;
        case 'R':
          return rewardAsset;
        default:
          return null;
      }
    });

    mockStore.state.demeterFarming.tokens = [
      {
        assetId: 'R',
        farmsTotalMultiplier: '4',
        farmsAllocation: new FPNumber(100),
        stakingTotalMultiplier: '0',
        stakingAllocation: FPNumber.ZERO,
        tokenPerBlock: new FPNumber(2),
      },
    ];

    mockStore.state.demeterFarming.pools = [
      {
        baseAsset: 'A',
        poolAsset: 'B',
        rewardAsset: 'R',
        isFarm: true,
        isRemoved: false,
        multiplier: '2',
        totalTokensInPool: new FPNumber(500),
      },
      {
        baseAsset: 'A',
        poolAsset: 'B',
        rewardAsset: 'R',
        isFarm: true,
        isRemoved: true,
        multiplier: '1',
        totalTokensInPool: new FPNumber(200),
      },
    ] as any[];

    mockStore.state.demeterFarming.accountPools = [
      {
        baseAsset: 'A',
        poolAsset: 'B',
        rewardAsset: 'R',
        pooledTokens: new FPNumber(10),
        rewards: new FPNumber(0),
        isFarm: true,
      },
    ] as any[];
    mockStore.state.pool.accountLiquidity = [{ firstAddress: 'A', secondAddress: 'B', address: 'liquidity' }] as any[];
  });

  it('filters derived pools keeping entries with active pools or balances', () => {
    const basePage = useDemeterBasePage();
    const pools = mockStore.state.demeterFarming.pools as any[];
    const derived = basePage.getDerivedPools(pools);

    expect(derived).toHaveLength(2);
    expect(derived[0].pool).toBe(pools[0]);
    expect(derived[1].pool).toBe(pools[1]);
  });

  it('prepares derived pool data including APR and TVL projections', () => {
    const basePage = useDemeterBasePage();
    const pool = mockStore.state.demeterFarming.pools[0] as any;
    const accountPool = mockStore.state.demeterFarming.accountPools[0] as any;

    const derived = basePage.prepareDerivedPoolData(pool, accountPool, {
      firstBalance: '100',
      secondBalance: '200',
    } as any);

    expect(derived.pool).toBe(pool);
    expect(derived.accountPool).toBe(accountPool);
    expect(derived.apr).toBe('10%');
    expect(derived.tvl.startsWith('$50')).toBe(true);
    expect(aprApiStub.getEmission).toHaveBeenCalledWith(pool, expect.anything());
    expect(aprApiStub.getTvl).toHaveBeenCalled();
    expect(aprApiStub.getApr).toHaveBeenCalled();
  });

  it('returns derived pools for a specific liquidity entry', () => {
    const basePage = useDemeterBasePage();
    const result = basePage.getLiquidityFarmingPools({ firstAddress: 'A', secondAddress: 'B' } as any);

    expect(result).toHaveLength(2);
    expect(result[0].pool.baseAsset).toBe('A');
  });

  it('tracks the selected account liquidity based on dialog params', () => {
    const basePage = useDemeterBasePage();
    basePage.setDialogParams({
      baseAsset: 'A',
      poolAsset: 'B',
      rewardAsset: 'R',
      liquidity: { firstAddress: 'A', secondAddress: 'B' } as any,
    });

    expect(basePage.selectedAccountLiquidity.value?.firstAddress).toBe('A');
  });

  it('opens calculator dialog with the provided liquidity payload', () => {
    const basePage = useDemeterBasePage();
    basePage.showPoolCalculator({
      baseAsset: 'A',
      poolAsset: 'B',
      rewardAsset: 'R',
      liquidity: { firstAddress: 'A', secondAddress: 'B' } as any,
    });

    expect(basePage.showCalculatorDialog.value).toBe(true);
    expect(basePage.selectedAccountLiquidity.value?.firstAddress).toBe('A');
  });
});
