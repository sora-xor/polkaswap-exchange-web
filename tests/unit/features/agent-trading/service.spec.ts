import { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';
import { FPNumber } from '@sora-substrate/sdk';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPolkaswapAgentApi, type AgentTradingDependencies } from '@/features/agent-trading/service';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { Operation } from '@/lib/substrate/sdk/types';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { HistoryItem } from '@/lib/substrate/sdk/types';

const createAsset = (address: string, symbol: string): Asset => ({
  address,
  symbol,
  name: `${symbol} token`,
  decimals: 18,
  isMintable: true,
  type: 'Regular',
});

const createBalance = (transferable: string) => ({
  free: transferable,
  reserved: '0',
  frozen: '0',
  bonded: '0',
  locked: '0',
  total: transferable,
  transferable,
});

const createHarness = () => {
  const assetIn = createAsset('0xin', 'IN');
  const assetOut = createAsset('0xout', 'OUT');
  const poolToken = createAsset('0xpool', 'POOLXYK');
  const outputCodec = new FPNumber('2', 18).toCodecString();
  const minCodec = new FPNumber('1.9', 18).toCodecString();
  const reserveInCodec = new FPNumber('10', 18).toCodecString();
  const reserveOutCodec = new FPNumber('20', 18).toCodecString();
  const totalSupplyCodec = new FPNumber('100', 18).toCodecString();
  const liquidityBalanceCodec = new FPNumber('10', 18).toCodecString();
  const networkFeeCodec = new FPNumber('0.1', 18).toCodecString();
  const accountAssetIn = { ...assetIn, balance: createBalance(new FPNumber('100', 18).toCodecString()) };
  const accountAssetOut = { ...assetOut, balance: createBalance(new FPNumber('200', 18).toCodecString()) };
  const accountXor = { ...XOR, balance: createBalance(new FPNumber('10', 18).toCodecString()) };
  const history: HistoryItem[] = [];
  const settingsStore = {
    nodeIsConnected: true,
    appConnection: {
      connection: { endpoint: 'wss://node.test' },
      node: { address: 'wss://node.test' },
    },
    blockNumber: 42,
    isWalletLoaded: true,
    slippageTolerance: '0.5',
  };
  const walletStore = {
    availableWallets: [{ extensionName: 'polkadot-js', title: 'Polkadot.js', installed: true }],
    updateAvailableWallets: vi.fn(async () => undefined),
    loginAccount: vi.fn(async () => undefined),
    checkWalletAvailability: vi.fn(async () => undefined),
    beforeTransactionSign: vi.fn(async () => undefined),
    isWalletLoaded: true,
    isLoggedIn: true,
    address: 'cn-account',
    source: 'polkadot-js',
    networkFees: {
      [Operation.Swap]: networkFeeCodec,
      [Operation.Transfer]: networkFeeCodec,
      [Operation.AddLiquidity]: networkFeeCodec,
      [Operation.CreatePair]: networkFeeCodec,
      [Operation.RemoveLiquidity]: networkFeeCodec,
    },
    assets: [accountAssetIn, accountAssetOut, accountXor],
    accountAssetsAddressTable: {
      [assetIn.address]: accountAssetIn,
      [assetOut.address]: accountAssetOut,
      [XOR.address]: accountXor,
    },
  };
  const assetsStore = {
    assetDataByAddress: vi.fn((address?: string | null) => {
      return (
        [accountAssetIn, accountAssetOut, accountXor, poolToken].find((asset) => asset.address === address) ?? null
      );
    }),
  };
  const quoteData = {
    isAvailable: true,
    liquiditySources: [LiquiditySourceTypes.XYKPool],
    quote: vi.fn(() => ({
      dexId: 0,
      result: {
        amount: outputCodec,
        amountWithoutImpact: outputCodec,
        fee: '0',
        rewards: [],
        route: [assetIn.address, assetOut.address],
        distribution: [],
      },
    })),
  };
  const api = {
    accountPair: { address: 'cn-account' },
    dex: { publicDexes: [{ dexId: 0 }], poolBaseAssetsIds: [assetIn.address], baseAssetsIds: [assetIn.address] },
    historyList: history,
    getHistory: vi.fn((id: string) => history.find((item) => item.id === id) ?? null),
    formatAddress: vi.fn((address: string) => address),
    api: {
      genesisHash: { toString: () => '0xgenesis' },
      runtimeVersion: { specVersion: { toNumber: () => 123 } },
      rpc: {
        chain: {
          getBlockHash: vi.fn(),
          getBlock: vi.fn(),
          getHeader: vi.fn(),
        },
      },
    },
    system: { specVersion: 123 },
    assets: {
      getAssetInfo: vi.fn(),
      getAccountAsset: vi.fn(async (address: string) => {
        const accountAsset = [accountAssetIn, accountAssetOut, accountXor].find((asset) => asset.address === address);

        if (!accountAsset) throw new Error(`Unknown account asset: ${address}`);

        return accountAsset;
      }),
      simpleTransfer: vi.fn(async (asset: Asset, to: string, amount: string, historyId = 'transfer-1') => {
        history.push({
          id: historyId,
          txId: 'hash-transfer',
          type: Operation.Transfer,
          assetAddress: asset.address,
          amount,
          to,
          status: 'pending',
          startTime: 1_000,
        } as HistoryItem);
      }),
    },
    swap: {
      update: vi.fn(async () => undefined),
      checkSwap: vi.fn(async () => true),
      getDexesSwapQuoteObservable: vi.fn(() => of(quoteData)),
      getSwapQuoteObservable: vi.fn(() => of(quoteData)),
      getMinMaxValue: vi.fn(() => minCodec),
      getPriceImpact: vi.fn(() => '-1.00'),
      execute: vi.fn(async (...args: unknown[]) => {
        const historyId = `${args[8] ?? 'tx-1'}`;
        history.push({
          id: historyId,
          txId: 'hash-1',
          type: Operation.Swap,
          assetAddress: assetIn.address,
          asset2Address: assetOut.address,
          amount: '1',
          amount2: '2',
          liquiditySource: LiquiditySourceTypes.Default,
          status: 'pending',
          startTime: 1_000,
        } as HistoryItem);
      }),
    },
    poolXyk: {
      accountLiquidity: [
        {
          address: poolToken.address,
          firstAddress: assetIn.address,
          secondAddress: assetOut.address,
          firstBalance: reserveInCodec,
          secondBalance: reserveOutCodec,
          symbol: poolToken.symbol,
          decimals: poolToken.decimals,
          decimals2: assetOut.decimals,
          balance: liquidityBalanceCodec,
          name: poolToken.name,
          poolShare: '10',
          reserveA: reserveInCodec,
          reserveB: reserveOutCodec,
          totalSupply: totalSupplyCodec,
        },
      ],
      accountLiquidityLoaded: of(undefined),
      getUserPoolsSubscription: vi.fn(() => ({ unsubscribe: vi.fn() })),
      check: vi.fn(async () => true),
      getReserves: vi.fn(async () => [reserveInCodec, reserveOutCodec]),
      getTotalSupply: vi.fn(async () => totalSupplyCodec),
      getInfo: vi.fn(() => poolToken),
      estimatePoolTokensMinted: vi.fn(() => [new FPNumber('5', 18).toCodecString(), totalSupplyCodec]),
      estimateTokensRetrieved: vi.fn(() => [
        new FPNumber('1', 18).toCodecString(),
        new FPNumber('2', 18).toCodecString(),
      ]),
      add: vi.fn(
        async (
          _assetA: Asset,
          _assetB: Asset,
          amountA: string,
          amountB: string,
          _slippage: string,
          historyId = 'lp-add-1'
        ) => {
          history.push({
            id: historyId,
            txId: 'hash-lp-add',
            type: Operation.AddLiquidity,
            assetAddress: assetIn.address,
            asset2Address: assetOut.address,
            amount: amountA,
            amount2: amountB,
            status: 'pending',
            startTime: 1_000,
          } as HistoryItem);
        }
      ),
      create: vi.fn(
        async (
          _assetA: Asset,
          _assetB: Asset,
          amountA: string,
          amountB: string,
          _slippage: string,
          historyId = 'lp-create-1'
        ) => {
          history.push({
            id: historyId,
            txId: 'hash-lp-create',
            type: Operation.CreatePair,
            assetAddress: assetIn.address,
            asset2Address: assetOut.address,
            amount: amountA,
            amount2: amountB,
            status: 'pending',
            startTime: 1_000,
          } as HistoryItem);
        }
      ),
      remove: vi.fn(async (...args: unknown[]) => {
        const historyId = `${args[7] ?? 'lp-remove-1'}`;
        history.push({
          id: historyId,
          txId: 'hash-lp-remove',
          type: Operation.RemoveLiquidity,
          assetAddress: assetIn.address,
          asset2Address: assetOut.address,
          amount: '1',
          amount2: '2',
          status: 'pending',
          startTime: 1_000,
        } as HistoryItem);
      }),
    },
  };
  const walletProvider = {
    getAccounts: vi.fn(async () => [{ address: 'cn-account', name: 'Agent', source: 'polkadot-js' }]),
  };
  const deps = {
    api,
    getSettingsStore: () => settingsStore,
    getWalletStore: () => walletStore,
    getAssetsStore: () => assetsStore,
    getWalletProvider: vi.fn(async () => walletProvider),
    delay: vi.fn(async () => undefined),
    now: vi.fn(() => 1_000),
  } as unknown as AgentTradingDependencies;
  const agent = createPolkaswapAgentApi(deps);

  return {
    agent,
    api,
    settingsStore,
    walletStore,
    assetsStore,
    deps,
    assetIn,
    assetOut,
    poolToken,
    outputCodec,
    minCodec,
    reserveInCodec,
    reserveOutCodec,
    totalSupplyCodec,
  };
};

