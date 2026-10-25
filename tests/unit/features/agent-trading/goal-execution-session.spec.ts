// @vitest-environment node
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { ApiPromise } from '@polkadot/api';
import {
  createGoalExecutionSession,
  type GoalExecutionSessionClient,
} from '@/features/agent-trading/goal-execution-session';
import type { GoalRpcMethod } from '@/features/agent-trading/goal-rpc';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { createExecutionStateFixture } from '../bot-trading/execution-state-fixture';
import { feeBytes, hex } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';

vi.unmock('@polkadot/util-crypto');
const fixture = createExecutionStateFixture();
const hash = (n: string) => `0x${n.repeat(64)}`;
const input = { assetIn: KUSD, assetOut: XOR, amountInCodec: '2500000000000000000' };
const captureInput = { expectedDenominator: '1' };
type Event = 'connected' | 'disconnected';
type MutableClient = { -readonly [K in keyof GoalExecutionSessionClient]: GoalExecutionSessionClient[K] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

function setup() {
  const events = new Map<Event, Set<() => void>>();
  let runtimeHex = '0x010203';
  let genesisHex = GENESIS;
  let now = fixture.now;
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
          amount: '990000000000000000',
          amount_without_impact: '1000000000000000000',
          fee: { [XOR]: '6000000000000000' },
          route: [KUSD, XOR],
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
  let intercept: ((method: GoalRpcMethod, params: readonly unknown[]) => Promise<unknown> | unknown) | undefined;
  const reads = vi.fn(async (method: GoalRpcMethod, params: readonly unknown[]) =>
    intercept ? intercept(method, params) : response(method, params)
  );
  const raw = (method: GoalRpcMethod) => ({ raw: (...params: never[]) => reads(method, params) });
  const client: MutableClient = {
    isConnected: true,
    genesisHash: { toHex: () => genesisHex },
    runtimeVersion: { toHex: () => runtimeHex },
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
    on: vi.fn((event, listener) => {
      if (!events.has(event)) events.set(event, new Set());
      events.get(event)!.add(listener);
    }),
    off: vi.fn((event, listener) => events.get(event)?.delete(listener)),
  };
  let currentClient: object = client;
  const isCurrent = vi.fn(() => currentClient === client);
  const options = { client, isCurrent, now: () => now };
  return {
    client,
    options,
    reads,
    response,
    events,
    isCurrent,
    create: () => createGoalExecutionSession(options),
    emit: (event: Event) => {
      for (const listener of events.get(event) ?? []) listener();
    },
    replaceClient: () => {
      currentClient = {};
    },
    restoreClient: () => {
      currentClient = client;
    },
    runtime: (value: string) => {
      runtimeHex = value;
    },
    genesis: (value: string) => {
      genesisHex = value;
    },
    time: (value: number) => {
      now = value;
    },
    intercept: (fn: typeof intercept) => {
      intercept = fn;
    },
  };
}

describe('revocable connected goal execution session', () => {
  it('composes real raw RPC and state provider without exposing transport or signing capability', async () => {
    expectTypeOf<ApiPromise>().toMatchTypeOf<GoalExecutionSessionClient>();
    const h = setup();
    const session = h.create();
    const context = await session.capture(captureInput);
    const result = await session.quote(context, input);
    expect(context.rpcCalls).toBe(8);
    expect(result.status).toBe('available');
    if (result.status !== 'available') throw Error('expected estimate');
    expect(result.fee.amountCodec).toBe('11');
    expect(result.context).toBe(context);
    expect(result.transactionSubmitted).toBe(false);
    const fee = await session.estimateEnvelopeFee(context, {
      ...input,
      quotedAmountOutCodec: result.quote.amountOutCodec,
      envelopeHex: result.fee.envelope.envelopeHex,
    });
    expect(fee.fee.amountCodec).toBe('11');
    expect(fee.signatureVerified).toBe(false);
    expect(h.reads).toHaveBeenCalledTimes(13);
    session.assertCurrent(context);
    expect(Object.keys(session)).toEqual([
      'captureTerminal',
      'assertTerminal',
      'capture',
      'quote',
      'estimateEnvelopeFee',
      'assertCurrent',
      'dispose',
    ]);
    expect(Object.isFrozen(session)).toBe(true);
    session.dispose();
  });

  it.each(['connected', 'disconnected'] as const)('permanently revokes on a public %s event', async (event) => {
    const h = setup();
    const session = h.create();
    h.emit(event);
    h.client.isConnected = true;
    await expect(session.capture(captureInput)).rejects.toMatchObject({ reason: 'context-changed' });
    expect(h.reads).not.toHaveBeenCalled();
    session.dispose();
  });

  it('discards an ABA disconnect/reconnect during a pending read without waiting for its response', async () => {
    const h = setup();
    const pending = deferred<unknown>();
    h.intercept((method, params) =>
      method === 'chain_getFinalizedHead' ? pending.promise : h.response(method, params)
    );
    const session = h.create();
    const result = session.capture(captureInput);
    const rejection = expect(result).rejects.toMatchObject({ reason: 'context-changed' });
    h.client.isConnected = false;
    h.emit('disconnected');
    h.client.isConnected = true;
    h.emit('connected');
    await rejection;
    pending.resolve(fixture.identity.blockHash);
    await Promise.resolve();
    await expect(session.capture(captureInput)).rejects.toMatchObject({ reason: 'context-changed' });
    expect(h.reads).toHaveBeenCalledTimes(2);
    session.dispose();
  });

  it.each(['client', 'runtime-object', 'runtime-bytes', 'metadata', 'genesis', 'disconnected'] as const)(
    'rejects observed %s changes before another read and never recovers automatically',
    async (change) => {
      const h = setup();
      const session = h.create();
      const runtime = h.client.runtimeVersion;
      const metadata = h.client.runtimeMetadata;
      if (change === 'client') h.replaceClient();
      if (change === 'runtime-object') h.client.runtimeVersion = { toHex: () => '0x010203' };
      if (change === 'runtime-bytes') h.runtime('0x010204');
      if (change === 'metadata') h.client.runtimeMetadata = {};
      if (change === 'genesis') h.genesis(hash('2'));
      if (change === 'disconnected') h.client.isConnected = false;
      await expect(session.capture(captureInput)).rejects.toMatchObject({ reason: 'context-changed' });
      h.restoreClient();
      h.client.runtimeVersion = runtime;
      h.runtime('0x010203');
      h.client.runtimeMetadata = metadata;
      h.genesis(GENESIS);
      h.client.isConnected = true;
      await expect(session.capture(captureInput)).rejects.toMatchObject({ reason: 'context-changed' });
      expect(h.reads).not.toHaveBeenCalled();
      session.dispose();
    }
  );

  it.each(['client', 'runtime'] as const)('checks a %s change after a pending raw read', async (change) => {
    const h = setup();
    const pending = deferred<unknown>();
    h.intercept((method, params) =>
      method === 'chain_getFinalizedHead' ? pending.promise : h.response(method, params)
    );
    const session = h.create();
    const result = session.capture(captureInput);
    const rejection = expect(result).rejects.toMatchObject({ reason: 'context-changed' });
    if (change === 'client') h.replaceClient();
    else h.runtime('0x0506');
    pending.resolve(fixture.identity.blockHash);
    await rejection;
    expect(h.reads).toHaveBeenCalledTimes(2);
    session.dispose();
  });

  it('disposal aborts a pending quote, rejects old contexts, and removes only its own listeners', async () => {
    const h = setup();
    const other = vi.fn();
    h.client.on('connected', other);
    h.client.on('disconnected', other);
    const session = h.create();
    const context = await session.capture(captureInput);
    const pending = deferred<unknown>();
    h.intercept((method, params) => (method === 'liquidityProxy_quote' ? pending.promise : h.response(method, params)));
    const result = session.quote(context, input);
    const rejection = expect(result).rejects.toMatchObject({ reason: 'disposed' });
    session.dispose();
    session.dispose();
    await rejection;
    expect(h.client.off).toHaveBeenCalledTimes(2);
    expect(h.events.get('connected')).toEqual(new Set([other]));
    expect(h.events.get('disconnected')).toEqual(new Set([other]));
    h.emit('connected');
    expect(other).toHaveBeenCalledTimes(1);
    pending.resolve(h.response('liquidityProxy_quote', []));
    await Promise.resolve();
    expect(() => session.assertCurrent(context)).toThrow('disposed');
    await expect(session.capture(captureInput)).rejects.toMatchObject({ reason: 'disposed' });
    expect(h.reads).toHaveBeenCalledTimes(9);
  });

  it('a caller cancellation retires only that operation, allowing another read in the same session', async () => {
    const h = setup();
    const session = h.create();
    const abort = new AbortController();
    abort.abort();
    await expect(session.capture(captureInput, abort.signal)).rejects.toMatchObject({ reason: 'aborted' });
    expect(h.reads).not.toHaveBeenCalled();
    const context = await session.capture(captureInput);
    h.time(fixture.now + 5000);
    expect(() => session.assertCurrent(context)).toThrow('stale-context');
    session.dispose();
  });

  it('a reconnect also invalidates pending envelope fee reads before their second RPC', async () => {
    const h = setup();
    const session = h.create();
    const context = await session.capture(captureInput);
    const quote = await session.quote(context, input);
    if (quote.status !== 'available') throw Error('expected estimate');
    const pending = deferred<unknown>();
    h.intercept(() => pending.promise);
    const result = session.estimateEnvelopeFee(context, {
      ...input,
      quotedAmountOutCodec: quote.quote.amountOutCodec,
      envelopeHex: quote.fee.envelope.envelopeHex,
    });
    const rejection = expect(result).rejects.toMatchObject({ reason: 'context-changed' });
    h.emit('connected');
    await rejection;
    pending.resolve(h.response('state_call', ['TransactionPaymentApi_query_info']));
    await Promise.resolve();
    expect(h.reads).toHaveBeenCalledTimes(12);
    session.dispose();
  });

  it('removes listeners when construction fails, including a partially installed second listener', () => {
    const h = setup();
    const original = h.client.on;
    h.client.on = (event, listener) => {
      original(event, listener);
      if (event === 'disconnected') throw Error('private endpoint detail');
    };
    expect(() => h.create()).toThrow('Goal execution session unavailable');
    expect(h.events.get('connected')?.size).toBe(0);
    expect(h.events.get('disconnected')?.size).toBe(0);
    expect(h.reads).not.toHaveBeenCalled();
  });

  it('normalizes throwing caller guards and closes listeners before returning a failed session', () => {
    const h = setup();
    h.isCurrent.mockImplementation(() => {
      throw Error('private context detail');
    });
    expect(() => h.create()).toThrow('Goal execution session context-changed');
    expect(h.events.get('connected')?.size).toBe(0);
    expect(h.events.get('disconnected')?.size).toBe(0);
    expect(h.reads).not.toHaveBeenCalled();
  });

  it('requires the custom public raw RPC methods before returning a capability', () => {
    const h = setup();
    h.client.rpc = {};
    expect(() => h.create()).toThrow('Goal execution session unavailable');
    expect(h.events.get('connected')?.size).toBe(0);
    expect(h.events.get('disconnected')?.size).toBe(0);
    expect(h.reads).not.toHaveBeenCalled();
  });
});
