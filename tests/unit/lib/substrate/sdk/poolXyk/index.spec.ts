import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/liquidity-proxy', () => ({
  getChameleonPools: () => ['', []],
}));

vi.mock('@/lib/substrate/sdk/poolXyk/account', () => ({
  poolAccountIdFromAssetPair: (_root: unknown, firstAddress: string, secondAddress: string) => ({
    toString: () => `pool:${firstAddress}:${secondAddress}`,
  }),
}));

import { PoolXykModule } from '@/lib/substrate/sdk/poolXyk';
import { Operation } from '@/lib/substrate/sdk/types';

import type { Asset } from '@/lib/substrate/sdk/assets/types';

const assetId = (code: string) => ({
  code: {
    toString: () => code,
  },
});

const some = (value: string) => ({
  isSome: true,
  value,
});

const none = () => ({
  isSome: false,
  value: null,
});

const poolAccount = (firstAddress: string, secondAddress: string) => `pool:${firstAddress}:${secondAddress}`;

describe('substrate sdk poolXyk account liquidity subscriptions', () => {
  let accountPools$: Subject<Array<Array<ReturnType<typeof assetId>>>>;
  let poolProviders: Map<string, BehaviorSubject<ReturnType<typeof some> | ReturnType<typeof none>>>;
  let totalIssuances: Map<string, BehaviorSubject<ReturnType<typeof some> | ReturnType<typeof none>>>;
  let reserves: Map<string, BehaviorSubject<[string, string]>>;

  beforeEach(() => {
    accountPools$ = new Subject();
    poolProviders = new Map();
    totalIssuances = new Map();
    reserves = new Map();
  });

  const getProviderSubject = (account: string) => {
    if (!poolProviders.has(account)) {
      poolProviders.set(account, new BehaviorSubject(some('10')));
    }
    return poolProviders.get(account)!;
  };

  const getTotalSupplySubject = (account: string) => {
    if (!totalIssuances.has(account)) {
      totalIssuances.set(account, new BehaviorSubject(some('100')));
    }
    return totalIssuances.get(account)!;
  };

  const getReservesSubject = (firstAddress: string, secondAddress: string) => {
    const key = `${firstAddress}:${secondAddress}`;
    if (!reserves.has(key)) {
      reserves.set(key, new BehaviorSubject<[string, string]>(['100', '200']));
    }
    return reserves.get(key)!;
  };

  const createPoolXykModule = () =>
    new PoolXykModule({
      account: {
        pair: {
          address: 'account-address',
        },
      },
      accountPair: {
        address: 'account-address',
      },
      apiRx: {
        query: {
          poolXYK: {
            accountPools: {
              multi: vi.fn(() => accountPools$),
            },
            poolProviders: vi.fn((account: string) => getProviderSubject(account)),
            totalIssuances: vi.fn((account: string) => getTotalSupplySubject(account)),
            reserves: vi.fn((firstAddress: string, secondAddress: string) =>
              getReservesSubject(firstAddress, secondAddress)
            ),
          },
        },
      },
      dex: {
        baseAssetsIds: ['base'],
      },
    } as any);

  const emitAccountPools = (targets: string[]) => {
    accountPools$.next([targets.map(assetId)]);
  };

  it('preserves existing liquidity rows when discovery emits a partial pool list', async () => {
    const poolXyk = createPoolXykModule();

    poolXyk.getUserPoolsSubscription();

    const initialLoad = firstValueFrom(poolXyk.accountLiquidityLoaded!);
    emitAccountPools(['quote-a', 'quote-b']);
    await initialLoad;

    expect(poolXyk.accountLiquidity.map(({ firstAddress, secondAddress }) => [firstAddress, secondAddress])).toEqual([
      ['base', 'quote-a'],
      ['base', 'quote-b'],
    ]);

    const partialDiscoveryUpdate = firstValueFrom(poolXyk.updated);
    emitAccountPools(['quote-b']);
    await partialDiscoveryUpdate;

    expect(poolXyk.accountLiquidity.map(({ firstAddress, secondAddress }) => [firstAddress, secondAddress])).toEqual([
      ['base', 'quote-a'],
      ['base', 'quote-b'],
    ]);

    const providerBalanceUpdate = firstValueFrom(poolXyk.updated);
    getProviderSubject(poolAccount('base', 'quote-a')).next(none());
    await providerBalanceUpdate;

    expect(poolXyk.accountLiquidity.map(({ firstAddress, secondAddress }) => [firstAddress, secondAddress])).toEqual([
      ['base', 'quote-b'],
    ]);
  });
});

