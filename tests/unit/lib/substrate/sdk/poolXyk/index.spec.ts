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
