// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPolkaswapAgentApi, type AgentTradingDependencies } from '@/features/agent-trading/service';
import { prepareOwnedGoalSwap } from '@/features/agent-trading/goal-preparation';
import { createAgentDigest, createAgentIntentId } from '@/features/agent-trading/intent';
import type { AgentSwapRequest } from '@/features/agent-trading/types';
import type { GoalRpcMethod } from '@/features/agent-trading/goal-rpc';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { Operation } from '@/lib/substrate/sdk/types';
import { createExecutionStateFixture } from '../bot-trading/execution-state-fixture';
import { feeBytes, hex } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';

vi.unmock('@polkadot/util-crypto');
vi.unmock('@sora-substrate/sdk/build/assets/consts');
vi.hoisted(() => {
  Object.assign(window.location, {
    host: 'localhost',
    hostname: 'localhost',
    search: '',
    hash: '#/swap',
    protocol: 'http:',
  });
});

const fixture = createExecutionStateFixture();
const protocol = 'finalized-xyk-native-fee-v1' as const;
const STORAGE_KEY = 'polkaswap.agent.prepared.v1';
const inputCodec = '2500000000000000000';
const outputCodec = '990000000000000000';
const minimumCodec = '985050000000000000';
const hash = (value: string) => `0x${value.repeat(64)}`;
const request = (): AgentSwapRequest => ({
  assetIn: { address: KUSD },
  assetOut: { address: XOR },
  amount: '2.5',
  side: 'input',
  dexId: 0,
  liquiditySource: 'XYKPool',
  slippageTolerance: '0.5',
  execution: { protocol, expectedDenominator: '1' },
});
const balance = (amount: string) => ({
  free: amount,
  reserved: '0',
  frozen: '0',
  bonded: '0',
  locked: '0',
  total: amount,
  transferable: amount,
});
const asset = (address: string, symbol: string) => ({
  address,
  symbol,
  name: `${symbol} token`,
  decimals: 18,
  isMintable: true,
  type: 'Regular',
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Real service/session/provider codecs over an invented public SDK raw transport. */
function setup() {
  let now = fixture.now;
  let runtimeHex = '0x010203';
  const events = new Map<string, Set<() => void>>();
  const blockHash = fixture.identity.blockHash;
  const response = (method: GoalRpcMethod, params: readonly unknown[]): unknown => {
    switch (method) {
      case 'chain_getBlockHash':
        return params[0] === 0 ? GENESIS : blockHash;
      case 'chain_getFinalizedHead':
        return blockHash;
      case 'chain_getHeader':
        return {
          number: '0x64',
          parentHash: hash('3'),
          stateRoot: hash('4'),
          extrinsicsRoot: hash('5'),
          digest: { logs: [] },
        };
      case 'state_getRuntimeVersion':
        return { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130, apis: [] };
      case 'state_getMetadata':
        return fixture.identity.metadataHex;
      case 'state_getStorageHash':
        return hash('a');
      case 'state_queryStorageAt':
        return [
          {
            block: blockHash,
            changes: Object.entries(fixture.keys).map(([label, key]) => [
              key,
              fixture.proof[label as keyof typeof fixture.proof],
            ]),
          },
        ];
      case 'liquidityProxy_quote':
        return {
          amount: outputCodec,
          amount_without_impact: '1000000000000000000',
          fee: { [XOR]: '6000000000000000' },
          route: [params[1], params[2]],
        };
      case 'state_call':
        return params[0] === 'TransactionPaymentApi_query_info'
          ? hex(
              fixture.registry
                .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '11' })
                .toU8a()
            )
          : feeBytes(1, 7, 3);
    }
  };
  let intercept: ((method: GoalRpcMethod, params: readonly unknown[]) => unknown | Promise<unknown>) | undefined;
  const reads = vi.fn(async (method: GoalRpcMethod, params: readonly unknown[]) =>
    intercept ? intercept(method, params) : response(method, params)
  );
  const raw = (method: GoalRpcMethod) => ({ raw: (...params: unknown[]) => reads(method, params) });
  const forbidden = vi.fn((): never => {
    throw Error('Legacy quote, fee or signing must not run.');
  });
  const paymentInfo = vi.fn(forbidden);
  const chain = {
    isConnected: true,
    genesisHash: { toHex: () => GENESIS, toString: () => GENESIS },
    runtimeVersion: {
      toHex: () => runtimeHex,
      specVersion: { toNumber: () => 130, toString: () => '130' },
      transactionVersion: { toString: () => '130' },
    },
    runtimeMetadata: {},
    rpc: {
      chain: {
        getBlockHash: raw('chain_getBlockHash'),
        getFinalizedHead: raw('chain_getFinalizedHead'),
        getHeader: raw('chain_getHeader'),
      },
      state: {
        getRuntimeVersion: raw('state_getRuntimeVersion'),
        getMetadata: raw('state_getMetadata'),
        getStorageHash: raw('state_getStorageHash'),
        queryStorageAt: raw('state_queryStorageAt'),
        call: raw('state_call'),
      },
      liquidityProxy: { quote: raw('liquidityProxy_quote') },
    },
    tx: { liquidityProxy: { swap: vi.fn(() => ({ paymentInfo })) } },
    on: vi.fn((event: string, listener: () => void) => {
      if (!events.has(event)) events.set(event, new Set());
      events.get(event)!.add(listener);
    }),
    off: vi.fn((event: string, listener: () => void) => {
      events.get(event)?.delete(listener);
    }),
  };
  const kusd = asset(KUSD, 'KUSD');
  const xor = asset(XOR, 'XOR');
  const accountKusd = { ...kusd, balance: balance('10000000000000000000') };
  const accountXor = { ...xor, balance: balance('1000000000000000000') };
  const settingsStore = {
    nodeIsConnected: true,
    appConnection: { connection: { endpoint: 'wss://synthetic.test' }, node: { address: 'wss://synthetic.test' } },
    blockNumber: 100,
    isWalletLoaded: true,
    slippageTolerance: '0.5',
  };
  const walletStore = {
    availableWallets: [{ extensionName: 'polkadot-js', title: 'Polkadot.js', installed: true }],
    updateAvailableWallets: vi.fn(async () => undefined),
    beforeTransactionSign: vi.fn(forbidden),
    isWalletLoaded: true,
    isLoggedIn: true,
    address: 'cn-account',
    source: 'polkadot-js',
    networkFees: { [Operation.Swap]: '999999999999999999' },
    assets: [accountKusd, accountXor],
    accountAssetsAddressTable: { [KUSD]: accountKusd, [XOR]: accountXor },
  };
  const assetsStore = {
    assetDataByAddress: vi.fn((address: string) => [kusd, xor].find((item) => item.address === address) ?? null),
  };
  const api = {
    api: chain,
    accountPair: { address: 'cn-account' },
    system: { specVersion: 130 },
    formatAddress: vi.fn((address: string) => address),
    historyList: [],
    getHistory: vi.fn(),
    dex: { publicDexes: [{ dexId: 0 }], poolBaseAssetsIds: [XOR], baseAssetsIds: [XOR], update: vi.fn(forbidden) },
    assets: {
      getAssetInfo: vi.fn(async (address: string) => [kusd, xor].find((item) => item.address === address)),
      getAccountAsset: vi.fn(async (address: string) => {
        const result = [accountKusd, accountXor].find((item) => item.address === address);
        if (!result) throw Error('Unknown synthetic asset');
        return result;
      }),
    },
    swap: {
      update: vi.fn(forbidden),
      checkSwap: vi.fn(forbidden),
      getDexesSwapQuoteObservable: vi.fn(forbidden),
      getSwapQuoteObservable: vi.fn(forbidden),
      getMinMaxValue: vi.fn(forbidden),
      getPriceImpact: vi.fn(forbidden),
      execute: vi.fn(forbidden),
    },
  };
  const deps = {
    api,
    getSettingsStore: () => settingsStore,
    getWalletStore: () => walletStore,
    getAssetsStore: () => assetsStore,
    getWalletProvider: vi.fn(forbidden),
    delay: vi.fn(async () => undefined),
    now: () => now,
  } as unknown as AgentTradingDependencies;
  return {
    agent: createPolkaswapAgentApi(deps),
    api,
    chain,
    settingsStore,
    walletStore,
    assetsStore,
    reads,
    response,
    forbidden,
    paymentInfo,
    accountKusd,
    accountXor,
    events,
    time: (value: number) => {
      now = value;
    },
    runtime: (value: string) => {
      runtimeHex = value;
    },
    intercept: (fn: typeof intercept) => {
      intercept = fn;
    },
    emit: (event: string) => {
      for (const listener of events.get(event) ?? []) listener();
    },
    assertClean: () => {
      expect(forbidden).not.toHaveBeenCalled();
      expect(paymentInfo).not.toHaveBeenCalled();
      expect(chain.tx.liquidityProxy.swap).not.toHaveBeenCalled();
      expect([...events.values()].every((listeners) => listeners.size === 0)).toBe(true);
    },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  window.location.href = 'http://localhost/#/swap';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('finalized goal service integration', () => {
  it('quotes the exact lot and native bounded fee from eleven raw calls with no legacy fallback', async () => {
    const h = setup();
    const quote = await h.agent.quoteSwap(request());
    expect(h.reads).toHaveBeenCalledTimes(11);
    expect(h.reads).toHaveBeenNthCalledWith(9, 'liquidityProxy_quote', [
      0,
      KUSD,
      XOR,
      inputCodec,
      'WithDesiredInput',
      ['XYKPool'],
      'AllowSelected',
      fixture.identity.blockHash,
    ]);
    expect(quote).toMatchObject({
      amountIn: '2.5',
      amountOut: '0.99',
      minAmountOut: '0.98505',
      minMaxCodec: minimumCodec,
      execution: {
        protocol,
        estimate: { request: { amountInCodec: inputCodec }, fee: { amountCodec: '11' }, transactionSubmitted: false },
      },
    });
    const estimate = quote.execution!.estimate;
    expect(estimate.fee.envelope).toMatchObject({ amountInCodec: inputCodec, minimumCodec, encodedLength: 215 });
    expect(h.reads).toHaveBeenNthCalledWith(10, 'state_call', [
      'TransactionPaymentApi_query_info',
      estimate.fee.envelope.feeQueryDataHex,
      fixture.identity.blockHash,
    ]);
    expect(h.reads).toHaveBeenNthCalledWith(11, 'state_call', [
      'TransactionPaymentApi_query_fee_details',
      estimate.fee.envelope.feeQueryDataHex,
      fixture.identity.blockHash,
    ]);
    const { quoteDigest, ...payload } = quote;
    expect(await createAgentDigest('swap.quote', payload)).toBe(quoteDigest);
    expect(Object.isFrozen(estimate.fee.envelope)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    h.assertClean();
  });

  it('plans publicly with finalized fees without reading wallet accounts or balances', async () => {
    const h = setup();
    for (const key of [
      'address',
      'source',
      'isLoggedIn',
      'availableWallets',
      'assets',
      'accountAssetsAddressTable',
      'networkFees',
    ]) {
      Object.defineProperty(h.walletStore, key, { get: h.forbidden });
    }
    Object.defineProperty(h.api, 'accountPair', { get: h.forbidden });
    const plan = await h.agent.planSwap(request());
    expect(h.reads).toHaveBeenCalledTimes(11);
    expect(plan).toMatchObject({
      mode: 'unsigned',
      canExecute: false,
      requiresWallet: false,
      fees: [{ source: 'finalized-runtime', amountCodec: '11', asset: { address: XOR } }],
    });
    expect(h.api.assets.getAccountAsset).not.toHaveBeenCalled();
    expect(Object.isFrozen(plan.quote.execution!.estimate.context.pool)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    h.assertClean();
  });

  it('recaptures the full state and fee for a second lot instead of reusing the first estimate', async () => {
    const h = setup();
    const first = await h.agent.quoteSwap(request());
    h.intercept((method, params) => {
      if (method === 'state_call') {
        return params[0] === 'TransactionPaymentApi_query_info'
          ? hex(
              fixture.registry
                .createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '22' })
                .toU8a()
            )
          : feeBytes(2, 14, 6);
      }
      return h.response(method, params);
    });
    const second = await h.agent.quoteSwap({ ...request(), amount: '1.25' });
    expect(h.reads).toHaveBeenCalledTimes(22);
    expect(second.execution!.estimate.fee.amountCodec).toBe('22');
    expect(second.execution!.estimate.fee.envelope.amountInCodec).toBe('1250000000000000000');
    expect(first.execution!.estimate.fee.amountCodec).toBe('11');
    expect(first.execution!.estimate.fee.envelope.amountInCodec).toBe(inputCodec);
    expect(first.quoteDigest).not.toBe(second.quoteDigest);
    h.assertClean();
  });

  it('binds amount, minimum, SCALE fee evidence and fee ceiling into the immutable prepared digest', async () => {
    const h = setup();
    const prepared = await h.agent.prepareSwap(request());
    expect(h.reads).toHaveBeenCalledTimes(11);
    expect(prepared.fees).toMatchObject([{ source: 'finalized-runtime', amountCodec: '11' }]);
    expect(prepared.envelope.request).toMatchObject({
      amount: '2.5',
      execution: { protocol, expectedDenominator: '1' },
    });
    expect(prepared.envelope.feeCeilings).toEqual([{ assetAddress: XOR, amountCodec: '11' }]);
    expect(prepared.requiredBalances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          asset: expect.objectContaining({ address: KUSD }),
          requiredCodec: inputCodec,
          sufficient: true,
        }),
        expect.objectContaining({
          asset: expect.objectContaining({ address: XOR }),
          requiredCodec: '11',
          sufficient: true,
        }),
      ])
    );
    expect(prepared.preview.args).toMatchObject({
      amountIn: '2.5',
      amountOut: '0.99',
      dexId: 0,
      liquiditySource: 'XYKPool',
      slippageTolerance: '0.5',
    });
    const { quoteDigest, ...quote } = prepared.quote;
    expect(await createAgentDigest('swap.quote', quote)).toBe(quoteDigest);
    const { intentId, ...envelope } = prepared.envelope;
    expect(await createAgentIntentId('swap', envelope)).toBe(intentId);
    const changed = structuredClone(quote);
    Reflect.set(changed.execution!.estimate.fee.envelope, 'minimumCodec', '1');
    expect(await createAgentDigest('swap.quote', changed)).not.toBe(quoteDigest);
    expect(Object.isFrozen(prepared.envelope.quote)).toBe(true);
    expect(Object.isFrozen(prepared.quote.execution!.estimate.fee.envelope)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toContain(intentId);
    h.assertClean();
  });

  it('rejects generic execution of a prepared finalized protocol before signing or requoting', async () => {
    const h = setup();
    const prepared = await h.agent.prepareSwap(request());
    await expect(
      h.agent.executeSwap({ intentId: prepared.intentId, clientOrderId: 'goal-no-generic-sign' })
    ).rejects.toMatchObject({ code: 'INTENT_MISMATCH' });
    expect(h.reads).toHaveBeenCalledTimes(11);
    expect(h.walletStore.beforeTransactionSign).not.toHaveBeenCalled();
    h.assertClean();
  });

  it.each([
    ['side omitted', { side: undefined }],
    ['output side', { side: 'output' }],
    ['DEX omitted', { dexId: undefined }],
    ['best DEX', { dexId: 'best' }],
    ['other DEX', { dexId: 1 }],
    ['source omitted', { liquiditySource: undefined }],
    ['default source', { liquiditySource: 'Default' }],
    ['slippage omitted', { slippageTolerance: undefined }],
    ['other slippage', { slippageTolerance: '1' }],
    ['unknown protocol', { execution: { protocol: 'other', expectedDenominator: '1' } }],
    ['zero denominator', { execution: { protocol, expectedDenominator: '0' } }],
  ])('rejects %s before any transport or fallback', async (_name, patch) => {
    const h = setup();
    await expect(h.agent.quoteSwap({ ...request(), ...patch } as AgentSwapRequest)).rejects.toMatchObject({
      code: 'INVALID_AGENT_STATE',
    });
    expect(h.reads).not.toHaveBeenCalled();
    h.assertClean();
  });

  it('retains native fee RPC failure instead of using cached fees or paymentInfo', async () => {
    const h = setup();
    h.intercept((method, params) => {
      if (method === 'state_call' && params[0] === 'TransactionPaymentApi_query_fee_details')
        throw Error('synthetic fee unavailable');
      return h.response(method, params);
    });
    await expect(h.agent.prepareSwap(request())).rejects.toBeDefined();
    expect(h.reads).toHaveBeenCalledTimes(11);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    h.assertClean();
  });

  it('rejects a denominator change before quote RPC or intent creation', async () => {
    const h = setup();
    await expect(
      h.agent.prepareSwap({ ...request(), execution: { protocol, expectedDenominator: '2' } })
    ).rejects.toBeDefined();
    expect(h.reads.mock.calls.some(([method]) => method === 'liquidityProxy_quote')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    h.assertClean();
  });

  it.each(['age', 'client', 'runtime', 'reconnect'] as const)(
    'rejects %s changes during the balance await and persists no intent',
    async (change) => {
      const h = setup();
      h.accountKusd.balance = balance('0');
      const pending = deferred<typeof h.accountKusd>();
      const reached = deferred<void>();
      h.api.assets.getAccountAsset.mockImplementation(async (address) => {
        if (address === KUSD) {
          reached.resolve();
          return pending.promise;
        }
        return h.accountXor;
      });
      const preparing = h.agent.prepareSwap(request());
      const rejected = expect(preparing).rejects.toBeDefined();
      await Promise.race([reached.promise, preparing]);
      if (change === 'age') h.time(fixture.now + 5000);
      if (change === 'client') h.api.api = { ...h.chain };
      if (change === 'runtime') h.runtime('0x010204');
      if (change === 'reconnect') {
        h.emit('disconnected');
        h.emit('connected');
      }
      pending.resolve({ ...h.accountKusd, balance: balance('10000000000000000000') });
      await rejected;
      expect(h.reads).toHaveBeenCalledTimes(11);
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      h.assertClean();
    }
  );

  it('rejects expiry during quote hashing after all RPCs completed', async () => {
    const h = setup();
    const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    vi.spyOn(globalThis.crypto.subtle, 'digest').mockImplementation(async (...args) => {
      const result = await digest(...args);
      h.time(fixture.now + 5000);
      return result;
    });
    await expect(h.agent.quoteSwap(request())).rejects.toBeDefined();
    expect(h.reads).toHaveBeenCalledTimes(11);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    h.assertClean();
  });

  it('checks ownership after the final intent hash before writing storage', async () => {
    const h = setup();
    const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
    let completed = 0;
    vi.spyOn(globalThis.crypto.subtle, 'digest').mockImplementation(async (...args) => {
      const result = await digest(...args);
      if (++completed === 4) h.runtime('0x010204');
      return result;
    });
    await expect(h.agent.prepareSwap(request())).rejects.toBeDefined();
    expect(completed).toBe(4);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(h.reads).toHaveBeenCalledTimes(11);
    h.assertClean();
  });

  it('accepts preparation at 4999ms while keeping the exact fresh fee and minimum', async () => {
    const h = setup();
    h.accountKusd.balance = balance('0');
    h.api.assets.getAccountAsset.mockImplementation(async (address) => {
      h.time(fixture.now + 4999);
      return address === KUSD ? { ...h.accountKusd, balance: balance('10000000000000000000') } : h.accountXor;
    });
    const prepared = await h.agent.prepareSwap(request());
    expect(prepared.fees[0]).toMatchObject({ source: 'finalized-runtime', amountCodec: '11' });
    expect(prepared.quote.minMaxCodec).toBe(minimumCodec);
    expect(h.reads).toHaveBeenCalledTimes(11);
    h.assertClean();
  });

  it.each(['public', 'owned'] as const)(
    '%s preparation times out a hanging balance lookup and rejects late persistence',
    async (mode) => {
      vi.useFakeTimers();
      const h = setup();
      h.accountKusd.balance = balance('0');
      const pending = deferred<typeof h.accountKusd>();
      const reached = deferred<void>();
      h.api.assets.getAccountAsset.mockImplementation(async (address) => {
        if (address === KUSD) {
          reached.resolve();
          return pending.promise;
        }
        return h.accountXor;
      });
      const preparing = mode === 'owned' ? prepareOwnedGoalSwap(h.agent, request()) : h.agent.prepareSwap(request());
      const rejected = expect(preparing).rejects.toMatchObject({ code: 'QUOTE_TIMEOUT' });
      await Promise.race([reached.promise, preparing]);
      h.time(fixture.now + 5000);
      await vi.advanceTimersByTimeAsync(5000);
      await rejected;
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      h.assertClean();
      vi.useRealTimers();
      const digest = globalThis.crypto.subtle.digest.bind(globalThis.crypto.subtle);
      const lateHashes = deferred<void>();
      let completedHashes = 0;
      vi.spyOn(globalThis.crypto.subtle, 'digest').mockImplementation(async (...args) => {
        const value = await digest(...args);
        if (++completedHashes === 3) lateHashes.resolve();
        return value;
      });
      pending.resolve({ ...h.accountKusd, balance: balance('10000000000000000000') });
      // Await all three real intent hashes and their continuations, not a settling delay.
      await lateHashes.promise;
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(h.reads).toHaveBeenCalledTimes(11);
      h.assertClean();
    }
  );
});

