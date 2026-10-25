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

  const createPoolXykModule = (accountPair = { address: 'account-address' }) =>
    new PoolXykModule({
      account: {
        pair: accountPair,
      },
      accountPair,
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

  it('cancels pending LP balances before the first emission when the account changes', async () => {
    const pair = { address: 'account-a' };
    const poolXyk = createPoolXykModule(pair);
    const oldBalance = new Subject<string>();
    vi.spyOn(poolXyk, 'getAccountPoolBalanceObservable').mockReturnValueOnce(oldBalance);
    const discoveryA = poolXyk.getUserPoolsSubscription();
    emitAccountPools(['quote-a']);
    expect(oldBalance.observed).toBe(true);

    poolXyk.clearAccountLiquidity();
    pair.address = 'account-b';
    expect(oldBalance.observed).toBe(false);
    const discoveryB = poolXyk.getUserPoolsSubscription();
    const readyB = vi.fn();
    poolXyk.accountLiquidityLoaded!.subscribe(readyB);
    await Promise.resolve();
    await Promise.resolve();
    expect(readyB).not.toHaveBeenCalled();
    expect(poolXyk.accountLiquidity).toEqual([]);

    const loadedB = firstValueFrom(poolXyk.accountLiquidityLoaded!);
    emitAccountPools(['quote-b']);
    await loadedB;
    expect(poolXyk.accountLiquidity.map(({ secondAddress }) => secondAddress)).toEqual(['quote-b']);
    pair.address = 'account-a';
    const discoveryA2 = poolXyk.getUserPoolsSubscription();
    const loadedA2 = firstValueFrom(poolXyk.accountLiquidityLoaded!);
    emitAccountPools(['quote-c']);
    await loadedA2;
    oldBalance.next('999');
    expect(poolXyk.accountLiquidity.map(({ secondAddress }) => secondAddress)).toEqual(['quote-c']);
    discoveryA.unsubscribe();
    discoveryB.unsubscribe();
    discoveryA2.unsubscribe();
    poolXyk.clearAccountLiquidity();
  });

  it('keeps discovery loading until shared pending pool balance subscriptions emit', async () => {
    const poolXyk = createPoolXykModule();
    const balance = new Subject<string>();
    vi.spyOn(poolXyk, 'getAccountPoolBalanceObservable').mockReturnValueOnce(balance);
    const discovery = poolXyk.getUserPoolsSubscription();
    const ready = vi.fn();
    poolXyk.accountLiquidityLoaded!.subscribe(ready);
    emitAccountPools(['quote-a']);
    emitAccountPools(['quote-a']);
    await Promise.resolve();
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    const loaded = firstValueFrom(poolXyk.accountLiquidityLoaded!);
    balance.next('10');
    await loaded;
    expect(poolXyk.accountLiquidity).toHaveLength(1);
    discovery.unsubscribe();
    poolXyk.clearAccountLiquidity();
  });

  it.each(['error', 'complete'] as const)(
    'rejects readiness when a pool balance stream ends with %s before loading',
    async (ending) => {
      const poolXyk = createPoolXykModule();
      const balance = new Subject<string>();
      vi.spyOn(poolXyk, 'getAccountPoolBalanceObservable').mockReturnValueOnce(balance);
      const discovery = poolXyk.getUserPoolsSubscription();
      const loaded = firstValueFrom(poolXyk.accountLiquidityLoaded!);
      const failedLoad = expect(loaded).rejects.toThrow(ending === 'error' ? 'RPC failed' : 'before its first balance');
      emitAccountPools(['quote-a']);
      if (ending === 'error') balance.error(new Error('RPC failed'));
      else balance.complete();
      await failedLoad;
      expect(balance.observed).toBe(false);
      expect(poolXyk.accountLiquidity).toEqual([]);
      discovery.unsubscribe();
    }
  );

  it('clears cached LP rows when subscribing for a different account without a prior logout', async () => {
    const pair = { address: 'account-a' };
    const poolXyk = createPoolXykModule(pair);
    const discoveryA = poolXyk.getUserPoolsSubscription();
    const loadedA = firstValueFrom(poolXyk.accountLiquidityLoaded!);
    emitAccountPools(['quote-a']);
    await loadedA;
    expect(poolXyk.accountLiquidity).toHaveLength(1);

    pair.address = 'account-b';
    const discoveryB = poolXyk.getUserPoolsSubscription();
    expect(poolXyk.accountLiquidity).toEqual([]);
    const loadedB = firstValueFrom(poolXyk.accountLiquidityLoaded!);
    emitAccountPools([]);
    await loadedB;
    expect(poolXyk.accountLiquidity).toEqual([]);
    discoveryA.unsubscribe();
    discoveryB.unsubscribe();
  });

  it('estimates minted pool tokens using each reserve asset precision', () => {
    const poolXyk = createPoolXykModule();
    const firstAsset: Asset = {
      address: 'base',
      symbol: 'BASE',
      name: 'Base',
      decimals: 12,
      isMintable: false,
    };
    const secondAsset: Asset = {
      address: 'quote',
      symbol: 'QUOTE',
      name: 'Quote',
      decimals: 18,
      isMintable: false,
    };

    const [minted, totalSupply] = poolXyk.estimatePoolTokensMinted(
      firstAsset,
      secondAsset,
      '0.5',
      '1',
      '1000000000000',
      '1000000000000000000',
      '100000000000000000000'
    );

    expect(minted).toBe('50000000000000000000');
    expect(totalSupply).toBe('100000000000000000000');
  });
});

describe('PoolXykModule execution history', () => {
  const firstAsset = { address: 'base', symbol: 'BASE', decimals: 18 } as Asset;
  const secondAsset = { address: 'quote', symbol: 'QUOTE', decimals: 18 } as Asset;

  const createExecutionModule = () => {
    const pair = { address: 'signer-address' };
    const submitExtrinsic = vi.fn().mockResolvedValue(undefined);
    const depositExtrinsic = { kind: 'deposit' };
    const withdrawExtrinsic = { kind: 'withdraw' };
    const poolXyk = new PoolXykModule({
      account: { pair },
      api: {
        tx: {
          poolXYK: {
            depositLiquidity: vi.fn(() => depositExtrinsic),
            withdrawLiquidity: vi.fn(() => withdrawExtrinsic),
          },
        },
      },
      assets: { addAccountAsset: vi.fn() },
      submitExtrinsic,
    } as never);

    vi.spyOn(poolXyk as any, 'arrangeAssetsForParams').mockReturnValue([firstAsset, secondAsset, '1', '2', 0]);
    vi.spyOn(poolXyk as any, 'calcAddTxParams').mockReturnValue({ args: ['add-call'] });
    vi.spyOn(poolXyk as any, 'calcRemoveTxParams').mockReturnValue({
      args: ['remove-call'],
      amountA: '1',
      amountB: '2',
    });

    return { poolXyk, pair, submitExtrinsic, depositExtrinsic, withdrawExtrinsic };
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
});