type AgentHarness = ReturnType<typeof createHarness>;

const PREPARED_INTENT_STORAGE_KEY = 'polkaswap.agent.prepared.v1';

const fabricatedIntentId = (action: 'swap' | 'transfer' | 'add-liquidity' | 'remove-liquidity'): string =>
  `polkaswap:${action}:sha256:${'a'.repeat(64)}`;

const expectDeepFrozen = (value: unknown, visited = new WeakSet<object>()): void => {
  if (!value || typeof value !== 'object' || visited.has(value)) return;

  visited.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value as Record<string, unknown>).forEach((entry) => expectDeepFrozen(entry, visited));
};

describe('PolkaswapAgent service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/#/swap');
  });

  it('reports node, wallet, and settings status', () => {
    const { agent } = createHarness();

    expect(agent.status()).toEqual(
      expect.objectContaining({
        version: 'v1',
        agent: {
          mode: false,
          disclaimerSuppressed: false,
          queryParam: 'polkaswap-agent',
        },
        node: expect.objectContaining({ connected: true, endpoint: 'wss://node.test' }),
        wallet: expect.objectContaining({ connected: true, address: 'cn-account' }),
        settings: { slippageTolerance: '0.5' },
      })
    );
    expect(agent.status().wallet.availableWallets[0]).toEqual(
      expect.objectContaining({
        source: 'polkadot-js',
        installed: true,
        available: true,
        supportsSigning: true,
        requiresUserApproval: true,
      })
    );
  });

  it('reports transient agent mode from the URL query', () => {
    window.history.replaceState({}, '', '/?polkaswap-agent=1#/swap');

    const { agent } = createHarness();

    expect(agent.status().agent).toEqual({
      mode: true,
      disclaimerSuppressed: true,
      queryParam: 'polkaswap-agent',
    });
  });

  it('reports live capabilities and wallet accounts for agent discovery', async () => {
    const { agent } = createHarness();

    expect(agent.capabilities()).toEqual(
      expect.objectContaining({
        version: 'v1',
        global: 'window.PolkaswapAgent',
        methods: expect.arrayContaining([
          'prepareSwap',
          'assessSwap',
          'maxTransferAmount',
          'recoverTransaction',
          'exportState',
          'subscribeTransactions',
        ]),
        defaults: expect.objectContaining({ side: 'input', dexId: 'best', allowPoolCreation: false }),
      })
    );
    await expect(agent.walletAccounts({ source: 'polkadot-js' })).resolves.toEqual([
      { address: 'cn-account', name: 'Agent', source: 'polkadot-js' },
    ]);
  });

  it('resolves canonical assets and exposes common assets', async () => {
    const { agent, assetIn } = createHarness();

    await expect(agent.resolveAsset({ asset: { address: assetIn.address }, includeBalance: true })).resolves.toEqual(
      expect.objectContaining({
        symbol: 'IN',
        canonical: false,
        balance: expect.objectContaining({ transferable: new FPNumber('100', 18).toCodecString() }),
      })
    );
    await expect(agent.commonAssets()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ symbol: 'XOR', canonical: true })])
    );
  });

  it('waits for the SDK account pair when wallet readiness is required', async () => {
    const { agent, api, deps } = createHarness();
    api.accountPair = null as never;
    deps.now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_000).mockReturnValueOnce(31_000);

    await expect(agent.ready({ requireWallet: true })).rejects.toMatchObject({ code: 'WALLET_NOT_CONNECTED' });
  });

  it('builds a best-DEX quote with codec values converted to natural amounts', async () => {
    const { agent, api, assetIn, assetOut, minCodec } = createHarness();

    const quote = await agent.quoteSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    expect(api.swap.update).toHaveBeenCalledTimes(1);
    expect(api.swap.checkSwap).toHaveBeenCalledWith(assetIn.address, assetOut.address, 0);
    expect(api.swap.getDexesSwapQuoteObservable).toHaveBeenCalledWith(assetIn.address, assetOut.address, []);
    expect(quote).toEqual(
      expect.objectContaining({
        dexId: 0,
        amountIn: '1',
        amountOut: '2',
        quoteDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        amountWithoutImpact: '2',
        amountInMeta: expect.objectContaining({ value: '1', display: '1 IN' }),
        amountOutMeta: expect.objectContaining({ value: '2', display: '2 OUT' }),
        minAmountOut: '1.9',
        minMaxCodec: minCodec,
        priceImpact: '-1.00',
      })
    );
  });

  it('serializes live split-route FPNumber distribution values before hashing the quote', async () => {
    const { agent, api, assetIn, assetOut, outputCodec } = createHarness();
    api.swap.getDexesSwapQuoteObservable.mockReturnValue(
      of({
        isAvailable: true,
        liquiditySources: [LiquiditySourceTypes.XYKPool],
        quote: vi.fn(() => ({
          dexId: 0,
          result: {
            amount: outputCodec,
            amountWithoutImpact: outputCodec,
            fee: '0',
            rewards: [],
            route: [assetIn.address, assetOut.address],
            distribution: [
              [
                {
                  market: LiquiditySourceTypes.XYKPool,
                  income: new FPNumber('1'),
                  outcome: new FPNumber('2'),
                  fee: new FPNumber('0.01'),
                  input: assetIn.address,
                  output: assetOut.address,
                },
              ],
            ],
          },
        })),
      })
    );

    const quote = await agent.quoteSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    expect(quote.distribution).toEqual([
      [
        {
          market: LiquiditySourceTypes.XYKPool,
          income: '1',
          outcome: '2',
          fee: '0.01',
          input: assetIn.address,
          output: assetOut.address,
        },
      ],
    ]);
    expect(() => JSON.stringify(quote)).not.toThrow();
    expect(quote.quoteDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('prepares swaps with intent, fees, balance requirements, and warnings', async () => {
    const { agent } = createHarness();

    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    expect(prepared).toEqual(
      expect.objectContaining({
        intentId: expect.stringMatching(/^polkaswap:swap:sha256:[0-9a-f]{64}$/),
        canExecute: true,
        envelope: expect.objectContaining({
          action: 'swap',
          quoteDigest: prepared.quote.quoteDigest,
          callDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
          preparedAtBlock: 42,
          expiresAtBlock: 62,
          network: { genesisHash: '0xgenesis', runtimeSpecVersion: 123 },
        }),
        revalidation: expect.objectContaining({ valid: true, requiresReapproval: false }),
        preview: expect.objectContaining({
          sdkCall: 'api.swap.execute',
          args: expect.objectContaining({ amountIn: '1', amountOut: '2', dexId: 0 }),
        }),
        fees: [expect.objectContaining({ operation: Operation.Swap, amount: '0.1' })],
        requiredBalances: expect.arrayContaining([
          expect.objectContaining({ asset: expect.objectContaining({ symbol: 'IN' }), sufficient: true }),
          expect.objectContaining({ asset: expect.objectContaining({ symbol: 'XOR' }), sufficient: true }),
        ]),
      })
    );
  });

  it('plans a swap without accessing connected account identity, balances, signer, or storage', async () => {
    const { agent, api, assetIn, assetOut, walletStore, assetsStore } = createHarness();
    const denyAccountAccess = vi.fn(() => {
      throw new Error('Account access is forbidden during public planning');
    });
    for (const key of ['address', 'source', 'isLoggedIn', 'availableWallets', 'assets', 'accountAssetsAddressTable']) {
      Object.defineProperty(walletStore, key, { configurable: true, get: denyAccountAccess });
    }
    Object.defineProperty(api, 'accountPair', { configurable: true, get: denyAccountAccess });
    const publicAssets = [assetIn, assetOut, XOR].map((asset) => {
      const metadata = { ...asset };
      Object.defineProperty(metadata, 'balance', { get: denyAccountAccess });
      return metadata;
    });
    assetsStore.assetDataByAddress.mockImplementation(
      (address) => (publicAssets.find((asset) => asset.address === address) ?? null) as never
    );
    api.assets.getAccountAsset.mockImplementation(denyAccountAccess);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    try {
      const plan = await agent.planSwap({
        assetIn: { address: assetIn.address },
        assetOut: { address: assetOut.address },
        amount: '1',
      });
      expect(plan).toMatchObject({
        mode: 'unsigned',
        canExecute: false,
        requiresWallet: false,
        quote: { amountIn: '1', amountOut: '2', minAmountOut: '1.9' },
        preview: {
          sdkCall: 'api.swap.execute',
          stateChanging: true,
          args: { amountIn: '1', amountOut: '2', isExchangeB: false },
        },
        fees: [{ amount: '0.1', source: 'static' }],
        warnings: [],
        plannedAt: 1_000,
        expiresAt: 301_000,
        network: { genesisHash: '0xgenesis', runtimeSpecVersion: 123, blockNumber: 42 },
      });
      expect(plan).not.toHaveProperty('intentId');
      expect(plan).not.toHaveProperty('envelope');
      expect(plan).not.toHaveProperty('requiredBalances');
      expect(plan.preview).not.toHaveProperty('signer');
      expect(plan.preview).not.toHaveProperty('encodedCall');
      expect(JSON.stringify(plan)).not.toContain('cn-account');
      expectDeepFrozen(plan);
      expect(denyAccountAccess).not.toHaveBeenCalled();
      expect(api.assets.getAccountAsset).not.toHaveBeenCalled();
      expect(api.swap.execute).not.toHaveBeenCalled();
      expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
      expect(setItem).not.toHaveBeenCalled();
      expect(removeItem).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
      removeItem.mockRestore();
    }
  });

  it('keeps planning quote digests identical to ordinary quotes and respects exact output', async () => {
    const { agent, assetIn, assetOut } = createHarness();
    const request = {
      assetIn: { address: assetIn.address },
      assetOut: { address: assetOut.address },
      amount: '7',
      side: 'output' as const,
    };
    const quote = await agent.quoteSwap(request);
    const plan = await agent.planSwap(request);
    expect(plan.quote).toEqual(quote);
    expect(plan.quote.amountIn).toBe('2');
    expect(plan.quote.amountOut).toBe('7');
    expect(plan.quote.maxAmountIn).toBe('1.9');
    expect(plan.quote.minAmountOut).toBeUndefined();
    expect(plan.preview.args).toMatchObject({ amountIn: '2', amountOut: '7', isExchangeB: true });
  });

  it('plans canonical symbols independently of wallet-only asset metadata', async () => {
    const { agent, walletStore } = createHarness();
    Object.defineProperty(walletStore, 'assets', {
      get: () => {
        throw new Error('No wallet assets');
      },
    });
    const plan = await agent.planSwap({ assetIn: { symbol: 'XOR' }, assetOut: { symbol: 'PSWAP' }, amount: '1' });
    expect(plan.quote.assetIn.symbol).toBe('XOR');
    expect(plan.quote.assetOut.symbol).toBe('PSWAP');
  });

  it.each(['missing', 'zero', 'malformed'])(
    'reports %s fees and price impact in nonauthorizing plans',
    async (kind) => {
      const { agent, api, walletStore, assetIn, assetOut } = createHarness();
      if (kind === 'missing') delete walletStore.networkFees[Operation.Swap];
      else walletStore.networkFees[Operation.Swap] = kind === 'zero' ? '0' : 'invalid';
      api.swap.getPriceImpact.mockReturnValue('-20');
      const plan = await agent.planSwap({
        assetIn: { address: assetIn.address },
        assetOut: { address: assetOut.address },
        amount: '1',
      });
      expect(plan.canExecute).toBe(false);
      expect(plan.fees[0]).toMatchObject({ amount: '0', source: 'unavailable' });
      expect(plan.warnings.map(({ code }) => code)).toEqual(['FEE_UNAVAILABLE', 'HIGH_PRICE_IMPACT']);
      expect(localStorage.getItem(PREPARED_INTENT_STORAGE_KEY)).toBeNull();
    }
  );

  it('waits for node readiness without inspecting wallet status', async () => {
    const { agent, settingsStore, deps, walletStore, assetIn, assetOut } = createHarness();
    settingsStore.nodeIsConnected = false;
    Object.defineProperty(walletStore, 'address', {
      get: () => {
        throw new Error('No wallet status');
      },
    });
    deps.delay = vi.fn(async () => {
      settingsStore.nodeIsConnected = true;
    });
    const plan = await agent.planSwap({
      assetIn: { address: assetIn.address },
      assetOut: { address: assetOut.address },
      amount: '1',
      quoteTimeoutMs: 100,
    });
    expect(deps.delay).toHaveBeenCalledWith(100);
    expect(plan.requiresWallet).toBe(false);
  });

  it('bounds the node readiness wait and never quotes after timeout', async () => {
    const { agent, settingsStore, api, deps, assetIn, assetOut } = createHarness();
    settingsStore.nodeIsConnected = false;
    await expect(
      agent.planSwap({
        assetIn: { address: assetIn.address },
        assetOut: { address: assetOut.address },
        amount: '1',
        quoteTimeoutMs: 100,
      })
    ).rejects.toMatchObject({ code: 'NODE_NOT_READY' });
    expect(deps.delay).toHaveBeenCalledTimes(1);
    expect(deps.delay).toHaveBeenCalledWith(100);
    expect(api.swap.update).not.toHaveBeenCalled();
  });

  it.each(['genesis', 'runtime', 'block', 'missing-block', 'null-block'])(
    'rejects %s planning context before quoting',
    async (kind) => {
      const { agent, api, settingsStore, assetIn, assetOut } = createHarness();
      if (kind === 'genesis') api.api.genesisHash.toString = () => '';
      if (kind === 'runtime') api.system.specVersion = Number.NaN;
      if (kind === 'block') settingsStore.blockNumber = -1;
      if (kind === 'missing-block') settingsStore.blockNumber = undefined as never;
      if (kind === 'null-block') settingsStore.blockNumber = null as never;
      await expect(
        agent.planSwap({ assetIn: { address: assetIn.address }, assetOut: { address: assetOut.address }, amount: '1' })
      ).rejects.toMatchObject({ code: 'NETWORK_CONTEXT_UNAVAILABLE' });
      expect(api.swap.update).not.toHaveBeenCalled();
    }
  );

  it('rejects a chain change during planning and leaves no executable intent', async () => {
    const { agent, api, assetIn, assetOut } = createHarness();
    api.swap.update.mockImplementation(async () => {
      api.system.specVersion += 1;
    });
    await expect(
      agent.planSwap({ assetIn: { address: assetIn.address }, assetOut: { address: assetOut.address }, amount: '1' })
    ).rejects.toMatchObject({ code: 'NETWORK_CONTEXT_UNAVAILABLE' });
    expect(localStorage.getItem(PREPARED_INTENT_STORAGE_KEY)).toBeNull();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('bounds a hanging SDK warm-up across the entire planning quote phase', async () => {
    vi.useFakeTimers();
    try {
      const { agent, api, assetIn, assetOut } = createHarness();
      let releaseWarmup!: () => void;
      api.swap.update.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            releaseWarmup = resolve;
          })
      );
      const pending = agent.planSwap({
        assetIn: { address: assetIn.address },
        assetOut: { address: assetOut.address },
        amount: '1',
        quoteTimeoutMs: 100,
      });
      const outcome = pending.then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
      );
      await vi.advanceTimersByTimeAsync(100);
      expect(await outcome).toMatchObject({ error: { code: 'QUOTE_TIMEOUT', details: { timeoutMs: 100 } } });
      expect(vi.getTimerCount()).toBe(0);
      releaseWarmup();
      await vi.advanceTimersByTimeAsync(100);
      expect(await outcome).toMatchObject({ error: { code: 'QUOTE_TIMEOUT' } });
      expect(localStorage.getItem(PREPARED_INTENT_STORAGE_KEY)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('absorbs SDK failures after the plan deadline and clears the timer on quick success', async () => {
    vi.useFakeTimers();
    try {
      const { agent, api, assetIn, assetOut } = createHarness();
      let releaseWarmup!: () => void;
      api.swap.update.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseWarmup = resolve;
          })
      );
      const request = {
        assetIn: { address: assetIn.address },
        assetOut: { address: assetOut.address },
        amount: '1',
        quoteTimeoutMs: 100,
      };
      const pending = agent.planSwap(request).then(
        (value) => ({ value }),
        (error: unknown) => ({ error })
      );
      await vi.advanceTimersByTimeAsync(100);
      expect(await pending).toMatchObject({ error: { code: 'QUOTE_TIMEOUT' } });
      api.swap.getDexesSwapQuoteObservable.mockImplementationOnce(() => {
        throw new Error('Late SDK failure');
      });
      releaseWarmup();
      await vi.advanceTimersByTimeAsync(100);
      expect(await pending).toMatchObject({ error: { code: 'QUOTE_TIMEOUT' } });
      expect(vi.getTimerCount()).toBe(0);
      await expect(agent.planSwap(request)).resolves.toMatchObject({ mode: 'unsigned' });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['missing', undefined],
    ['zero', '0'],
    ['malformed', 'not-a-codec-value'],
  ])('fails closed when the %s network fee estimate is unavailable', async (_case, feeCodec) => {
    const { agent, api, walletStore } = createHarness();
    if (feeCodec === undefined) {
      delete walletStore.networkFees[Operation.Swap];
    } else {
      walletStore.networkFees[Operation.Swap] = feeCodec;
    }

    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    expect(prepared.fees).toEqual([
      expect.objectContaining({ operation: Operation.Swap, amount: '0', amountCodec: '0', source: 'unavailable' }),
    ]);
    expect(prepared.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'FEE_UNAVAILABLE', severity: 'critical' })])
    );
    expect(prepared.canExecute).toBe(false);
    await expect(
      agent.executeSwap({ intentId: prepared.intentId, clientOrderId: `fee-unavailable-${_case}` })
    ).rejects.toMatchObject({
      code: 'INTENT_MISMATCH',
      details: expect.objectContaining({
        reasons: expect.arrayContaining(['fee-revalidation-unavailable', 'prepared-not-executable']),
      }),
    });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('refreshes live XOR gas balance when cached account assets are stale zero', async () => {
    const { agent, api, assetsStore, walletStore, assetIn, assetOut } = createHarness();
    const staleXor = { ...XOR, balance: createBalance('0') };
    const liveXorCodec = new FPNumber('1.2', 18).toCodecString();
    const liveXor = { ...XOR, balance: createBalance(liveXorCodec) };
    const originalAssetDataByAddress = assetsStore.assetDataByAddress;

    walletStore.accountAssetsAddressTable[XOR.address] = staleXor;
    walletStore.assets = walletStore.assets.map((asset) => (asset.address === XOR.address ? staleXor : asset));
    assetsStore.assetDataByAddress = vi.fn((address?: string | null) =>
      address === XOR.address ? staleXor : originalAssetDataByAddress(address)
    );
    api.assets.getAccountAsset.mockResolvedValueOnce(liveXor);

    const prepared = await agent.prepareSwap({
      assetIn: { address: assetIn.address },
      assetOut: { address: assetOut.address },
      amount: '1',
    });
    const xorRequiredBalance = prepared.requiredBalances.find((balance) => balance.asset.address === XOR.address);

    expect(api.assets.getAccountAsset).toHaveBeenCalledWith(XOR.address, 'cn-account');
    expect(xorRequiredBalance).toEqual(
      expect.objectContaining({
        available: '1.2',
        availableCodec: liveXorCodec,
        sufficient: true,
      })
    );
    expect(prepared.warnings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INSUFFICIENT_BALANCE',
          details: expect.objectContaining({ asset: expect.objectContaining({ symbol: 'XOR' }) }),
        }),
      ])
    );
  });

  it('rejects quote requests when the node is not ready', async () => {
    const { agent, settingsStore } = createHarness();
    settingsStore.nodeIsConnected = false;

    await expect(
      agent.quoteSwap({ assetIn: { symbol: 'IN' }, assetOut: { symbol: 'OUT' }, amount: '1' })
    ).rejects.toMatchObject({ code: 'NODE_NOT_READY' });
  });

  it('rejects quote requests for unavailable paths', async () => {
    const { agent, api } = createHarness();
    api.swap.checkSwap.mockResolvedValue(false);

    await expect(
      agent.quoteSwap({ assetIn: { symbol: 'IN' }, assetOut: { symbol: 'OUT' }, amount: '1' })
    ).rejects.toMatchObject({
      code: 'PATH_UNAVAILABLE',
      details: expect.objectContaining({ dexIds: expect.arrayContaining([0]) }),
    });
  });

  it('maps unusable quote results to path unavailable', async () => {
    const { agent, api } = createHarness();
    api.swap.getDexesSwapQuoteObservable.mockReturnValue(
      of({
        isAvailable: true,
        liquiditySources: [LiquiditySourceTypes.XYKPool],
        quote: vi.fn(() => ({ dexId: 0, result: undefined })),
      })
    );

    await expect(
      agent.quoteSwap({ assetIn: { symbol: 'IN' }, assetOut: { symbol: 'OUT' }, amount: '1' })
    ).rejects.toMatchObject({ code: 'PATH_UNAVAILABLE' });
  });

  it('waits for the first usable quote result from the live quote stream', async () => {
    const { agent, api, assetIn, assetOut, outputCodec } = createHarness();
    api.swap.getDexesSwapQuoteObservable.mockReturnValue(
      of(
        {
          isAvailable: true,
          liquiditySources: [LiquiditySourceTypes.XYKPool],
          quote: vi.fn(() => ({
            dexId: 0,
            result: {
              amount: '0',
              amountWithoutImpact: '0',
              fee: '0',
              rewards: [],
              route: [assetIn.address, assetOut.address],
              distribution: [],
            },
          })),
        },
        {
          isAvailable: true,
          liquiditySources: [LiquiditySourceTypes.XYKPool],
          quote: vi.fn(() => ({
            dexId: 0,
            result: {
              amount: outputCodec,
              amountWithoutImpact: outputCodec,
              fee: '0',
              rewards: [],
              route: [assetIn.address, assetOut.address],
              distribution: [],
            },
          })),
        }
      )
    );

    await expect(
      agent.quoteSwap({ assetIn: { symbol: 'IN' }, assetOut: { symbol: 'OUT' }, amount: '1' })
    ).resolves.toMatchObject({ amountOut: '2' });
  });

  it('rejects missing execution identifiers for every state-changing method before signer or SDK access', async () => {
    const { agent, api, walletStore } = createHarness();
    const executions = [
      {
        action: 'swap' as const,
        execute: (request: { intentId?: string; clientOrderId?: string }) => agent.executeSwap(request as never),
      },
      {
        action: 'transfer' as const,
        execute: (request: { intentId?: string; clientOrderId?: string }) => agent.executeTransfer(request as never),
      },
      {
        action: 'add-liquidity' as const,
        execute: (request: { intentId?: string; clientOrderId?: string }) =>
          agent.executeAddLiquidity(request as never),
      },
      {
        action: 'remove-liquidity' as const,
        execute: (request: { intentId?: string; clientOrderId?: string }) =>
          agent.executeRemoveLiquidity(request as never),
      },
    ];

    for (const { action, execute } of executions) {
      await expect(execute({ clientOrderId: `${action}-missing-intent` })).rejects.toMatchObject({
        code: 'INTENT_REQUIRED',
      });
      await expect(execute({ intentId: fabricatedIntentId(action) })).rejects.toMatchObject({
        code: 'INVALID_CLIENT_ORDER_ID',
      });
    }

    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
    expect(api.assets.simpleTransfer).not.toHaveBeenCalled();
    expect(api.poolXyk.add).not.toHaveBeenCalled();
    expect(api.poolXyk.create).not.toHaveBeenCalled();
    expect(api.poolXyk.remove).not.toHaveBeenCalled();
  });

  it('does not accept a read-only quote digest as an executable prepared intent', async () => {
    const { agent, api, walletStore } = createHarness();
    const quote = await agent.quoteSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    await expect(
      agent.executeSwap({ intentId: quote.quoteDigest, clientOrderId: 'quote-digest-is-not-an-intent' })
    ).rejects.toMatchObject({ code: 'INTENT_MISMATCH' });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('rejects a well-formed but non-issued intent before signer or SDK access', async () => {
    const { agent, api, walletStore } = createHarness();

    await expect(
      agent.executeSwap({ intentId: fabricatedIntentId('swap'), clientOrderId: 'fabricated-intent' })
    ).rejects.toMatchObject({ code: 'INTENT_NOT_FOUND' });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('issues unique nonces for identical preparations and deeply freezes returned authorization material', async () => {
    const { agent } = createHarness();
    const request = {
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    };

    const first = await agent.prepareSwap(request);
    const second = await agent.prepareSwap(request);

    expect(first.envelope.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(second.envelope.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(second.envelope.nonce).not.toBe(first.envelope.nonce);
    expect(second.intentId).not.toBe(first.intentId);
    expectDeepFrozen(first);
    expectDeepFrozen(second);
  });

  it('detects a tampered persisted envelope before signer or SDK access', async () => {
    const { agent, api, deps, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    const stored = JSON.parse(localStorage.getItem(PREPARED_INTENT_STORAGE_KEY) ?? '{}') as Record<
      string,
      {
        updatedAt: number;
        prepared: { envelope: { call: { args: Record<string, unknown> } } };
      }
    >;
    stored[prepared.intentId].prepared.envelope.call.args.amountIn = '999';
    stored[prepared.intentId].updatedAt += 1;
    localStorage.setItem(PREPARED_INTENT_STORAGE_KEY, JSON.stringify(stored));
    const restartedAgent = createPolkaswapAgentApi(deps);

    await expect(
      restartedAgent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'tampered-envelope' })
    ).rejects.toMatchObject({
      code: 'INTENT_INTEGRITY_FAILED',
      details: expect.objectContaining({
        reasons: expect.arrayContaining(['call-digest-mismatch', 'intent-digest-mismatch']),
      }),
    });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('rejects a malformed persisted fee ceiling as an integrity failure before signing', async () => {
    const { agent, api, deps, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    const stored = JSON.parse(localStorage.getItem(PREPARED_INTENT_STORAGE_KEY) ?? '{}') as Record<
      string,
      {
        updatedAt: number;
        prepared: { envelope: { feeCeilings: Array<{ amountCodec: string }> } };
      }
    >;
    stored[prepared.intentId].prepared.envelope.feeCeilings[0].amountCodec = 'not-a-codec-value';
    stored[prepared.intentId].updatedAt += 1;
    localStorage.setItem(PREPARED_INTENT_STORAGE_KEY, JSON.stringify(stored));
    const restartedAgent = createPolkaswapAgentApi(deps);

    await expect(
      restartedAgent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'malformed-fee-ceiling' })
    ).rejects.toMatchObject({
      code: 'INTENT_INTEGRITY_FAILED',
      details: expect.objectContaining({
        requiresReapproval: true,
        reasons: expect.arrayContaining(['fee-ceiling-invalid', 'intent-digest-mismatch']),
      }),
    });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it.each([
    {
      boundary: 'wall-clock',
      reason: 'time-expired',
      expire: (harness: AgentHarness, expiresAt: number) => {
        harness.deps.now = vi.fn(() => expiresAt + 1);
      },
    },
    {
      boundary: 'block-height',
      reason: 'block-expired',
      expire: (harness: AgentHarness, _expiresAt: number, expiresAtBlock: number) => {
        harness.settingsStore.blockNumber = expiresAtBlock + 1;
      },
    },
  ])('rejects an intent after its $boundary expiry before signing', async ({ reason, expire }) => {
    const harness = createHarness();
    const prepared = await harness.agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    expire(harness, prepared.envelope.expiresAt, prepared.envelope.expiresAtBlock);

    await expect(
      harness.agent.executeSwap({ intentId: prepared.intentId, clientOrderId: `expired-${reason}` })
    ).rejects.toMatchObject({
      code: 'INTENT_EXPIRED',
      details: expect.objectContaining({ reasons: expect.arrayContaining([reason]) }),
    });
    expect(harness.walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(harness.api.swap.execute).not.toHaveBeenCalled();
  });

  it.each([
    {
      boundary: 'genesis hash',
      reason: 'genesis-hash-changed',
      mutate: (harness: AgentHarness) => {
        harness.api.api.genesisHash = { toString: () => '0xother-genesis' };
      },
    },
    {
      boundary: 'runtime version',
      reason: 'runtime-version-changed',
      mutate: (harness: AgentHarness) => {
        harness.api.system.specVersion = 124;
      },
    },
    {
      boundary: 'signer',
      reason: 'signer-changed',
      mutate: (harness: AgentHarness) => {
        harness.api.accountPair.address = 'cn-other-account';
        harness.walletStore.address = 'cn-other-account';
      },
    },
    {
      boundary: 'fee ceiling',
      reason: 'fee-ceiling-exceeded',
      mutate: (harness: AgentHarness) => {
        harness.walletStore.networkFees[Operation.Swap] = new FPNumber('0.2', 18).toCodecString();
      },
    },
    {
      boundary: 'fee availability',
      reason: 'fee-revalidation-unavailable',
      mutate: (harness: AgentHarness) => {
        harness.walletStore.networkFees[Operation.Swap] = '0';
      },
    },
  ])('rejects $boundary drift before signer or SDK access', async ({ reason, mutate }) => {
    const harness = createHarness();
    const prepared = await harness.agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    mutate(harness);

    await expect(
      harness.agent.executeSwap({ intentId: prepared.intentId, clientOrderId: `drift-${reason}` })
    ).rejects.toMatchObject({
      code: 'INTENT_MISMATCH',
      details: expect.objectContaining({ reasons: expect.arrayContaining([reason]) }),
    });
    expect(harness.walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(harness.api.swap.execute).not.toHaveBeenCalled();
  });

  it('requires reapproval when the live swap route changes after preparation', async () => {
    const { agent, api, walletStore, assetIn, assetOut, outputCodec } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    api.swap.getDexesSwapQuoteObservable.mockReturnValue(
      of({
        isAvailable: true,
        liquiditySources: [LiquiditySourceTypes.XYKPool],
        quote: vi.fn(() => ({
          dexId: 0,
          result: {
            amount: outputCodec,
            amountWithoutImpact: outputCodec,
            fee: '0',
            rewards: [],
            route: [assetIn.address, '0xchanged-route', assetOut.address],
            distribution: [],
          },
        })),
      })
    );

    await expect(
      agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'changed-route' })
    ).rejects.toMatchObject({
      code: 'INTENT_MISMATCH',
      details: expect.objectContaining({
        requiresReapproval: true,
        reasons: expect.arrayContaining(['market-quote-changed']),
      }),
    });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('rejects execution without a connected wallet', async () => {
    const { agent, api, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    api.accountPair = null as never;
    walletStore.isLoggedIn = false;

    await expect(
      agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'wallet-missing' })
    ).rejects.toMatchObject({ code: 'WALLET_NOT_CONNECTED' });
    expect(api.swap.execute).not.toHaveBeenCalled();
  });

  it('maps signing cancellation to a stable structured error', async () => {
    const { agent, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    walletStore.beforeTransactionSign.mockRejectedValue(new Error('Cancelled'));

    await expect(agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'cancelled' })).rejects.toMatchObject({
      code: 'SIGNING_CANCELLED',
    });
  });

  it('executes swaps through the existing SDK and returns the submitted transaction', async () => {
    const { agent, api, walletStore, assetIn, assetOut } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    const execution = await agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'swap-submit' });

    expect(walletStore.beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(api.swap.execute).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      expect.objectContaining(assetOut),
      '1',
      '2',
      '0.5',
      false,
      LiquiditySourceTypes.Default,
      0,
      prepared.intentId
    );
    expect(execution.transaction).toEqual(
      expect.objectContaining({
        id: prepared.intentId,
        txId: 'hash-1',
        status: 'pending',
      })
    );
    expect(agent.transactionStatus({ id: prepared.intentId }).transaction?.txId).toBe('hash-1');
    expect(agent.transactionStatus({ txId: 'hash-1' })).toEqual(
      expect.objectContaining({
        source: 'idempotency',
        transaction: expect.objectContaining({ id: prepared.intentId }),
      })
    );
  });

  it('submits the exact stored call arguments even when caller request objects and settings later change', async () => {
    const { agent, api, settingsStore, assetIn, assetOut, reserveInCodec, reserveOutCodec, totalSupplyCodec } =
      createHarness();
    const swapRequest = {
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    };
    const transferRequest = { asset: { symbol: 'IN' }, to: 'cn-recipient', amount: '1.5' };
    const addRequest = { assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' }, amountA: '1' };
    const removeRequest = {
      assetA: { symbol: 'IN' },
      assetB: { symbol: 'OUT' },
      liquidityAmount: '5',
    };
    const [swap, transfer, add, remove] = await Promise.all([
      agent.prepareSwap(swapRequest),
      agent.prepareTransfer(transferRequest),
      agent.prepareAddLiquidity(addRequest),
      agent.prepareRemoveLiquidity(removeRequest),
    ]);

    swapRequest.amount = '99';
    transferRequest.to = 'cn-mutated-recipient';
    transferRequest.amount = '99';
    addRequest.amountA = '99';
    removeRequest.liquidityAmount = '99';
    settingsStore.slippageTolerance = '9';

    await agent.executeSwap({ intentId: swap.intentId, clientOrderId: 'stored-call-swap' });
    await agent.executeTransfer({ intentId: transfer.intentId, clientOrderId: 'stored-call-transfer' });
    await agent.executeAddLiquidity({ intentId: add.intentId, clientOrderId: 'stored-call-add' });
    await agent.executeRemoveLiquidity({ intentId: remove.intentId, clientOrderId: 'stored-call-remove' });

    expect(api.swap.execute).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      expect.objectContaining(assetOut),
      '1',
      '2',
      '0.5',
      false,
      LiquiditySourceTypes.Default,
      0,
      swap.intentId
    );
    expect(api.assets.simpleTransfer).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      'cn-recipient',
      '1.5',
      transfer.intentId
    );
    expect(api.poolXyk.add).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      expect.objectContaining(assetOut),
      '1',
      '2',
      '0.5',
      add.intentId
    );
    expect(api.poolXyk.remove).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      expect.objectContaining(assetOut),
      '5',
      reserveInCodec,
      reserveOutCodec,
      totalSupplyCodec,
      '0.5',
      remove.intentId
    );
  });

  it('deduplicates signed execution retries with clientOrderId', async () => {
    const { agent, api } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    const first = await agent.executeSwap({
      intentId: prepared.intentId,
      clientOrderId: 'swap-order-1',
    });
    const second = await agent.executeSwap({
      intentId: prepared.intentId,
      clientOrderId: 'swap-order-1',
    });

    expect(api.swap.execute).toHaveBeenCalledTimes(1);
    expect(first.reusedClientOrder).toBe(false);
    expect(second).toEqual(expect.objectContaining({ reusedClientOrder: true, transaction: first.transaction }));
    expect(agent.transactionStatus({ id: 'swap-order-1' })).toEqual(
      expect.objectContaining({
        source: 'idempotency',
        idempotency: expect.objectContaining({ clientOrderId: 'swap-order-1', action: 'swap' }),
      })
    );
  });

  it('rejects replaying one consumed intent under a different client order', async () => {
    const { agent, api, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });

    await agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'single-use-first' });
    await expect(
      agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'single-use-replay' })
    ).rejects.toMatchObject({
      code: 'INTENT_ALREADY_USED',
      details: expect.objectContaining({ clientOrderId: 'single-use-first', status: 'submitted' }),
    });
    expect(walletStore.beforeTransactionSign).toHaveBeenCalledTimes(1);
    expect(api.swap.execute).toHaveBeenCalledTimes(1);
  });

  it('serializes concurrent duplicate execution so only one signer and SDK submission occurs', async () => {
    const { agent, api, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    let releaseSubmission!: () => void;
    const submissionGate = new Promise<void>((resolve) => {
      releaseSubmission = resolve;
    });
    const originalExecute = api.swap.execute.getMockImplementation();
    api.swap.execute.mockImplementationOnce(async (...args: Parameters<NonNullable<typeof originalExecute>>) => {
      await submissionGate;
      await originalExecute?.(...args);
    });

    const firstExecution = agent.executeSwap({
      intentId: prepared.intentId,
      clientOrderId: 'concurrent-order',
    });
    const secondExecution = agent.executeSwap({
      intentId: prepared.intentId,
      clientOrderId: 'concurrent-order',
    });
    await vi.waitFor(() => expect(api.swap.execute).toHaveBeenCalledTimes(1));
    releaseSubmission();
    const [first, second] = await Promise.all([firstExecution, secondExecution]);

    expect(walletStore.beforeTransactionSign).toHaveBeenCalledTimes(1);
    expect(api.swap.execute).toHaveBeenCalledTimes(1);
    expect([first.reusedClientOrder, second.reusedClientOrder].sort()).toEqual([false, true]);
    expect(second.transaction).toEqual(first.transaction);
  });

  it('serializes one clientOrderId across different intents so only one can sign', async () => {
    const { agent, api, walletStore } = createHarness();
    const [firstPrepared, secondPrepared] = await Promise.all([
      agent.prepareSwap({ assetIn: { symbol: 'IN' }, assetOut: { symbol: 'OUT' }, amount: '1' }),
      agent.prepareSwap({ assetIn: { symbol: 'IN' }, assetOut: { symbol: 'OUT' }, amount: '1' }),
    ]);
    let releaseSubmission!: () => void;
    const submissionGate = new Promise<void>((resolve) => {
      releaseSubmission = resolve;
    });
    const originalExecute = api.swap.execute.getMockImplementation();
    api.swap.execute.mockImplementationOnce(async (...args: Parameters<NonNullable<typeof originalExecute>>) => {
      await submissionGate;
      await originalExecute?.(...args);
    });

    const firstExecution = agent.executeSwap({
      intentId: firstPrepared.intentId,
      clientOrderId: 'concurrent-shared-order',
    });
    await vi.waitFor(() => expect(api.swap.execute).toHaveBeenCalledTimes(1));
    const conflictingExecution = expect(
      agent.executeSwap({
        intentId: secondPrepared.intentId,
        clientOrderId: 'concurrent-shared-order',
      })
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    releaseSubmission();

    await expect(firstExecution).resolves.toMatchObject({ reusedClientOrder: false });
    await conflictingExecution;
    expect(walletStore.beforeTransactionSign).toHaveBeenCalledTimes(1);
    expect(api.swap.execute).toHaveBeenCalledTimes(1);
  });

  it('rejects clientOrderId reuse for a different intent', async () => {
    const { agent } = createHarness();
    const swap = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    const transfer = await agent.prepareTransfer({ asset: { symbol: 'IN' }, to: 'cn-recipient', amount: '1' });

    await agent.executeSwap({ intentId: swap.intentId, clientOrderId: 'shared-order' });

    await expect(
      agent.executeTransfer({
        intentId: transfer.intentId,
        clientOrderId: 'shared-order',
      })
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('exports, imports, and clears only v1 idempotency state', async () => {
    const { agent } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    await agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'swap-order-export' });

    const exported = agent.exportState();
    expect(exported).toEqual(
      expect.objectContaining({
        version: 'v1',
        idempotency: [
          expect.objectContaining({
            clientOrderId: 'swap-order-export',
            status: 'submitted',
            createdAt: 1_000,
            preview: expect.objectContaining({ sdkCall: 'api.swap.execute' }),
          }),
        ],
      })
    );
    expect(exported.idempotency[0]).toEqual(
      expect.objectContaining({
        result: expect.objectContaining({ transaction: expect.objectContaining({ id: prepared.intentId }) }),
        transaction: expect.objectContaining({ id: prepared.intentId }),
      })
    );

    const redacted = agent.exportState({ redacted: true });
    expect(redacted.idempotency[0]).toEqual(
      expect.objectContaining({
        clientOrderId: 'swap-order-export',
        intentId: exported.idempotency[0].intentId,
        action: 'swap',
        status: 'submitted',
        preview: expect.objectContaining({
          signer: { address: '', source: '', connected: true },
          args: {},
          summary: 'redacted',
        }),
      })
    );
    expect(redacted.idempotency[0]).not.toHaveProperty('transaction');
    expect(redacted.idempotency[0]).not.toHaveProperty('result');

    agent.clearState({ clientOrderId: 'swap-order-export' });
    expect(agent.transactionStatus({ id: 'swap-order-export' }).source).toBe('idempotency');
    expect(agent.importState({ state: exported })).toEqual(
      expect.objectContaining({
        imported: 1,
        skipped: 0,
      })
    );
    expect(agent.transactionStatus({ id: 'swap-order-export' })).toEqual(
      expect.objectContaining({
        source: 'idempotency',
        idempotency: expect.objectContaining({ clientOrderId: 'swap-order-export' }),
      })
    );
    try {
      agent.importState({ state: { version: 'legacy', exportedAt: 1_000, idempotency: [] } });
      throw new Error('Expected old state import to fail');
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_AGENT_STATE' });
    }
  });

  it('keeps a pending client order after signer handoff and recovers it from local history', async () => {
    const { agent, api, assetIn, assetOut } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    api.swap.execute.mockImplementationOnce(async () => {
      api.historyList.push({
        id: 'tx-crash',
        txId: 'hash-crash',
        type: Operation.Swap,
        assetAddress: assetIn.address,
        asset2Address: assetOut.address,
        amount: '1',
        amount2: '2',
        liquiditySource: LiquiditySourceTypes.Default,
        status: 'pending',
        startTime: 1_001,
      } as HistoryItem);
      throw new Error('submission interrupted');
    });

    await expect(
      agent.executeSwap({
        intentId: prepared.intentId,
        clientOrderId: 'swap-order-crash',
      })
    ).rejects.toMatchObject({ code: 'AGENT_API_UNAVAILABLE' });

    expect(agent.transactionStatus({ id: 'swap-order-crash' })).toEqual(
      expect.objectContaining({
        source: 'idempotency',
        transaction: null,
        idempotency: expect.objectContaining({ status: 'pending' }),
      })
    );
    await expect(agent.recoverTransaction({ clientOrderId: 'swap-order-crash', lookup: 'local' })).resolves.toEqual(
      expect.objectContaining({
        source: 'local',
        transaction: expect.objectContaining({ id: 'tx-crash', txId: 'hash-crash' }),
        idempotency: expect.objectContaining({ status: 'submitted' }),
      })
    );
  });

  it('persists the deterministic transaction hash after a post-sign response loss and restart', async () => {
    const { agent, api, deps, walletStore, assetIn, assetOut } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    api.swap.execute.mockImplementationOnce(async (...args: unknown[]) => {
      const historyId = `${args[8]}`;
      api.historyList.push({
        id: historyId,
        txId: 'hash-after-restart',
        type: Operation.Swap,
        assetAddress: assetIn.address,
        asset2Address: assetOut.address,
        amount: '1',
        amount2: '2',
        liquiditySource: LiquiditySourceTypes.Default,
        status: 'pending',
        startTime: 1_001,
      } as HistoryItem);
      throw new Error('response lost after signer handoff');
    });

    await expect(
      agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'restart-recovery' })
    ).rejects.toMatchObject({ code: 'AGENT_API_UNAVAILABLE' });
    expect(agent.transactionStatus({ id: 'restart-recovery' })).toEqual(
      expect.objectContaining({
        source: 'idempotency',
        transaction: expect.objectContaining({ id: prepared.intentId, txId: 'hash-after-restart' }),
        idempotency: expect.objectContaining({ status: 'pending' }),
      })
    );
    const restartedAgent = createPolkaswapAgentApi(deps);

    await expect(
      restartedAgent.recoverTransaction({ clientOrderId: 'restart-recovery', lookup: 'local' })
    ).resolves.toEqual(
      expect.objectContaining({
        source: 'idempotency',
        transaction: expect.objectContaining({ id: prepared.intentId, txId: 'hash-after-restart' }),
        idempotency: expect.objectContaining({ status: 'pending' }),
      })
    );
    await expect(
      restartedAgent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'restart-recovery' })
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(walletStore.beforeTransactionSign).toHaveBeenCalledTimes(1);
    expect(api.swap.execute).toHaveBeenCalledTimes(1);
  });

  it('restores the prepared intent after cancellation and permits one controlled retry', async () => {
    const { agent, api, walletStore } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    walletStore.beforeTransactionSign.mockRejectedValueOnce(new Error('Cancelled'));

    await expect(
      agent.executeSwap({
        intentId: prepared.intentId,
        clientOrderId: 'swap-order-cancelled',
      })
    ).rejects.toMatchObject({ code: 'SIGNING_CANCELLED' });
    expect(agent.transactionStatus({ id: 'swap-order-cancelled' }).source).toBe('none');

    await expect(
      agent.executeSwap({
        intentId: prepared.intentId,
        clientOrderId: 'swap-order-cancelled',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        reusedClientOrder: false,
        transaction: expect.objectContaining({ id: prepared.intentId, txId: 'hash-1' }),
      })
    );
    expect(walletStore.beforeTransactionSign).toHaveBeenCalledTimes(2);
    expect(api.swap.execute).toHaveBeenCalledTimes(1);
  });

  it('assesses swaps against caller risk policy before execution', async () => {
    const { agent } = createHarness();

    await expect(
      agent.assessSwap({
        assetIn: { symbol: 'IN' },
        assetOut: { symbol: 'OUT' },
        amount: '1',
        maxPriceImpact: '0.5',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        approved: false,
        reasons: [expect.objectContaining({ code: 'HIGH_PRICE_IMPACT', severity: 'critical' })],
        prepared: expect.objectContaining({ canExecute: true }),
        policy: expect.objectContaining({ maxPriceImpact: '0.5', requireCanExecute: true }),
      })
    );
  });

  it('executes transfers through the connected signer', async () => {
    const { agent, api, walletStore, assetIn } = createHarness();
    const prepared = await agent.prepareTransfer({
      asset: { symbol: 'IN' },
      to: 'cn-recipient',
      amount: '1.5',
    });
    const execution = await agent.executeTransfer({ intentId: prepared.intentId, clientOrderId: 'transfer-submit' });

    expect(walletStore.beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(api.assets.simpleTransfer).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      'cn-recipient',
      '1.5',
      prepared.intentId
    );
    expect(execution).toEqual(
      expect.objectContaining({
        intentId: expect.stringMatching(/^polkaswap:transfer:/),
        asset: expect.objectContaining({ symbol: 'IN' }),
        to: 'cn-recipient',
        amount: '1.5',
        amountMeta: expect.objectContaining({ value: '1.5', display: '1.5 IN' }),
        transaction: expect.objectContaining({ id: prepared.intentId, txId: 'hash-transfer' }),
      })
    );
  });

  it('prepares transfers and rejects stale intents before signing', async () => {
    const { agent, walletStore } = createHarness();

    await expect(
      agent.prepareTransfer({ asset: { symbol: 'IN' }, to: 'cn-recipient', amount: '1.5' })
    ).resolves.toEqual(
      expect.objectContaining({
        canExecute: true,
        intentId: expect.stringMatching(/^polkaswap:transfer:/),
        preview: expect.objectContaining({
          sdkCall: 'api.assets.simpleTransfer',
          args: expect.objectContaining({ to: 'cn-recipient', amount: '1.5' }),
        }),
      })
    );

    await expect(agent.executeTransfer({ intentId: 'stale', clientOrderId: 'stale-transfer' })).rejects.toMatchObject({
      code: 'INTENT_MISMATCH',
    });
    expect(walletStore.beforeTransactionSign).not.toHaveBeenCalled();
  });

  it('reads only the deterministic history record assigned to the prepared intent', async () => {
    const { agent, api, assetIn, assetOut } = createHarness();
    const prepared = await agent.prepareSwap({
      assetIn: { symbol: 'IN' },
      assetOut: { symbol: 'OUT' },
      amount: '1',
    });
    api.swap.execute.mockImplementation(async (...args: unknown[]) => {
      const historyId = `${args[8]}`;
      api.historyList.push(
        {
          id: 'wrong-asset',
          txId: 'hash-wrong',
          type: Operation.Swap,
          assetAddress: assetOut.address,
          asset2Address: assetIn.address,
          amount: '1',
          amount2: '2',
          liquiditySource: LiquiditySourceTypes.Default,
          status: 'pending',
          startTime: 1_001,
        } as HistoryItem,
        {
          id: historyId,
          txId: 'hash-2',
          type: Operation.Swap,
          assetAddress: assetIn.address,
          asset2Address: assetOut.address,
          amount: '1',
          amount2: '2',
          liquiditySource: LiquiditySourceTypes.Default,
          status: 'pending',
          startTime: 1_000,
        } as HistoryItem
      );
    });

    await expect(
      agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'history-match' })
    ).resolves.toMatchObject({ transaction: { id: prepared.intentId, txId: 'hash-2' } });
  });

  it('quotes existing-pool liquidity deposits and derives the missing side from reserves', async () => {
    const { agent, api, reserveInCodec, reserveOutCodec, totalSupplyCodec } = createHarness();

    const quote = await agent.quoteAddLiquidity({
      assetA: { symbol: 'IN' },
      assetB: { symbol: 'OUT' },
      amountA: '1',
    });

    expect(api.poolXyk.check).toHaveBeenCalledWith('0xin', '0xout');
    expect(api.poolXyk.getReserves).toHaveBeenCalledWith('0xin', '0xout');
    expect(api.poolXyk.estimatePoolTokensMinted).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'IN' }),
      expect.objectContaining({ symbol: 'OUT' }),
      '1',
      '2',
      reserveInCodec,
      reserveOutCodec,
      totalSupplyCodec
    );
    expect(quote).toEqual(
      expect.objectContaining({
        quoteDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        createsPool: false,
        amountA: '1',
        amountB: '2',
        amountAMeta: expect.objectContaining({ display: '1 IN' }),
        mintedLiquidity: '5',
        slippageTolerance: '0.5',
      })
    );
  });

  it('requires explicit opt-in before quoting new pool creation', async () => {
    const { agent, api } = createHarness();
    api.poolXyk.check.mockResolvedValue(false);

    await expect(
      agent.quoteAddLiquidity({ assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' }, amountA: '1', amountB: '2' })
    ).rejects.toMatchObject({ code: 'POOL_UNAVAILABLE' });

    await expect(
      agent.quoteAddLiquidity({
        assetA: { symbol: 'IN' },
        assetB: { symbol: 'OUT' },
        amountA: '1',
        amountB: '2',
        allowPoolCreation: true,
      })
    ).resolves.toMatchObject({ createsPool: true, amountA: '1', amountB: '2' });
  });

  it('executes add-liquidity through the existing pool SDK', async () => {
    const { agent, api, walletStore, assetIn, assetOut } = createHarness();
    const prepared = await agent.prepareAddLiquidity({
      assetA: { symbol: 'IN' },
      assetB: { symbol: 'OUT' },
      amountA: '1',
    });
    const execution = await agent.executeAddLiquidity({
      intentId: prepared.intentId,
      clientOrderId: 'add-liquidity-submit',
    });

    expect(walletStore.beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(api.poolXyk.add).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      expect.objectContaining(assetOut),
      '1',
      '2',
      '0.5',
      prepared.intentId
    );
    expect(execution.transaction).toEqual(expect.objectContaining({ id: prepared.intentId, txId: 'hash-lp-add' }));
  });

  it('prepares add-liquidity and reports max balanced deposits', async () => {
    const { agent } = createHarness();

    await expect(
      agent.prepareAddLiquidity({ assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' }, amountA: '1' })
    ).resolves.toEqual(
      expect.objectContaining({
        canExecute: true,
        intentId: expect.stringMatching(/^polkaswap:add-liquidity:/),
        preview: expect.objectContaining({
          sdkCall: 'api.poolXyk.add',
          args: expect.objectContaining({ amountA: '1', amountB: '2' }),
        }),
        requiredBalances: expect.arrayContaining([
          expect.objectContaining({ asset: expect.objectContaining({ symbol: 'IN' }), sufficient: true }),
          expect.objectContaining({ asset: expect.objectContaining({ symbol: 'OUT' }), sufficient: true }),
        ]),
      })
    );

    await expect(agent.maxAddLiquidity({ assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' } })).resolves.toEqual(
      expect.objectContaining({
        amountA: '100',
        amountB: '200',
      })
    );
  });

  it('lists connected account liquidity positions', async () => {
    const { agent, api } = createHarness();

    const positions = await agent.liquidityPositions();

    expect(api.poolXyk.getUserPoolsSubscription).toHaveBeenCalledTimes(1);
    expect(positions).toEqual([
      expect.objectContaining({
        assetA: expect.objectContaining({ symbol: 'IN' }),
        assetB: expect.objectContaining({ symbol: 'OUT' }),
        liquidityAmount: '10',
        amountA: '10',
        amountB: '20',
        poolShare: '10',
      }),
    ]);
  });

  it('quotes and executes remove-liquidity by wallet position percent', async () => {
    const { agent, api, walletStore, assetIn, assetOut, reserveInCodec, reserveOutCodec, totalSupplyCodec } =
      createHarness();

    const quote = await agent.quoteRemoveLiquidity({
      assetA: { symbol: 'IN' },
      assetB: { symbol: 'OUT' },
      percent: '50',
    });

    expect(api.poolXyk.estimateTokensRetrieved).toHaveBeenCalledWith(
      new FPNumber('5', 18).toCodecString(),
      reserveInCodec,
      reserveOutCodec,
      totalSupplyCodec,
      18,
      18
    );
    expect(quote).toEqual(
      expect.objectContaining({
        quoteDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        liquidityAmount: '5',
        liquidityAmountMeta: expect.objectContaining({ value: '5' }),
        percentOfPosition: '50',
        amountA: '1',
        amountB: '2',
      })
    );

    const prepared = await agent.prepareRemoveLiquidity({
      assetA: { symbol: 'IN' },
      assetB: { symbol: 'OUT' },
      liquidityAmount: '5',
    });
    const execution = await agent.executeRemoveLiquidity({
      intentId: prepared.intentId,
      clientOrderId: 'remove-liquidity-submit',
    });

    expect(walletStore.beforeTransactionSign).toHaveBeenCalledWith(api);
    expect(api.poolXyk.remove).toHaveBeenCalledWith(
      expect.objectContaining(assetIn),
      expect.objectContaining(assetOut),
      '5',
      reserveInCodec,
      reserveOutCodec,
      totalSupplyCodec,
      '0.5',
      prepared.intentId
    );
    expect(execution.transaction).toEqual(expect.objectContaining({ id: prepared.intentId, txId: 'hash-lp-remove' }));
  });

  it('prepares remove-liquidity and exposes max removable position', async () => {
    const { agent } = createHarness();

    await expect(
      agent.prepareRemoveLiquidity({ assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' }, percent: '50' })
    ).resolves.toEqual(
      expect.objectContaining({
        canExecute: true,
        intentId: expect.stringMatching(/^polkaswap:remove-liquidity:/),
        preview: expect.objectContaining({
          sdkCall: 'api.poolXyk.remove',
          args: expect.objectContaining({ liquidityAmount: '5' }),
        }),
      })
    );
    await expect(agent.maxRemoveLiquidity({ assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' } })).resolves.toEqual(
      expect.objectContaining({
        liquidityAmount: '10',
        percent: '100',
        position: expect.objectContaining({ poolShare: '10' }),
      })
    );
  });

  it('blocks prepared remove-liquidity when the connected wallet has no LP position', async () => {
    const { agent, api } = createHarness();
    api.poolXyk.accountLiquidity = [];

    await expect(
      agent.prepareRemoveLiquidity({ assetA: { symbol: 'IN' }, assetB: { symbol: 'OUT' }, liquidityAmount: '1' })
    ).resolves.toEqual(
      expect.objectContaining({
        canExecute: false,
        warnings: expect.arrayContaining([
          expect.objectContaining({
            code: 'LOW_LIQUIDITY',
            severity: 'critical',
          }),
        ]),
      })
    );
  });

  it('returns max transfer and swap input amounts after fees', async () => {
    const { agent, assetIn } = createHarness();

    await expect(agent.maxTransferAmount({ asset: { address: XOR.address } })).resolves.toMatchObject({
      asset: { symbol: 'XOR' },
      amount: '9.9',
    });
    await expect(agent.maxSwapInput({ assetIn: { address: assetIn.address } })).resolves.toMatchObject({
      asset: { symbol: 'IN' },
      amount: '100',
    });
    await expect(
      agent.maxSwapInput({ assetIn: { address: assetIn.address }, assetOut: { symbol: 'OUT' } })
    ).resolves.toMatchObject({
      asset: { symbol: 'IN' },
      amount: '100',
      quote: expect.objectContaining({ amountIn: '100', amountOut: '2' }),
    });
  });

  it('returns a critical max-swap warning when the requested pair has no path', async () => {
    const { agent, api, assetIn } = createHarness();
    api.swap.checkSwap.mockResolvedValue(false);

    await expect(
      agent.maxSwapInput({ assetIn: { address: assetIn.address }, assetOut: { symbol: 'OUT' } })
    ).resolves.toMatchObject({
      amount: '0',
      warnings: expect.arrayContaining([expect.objectContaining({ code: 'PATH_UNAVAILABLE', severity: 'critical' })]),
    });
  });

  it('waits for and filters local transaction history', async () => {
    const { agent, api, assetIn } = createHarness();
    api.historyList.push(
      {
        id: 'history-1',
        txId: 'hash-history',
        type: Operation.Transfer,
        assetAddress: assetIn.address,
        amount: '1',
        startTime: 1_000,
        status: 'finalized',
      } as HistoryItem,
      {
        id: 'history-2',
        txId: 'hash-swap',
        type: Operation.Swap,
        assetAddress: assetIn.address,
        amount: '1',
        startTime: 900,
        status: 'pending',
      } as HistoryItem
    );

    await expect(agent.waitForTransaction({ id: 'history-1', status: 'finalized' })).resolves.toMatchObject({
      source: 'local',
      transaction: { txId: 'hash-history' },
    });
    await expect(agent.recentTransactions({ type: Operation.Transfer, asset: { symbol: 'IN' } })).resolves.toEqual([
      expect.objectContaining({ id: 'history-1' }),
    ]);
  });

  it('looks up transactions through the indexer when local history is missing', async () => {
    const { agent, deps } = createHarness();
    const indexedHistory = {
      id: 'indexed-id',
      txId: 'indexed-id',
      type: Operation.Transfer,
      status: 'finalized',
    } as HistoryItem;
    deps.getIndexer = vi.fn(
      () =>
        ({
          services: {
            explorer: {
              account: {
                getHistory: vi.fn(async () => ({ nodes: [{ id: 'indexed-id' }], totalCount: 1 })),
              },
            },
            dataParser: {
              parseTransactionAsHistoryItem: vi.fn(async () => indexedHistory),
            },
          },
        }) as never
    );

    await expect(agent.lookupTransaction({ txId: 'indexed-id', lookup: 'indexer' })).resolves.toEqual(
      expect.objectContaining({
        source: 'indexer',
        transaction: indexedHistory,
      })
    );
  });

  it('looks up explicit chain transactions by block reference', async () => {
    const { agent, api } = createHarness();
    api.api.rpc.chain.getBlockHash.mockResolvedValue({ toString: () => '0xblock' });
    api.api.rpc.chain.getHeader.mockResolvedValue({ number: { toNumber: () => 123 } });
    api.api.rpc.chain.getBlock.mockResolvedValue({
      block: {
        extrinsics: [
          {
            hash: { toString: () => '0xother' },
            method: { toString: () => 'system.remark' },
          },
          {
            hash: { toString: () => '0xchain-tx' },
            method: { toString: () => 'assets.transfer' },
            toHuman: () => ({ method: 'assets.transfer' }),
          },
        ],
      },
    });

    await expect(agent.lookupTransaction({ txId: '0xchain-tx', lookup: 'chain', blockHeight: 123 })).resolves.toEqual(
      expect.objectContaining({
        source: 'chain',
        transaction: expect.objectContaining({
          id: '0xchain-tx',
          txId: '0xchain-tx',
          blockId: '0xblock',
          blockHeight: 123,
          status: 'inblock',
        }),
      })
    );
    expect(api.api.rpc.chain.getBlockHash).toHaveBeenCalledWith(123);
    expect(api.api.rpc.chain.getBlock).toHaveBeenCalledWith('0xblock');
  });

  it('requires an explicit block reference for chain lookup', async () => {
    const { agent } = createHarness();

    await expect(agent.lookupTransaction({ txId: '0xchain-tx', lookup: 'chain' })).rejects.toMatchObject({
      code: 'INVALID_TRANSACTION_ID',
    });
  });

  it('subscribes to status and transaction changes', async () => {
    vi.useFakeTimers();
    try {
      const { agent, api, settingsStore, assetIn } = createHarness();
      const statusListener = vi.fn();
      const transactionListener = vi.fn();

      const unsubscribeStatus = agent.subscribeStatus({ pollMs: 250, emitImmediately: true }, statusListener);
      const unsubscribeTransactions = await agent.subscribeTransactions(
        { pollMs: 250, includeExisting: false },
        transactionListener
      );
      expect(statusListener).toHaveBeenCalledTimes(1);
      expect(transactionListener).not.toHaveBeenCalled();

      settingsStore.blockNumber = 43;
      api.historyList.push({
        id: 'subscribed-tx',
        txId: 'subscribed-hash',
        type: Operation.Transfer,
        assetAddress: assetIn.address,
        amount: '1',
        startTime: 2_000,
        status: 'pending',
      } as HistoryItem);

      await vi.advanceTimersByTimeAsync(250);
      expect(statusListener).toHaveBeenCalledWith(
        expect.objectContaining({ node: expect.objectContaining({ blockNumber: 43 }) })
      );
      expect(transactionListener).toHaveBeenCalledWith(expect.objectContaining({ id: 'subscribed-tx' }));

      unsubscribeStatus();
      unsubscribeTransactions();
    } finally {
      vi.useRealTimers();
    }
  });

  it('subscribes to indexer transactions when requested explicitly', async () => {
    const { agent, deps, assetIn } = createHarness();
    const unsubscribeIndexer = vi.fn();
    const existingHistory = {
      id: 'indexed-existing',
      txId: 'hash-indexed-existing',
      type: Operation.Transfer,
      assetAddress: assetIn.address,
      amount: '1',
      startTime: 1_000,
      status: 'finalized',
    } as HistoryItem;
    const incomingHistory = {
      id: 'indexed-incoming',
      txId: 'hash-indexed-incoming',
      type: Operation.Transfer,
      assetAddress: assetIn.address,
      amount: '2',
      startTime: 2_000,
      status: 'pending',
    } as HistoryItem;
    let subscriptionHandler: ((transaction: unknown) => void) | undefined;
    const historyElementsFilter = vi.fn((filter) => ({ filter }));
    const parseTransactionAsHistoryItem = vi.fn(async (transaction: { id?: string }) =>
      transaction.id === 'existing-node' ? existingHistory : incomingHistory
    );
    const createHistorySubscription = vi.fn((_address: string, handler: (transaction: unknown) => void) => {
      subscriptionHandler = handler;
      return unsubscribeIndexer;
    });

    deps.getIndexer = vi.fn(
      () =>
        ({
          historyElementsFilter,
          services: {
            explorer: {
              account: {
                getHistory: vi.fn(async () => ({ nodes: [{ id: 'existing-node' }], totalCount: 1 })),
                createHistorySubscription,
              },
            },
            dataParser: {
              supportedOperations: [Operation.Transfer],
              parseTransactionAsHistoryItem,
            },
          },
        }) as never
    );

    const listener = vi.fn();
    const unsubscribe = await agent.subscribeTransactions(
      {
        source: 'indexer',
        address: 'cn-account',
        type: Operation.Transfer,
        asset: { symbol: 'IN' },
        includeExisting: true,
        limit: 10,
      },
      listener
    );

    expect(historyElementsFilter).toHaveBeenCalledWith({
      address: 'cn-account',
      assetAddress: assetIn.address,
      operations: [Operation.Transfer],
    });
    expect(createHistorySubscription).toHaveBeenCalledWith('cn-account', expect.any(Function));
    expect(listener).toHaveBeenCalledWith(existingHistory);

    subscriptionHandler?.({ id: 'incoming-node' });
    await Promise.resolve();
    await Promise.resolve();

    expect(listener).toHaveBeenCalledWith(incomingHistory);
    unsubscribe();
    expect(unsubscribeIndexer).toHaveBeenCalledTimes(1);
  });

  it('requires an address or connected wallet for indexer subscriptions', async () => {
    const { agent, walletStore } = createHarness();
    walletStore.address = '';
    walletStore.isLoggedIn = false;

    await expect(agent.subscribeTransactions({ source: 'indexer' }, vi.fn())).rejects.toMatchObject({
      code: 'WALLET_NOT_CONNECTED',
    });
  });

  it('connects a selected injected wallet account', async () => {
    const { agent, deps, walletStore } = createHarness();

    const wallet = await agent.connectWallet({ source: 'polkadot-js', address: 'cn-account' });

    expect(deps.getWalletProvider).toHaveBeenCalledWith('polkadot-js');
    expect(walletStore.loginAccount).toHaveBeenCalledWith({
      address: 'cn-account',
      name: 'Agent',
      source: 'polkadot-js',
    });
    expect(wallet.connected).toBe(true);
    expect(wallet.accountsCount).toBe(1);
    expect(wallet.availableWallets[0].accountsCount).toBe(1);
  });
});