describe('executor-owned finalized preparation', () => {
  it('transfers the original provider context without exposing ownership on the public API or DTO', async () => {
    const h = setup();
    const keys = Object.keys(h.agent);
    const owned = await prepareOwnedGoalSwap(h.agent, request());
    expect(Object.keys(h.agent)).toEqual(keys);
    expect(Object.getOwnPropertySymbols(h.agent)).toEqual([]);
    expect(h.agent).not.toHaveProperty('prepareOwnedGoalSwap');
    expect(Object.isFrozen(owned)).toBe(true);
    expect(owned.context).not.toBe(owned.prepared.quote.execution!.estimate.context);
    expect(owned.context).toEqual(owned.prepared.quote.execution!.estimate.context);
    expect(() => owned.assertCurrent()).not.toThrow();
    expect(() => owned.session.assertCurrent(owned.context)).not.toThrow();
    expect(() => owned.session.assertCurrent(owned.prepared.quote.execution!.estimate.context)).toThrow();
    expect(JSON.stringify(owned.prepared)).not.toContain('assertCurrent');
    expect([...h.events.values()].map((listeners) => listeners.size)).toEqual([1, 1]);
    expect(h.reads).toHaveBeenCalledTimes(11);
    owned.dispose();
    expect(() => owned.assertCurrent()).toThrow();
    await expect(owned.session.capture({ expectedDenominator: '1' })).rejects.toBeDefined();
    h.assertClean();
  });

  it('recaptures an independently owned fresh state after the original quote expires', async () => {
    const h = setup();
    const owned = await prepareOwnedGoalSwap(h.agent, request());
    h.time(fixture.now + 5000);
    expect(() => owned.assertCurrent()).toThrow();
    const fresh = await owned.session.capture({ expectedDenominator: '1' });
    expect(fresh).not.toBe(owned.context);
    expect(fresh.block).toEqual(owned.context.block);
    expect(fresh.receivedAtMs).toBe(fixture.now + 5000);
    expect(() => owned.session.assertCurrent(fresh)).not.toThrow();
    const estimate = await owned.session.quote(fresh, { assetIn: KUSD, assetOut: XOR, amountInCodec: inputCodec });
    expect(estimate.status).toBe('available');
    expect(h.reads).toHaveBeenCalledTimes(22);
    owned.dispose();
    h.assertClean();
  });

  it('invalidates a retained session after disconnect/reconnect without another RPC', async () => {
    const h = setup();
    const owned = await prepareOwnedGoalSwap(h.agent, request());
    h.emit('disconnected');
    h.emit('connected');
    expect(() => owned.assertCurrent()).toThrow();
    await expect(owned.session.capture({ expectedDenominator: '1' })).rejects.toBeDefined();
    expect(h.reads).toHaveBeenCalledTimes(11);
    owned.dispose();
    h.assertClean();
  });

  it('disposes only its own capability when public and owned preparations share the SDK', async () => {
    const h = setup();
    const first = await prepareOwnedGoalSwap(h.agent, request());
    const second = await prepareOwnedGoalSwap(h.agent, request());
    await h.agent.prepareSwap(request());
    expect([...h.events.values()].map((listeners) => listeners.size)).toEqual([2, 2]);
    first.dispose();
    expect([...h.events.values()].map((listeners) => listeners.size)).toEqual([1, 1]);
    expect(() => second.assertCurrent()).not.toThrow();
    second.dispose();
    expect(h.reads).toHaveBeenCalledTimes(33);
    h.assertClean();
  });

  it('rejects a copied API identity and legacy requests before any read', async () => {
    const h = setup();
    await expect(prepareOwnedGoalSwap({ ...h.agent }, request())).rejects.toThrow('bots.errors.intent');
    const { execution: _execution, ...legacy } = request();
    await expect(prepareOwnedGoalSwap(h.agent, legacy)).rejects.toThrow('bots.errors.intent');
    expect(h.reads).not.toHaveBeenCalled();
    h.assertClean();
  });

  it('rejects accessor selectors without invoking them', async () => {
    const h = setup();
    const getter = vi.fn(() => request().execution);
    const input = request();
    Object.defineProperty(input, 'execution', { get: getter });
    await expect(prepareOwnedGoalSwap(h.agent, input)).rejects.toThrow('bots.errors.intent');
    expect(getter).not.toHaveBeenCalled();
    expect(h.reads).not.toHaveBeenCalled();
    h.assertClean();
  });
});