describe('PoolXykModule execution history', () => {
  const firstAsset = { address: 'base', symbol: 'BASE', decimals: 18 } as Asset;
  const secondAsset = { address: 'quote', symbol: 'QUOTE', decimals: 18 } as Asset;

  /** Creates disconnected SDK dependencies for transaction construction without signing. */
  const createExecutionModule = () => {
    const pair = { address: 'signer-address' };
    const submitExtrinsic = vi.fn().mockResolvedValue(undefined);
    const depositExtrinsic = { kind: 'deposit' };
    const withdrawExtrinsic = { kind: 'withdraw' };
    const registerExtrinsic = { kind: 'register' };
    const initializeExtrinsic = { kind: 'initialize' };
    const batchExtrinsic = { kind: 'batch' };
    const batchAll = vi.fn(() => batchExtrinsic);
    const poolXyk = new PoolXykModule({
      account: { pair },
      api: {
        rpc: {
          tradingPair: { isPairEnabled: vi.fn().mockResolvedValue({ isTrue: false }) },
        },
        tx: {
          poolXYK: {
            depositLiquidity: vi.fn(() => depositExtrinsic),
            withdrawLiquidity: vi.fn(() => withdrawExtrinsic),
            initializePool: vi.fn(() => initializeExtrinsic),
          },
          tradingPair: { register: vi.fn(() => registerExtrinsic) },
          utility: { batchAll },
        },
      },
      assets: { addAccountAsset: vi.fn() },
      dex: { poolBaseAssetsIds: [firstAsset.address] },
      submitExtrinsic,
    } as never);

    vi.spyOn(poolXyk as any, 'arrangeAssetsForParams').mockReturnValue([firstAsset, secondAsset, '1', '2', 0]);
    vi.spyOn(poolXyk as any, 'calcAddTxParams').mockReturnValue({ args: ['add-call'] });
    vi.spyOn(poolXyk as any, 'calcRemoveTxParams').mockReturnValue({
      args: ['remove-call'],
      amountA: '1',
      amountB: '2',
    });

    return {
      poolXyk,
      pair,
      submitExtrinsic,
      depositExtrinsic,
      withdrawExtrinsic,
      registerExtrinsic,
      initializeExtrinsic,
      batchExtrinsic,
      batchAll,
    };
  };

  it('uses a caller-provided history id when adding liquidity', async () => {
    const { poolXyk, pair, submitExtrinsic, depositExtrinsic } = createExecutionModule();

    await poolXyk.add(firstAsset, secondAsset, '1', '2', '0.5', 'intent-add');

    expect(submitExtrinsic).toHaveBeenCalledWith(
      depositExtrinsic,
      pair,
      expect.objectContaining({ id: 'intent-add', type: expect.anything() })
    );
  });

  it('uses a caller-provided history id when removing liquidity', async () => {
    const { poolXyk, pair, submitExtrinsic, withdrawExtrinsic } = createExecutionModule();

    await poolXyk.remove(firstAsset, secondAsset, '1', '10', '20', '30', '0.5', 'intent-remove');

    expect(submitExtrinsic).toHaveBeenCalledWith(
      withdrawExtrinsic,
      pair,
      expect.objectContaining({ id: 'intent-remove', type: expect.anything() })
    );
  });

  it('uses a caller-provided history id for the pool-creation batch', async () => {
    const {
      poolXyk,
      pair,
      submitExtrinsic,
      depositExtrinsic,
      registerExtrinsic,
      initializeExtrinsic,
      batchExtrinsic,
      batchAll,
    } = createExecutionModule();
    vi.spyOn(poolXyk, 'check').mockResolvedValue(false);

    await poolXyk.create(firstAsset, secondAsset, '1', '2', '0.5', 'intent-create');

    expect(batchAll).toHaveBeenCalledExactlyOnceWith([registerExtrinsic, initializeExtrinsic, depositExtrinsic]);
    expect(submitExtrinsic).toHaveBeenCalledExactlyOnceWith(
      batchExtrinsic,
      pair,
      expect.objectContaining({ id: 'intent-create', type: Operation.CreatePair })
    );
  });
});
