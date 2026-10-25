// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createExecutionStateProvider,
  EXECUTION_STATE_POLICY,
  type ExecutionRpcMethod,
} from '@/features/bot-trading/execution-state';
import {
  createHistoricalExecutionCodec,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { createExecutionStateFixture } from './execution-state-fixture';
import { feeBytes, hex, le } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';
vi.unmock('@polkadot/util-crypto');
const H = (n: string) => `0x${n.repeat(64)}`;
const input = { assetIn: KUSD, assetOut: XOR, amountInCodec: '2500000000000000000' };
const fixture = createExecutionStateFixture();

/** Public placeholder signature for structural tests only; no private key or signing operation. */
function feeEnvelope(options: { signature?: number; tip?: string; period?: number; output?: string } = {}) {
  const request = { ...input, quotedAmountOutCodec: options.output ?? '990000000000000000' };
  const call = createHistoricalExecutionCodec(fixture.identity).buildSwapEnvelope(request);
  const tx = fixture.registry.createType('Extrinsic', fixture.registry.createType('Call', call.callHex), {
    version: 4,
  });
  const signatureType = options.signature ?? 1;
  const payload = fixture.registry.createType(
    'ExtrinsicPayload',
    {
      method: call.callHex,
      nonce: '1',
      tip: options.tip ?? '0',
      era: { current: 100, period: options.period ?? 64 },
      genesisHash: GENESIS,
      blockHash: fixture.identity.blockHash,
      ...fixture.identity.runtimeVersion,
    },
    { version: 4 }
  );
  tx.addSignature(
    H('3'),
    hex(Uint8Array.from([signatureType, ...Array(signatureType < 2 ? 64 : 65).fill(1)])),
    payload.toHex()
  );
  return { tx, request: { ...request, envelopeHex: tx.toHex() } };
}
function setup() {
  let now = fixture.now;
  let identity = {};
  let connected = true;
  const proof: Record<keyof typeof fixture.proof, string | null> = { ...fixture.proof };
  const blockHash = fixture.identity.blockHash;
  const rawQuote = {
    amount: '990000000000000000',
    amount_without_impact: '1000000000000000000',
    fee: { [XOR]: '6000000000000000' },
    route: [KUSD, XOR],
  };
  const calls: { method: ExecutionRpcMethod; params: readonly unknown[]; signal: AbortSignal }[] = [];
  const response = (method: ExecutionRpcMethod, params: readonly unknown[]): unknown => {
    switch (method) {
      case 'chain_getBlockHash':
        return params[0] === 0 ? GENESIS : blockHash;
      case 'chain_getFinalizedHead':
        return blockHash;
      case 'chain_getHeader':
        return { number: '0x64', parentHash: H('3'), stateRoot: H('4'), extrinsicsRoot: H('5'), digest: { logs: [] } };
      case 'state_getRuntimeVersion':
        return { specName: 'sora-substrate', specVersion: 130, transactionVersion: 130, apis: [] };
      case 'state_getMetadata':
        return fixture.identity.metadataHex;
      case 'state_getStorageHash':
        return H('a');
      case 'state_queryStorageAt':
        return [
          {
            block: blockHash,
            changes: Object.entries(fixture.keys).map(([label, key]) => [key, proof[label as keyof typeof proof]]),
          },
        ];
      case 'liquidityProxy_quote':
        return rawQuote;
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
  let intercept: ((method: ExecutionRpcMethod, params: readonly unknown[]) => unknown | Promise<unknown>) | undefined;
  const request = vi.fn(async (method: ExecutionRpcMethod, params: readonly unknown[], signal: AbortSignal) => {
    calls.push({ method, params, signal });
    return intercept ? intercept(method, params) : response(method, params);
  });
  const dependencies = { request, connection: () => ({ identity, connected }), now: () => now };
  return {
    provider: createExecutionStateProvider(dependencies),
    dependencies,
    proof,
    rawQuote,
    calls,
    response,
    setNow: (value: number) => {
      now = value;
    },
    reconnect: () => {
      identity = {};
    },
    disconnect: () => {
      connected = false;
    },
    intercept: (fn: typeof intercept) => {
      intercept = fn;
    },
  };
}
afterEach(() => vi.useRealTimers());
describe('actual envelope fee estimates', () => {
  it.each([0, 1, 2])('queries exact supplied bytes and actual length for signature layout %s', async (signature) => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    const { tx, request } = feeEnvelope({ signature });
    const result = await s.provider.estimateEnvelopeFee(c, request);
    const encoded = hex(Buffer.concat([tx.toU8a(), le(tx.toU8a().length, 4)]));
    expect(result.context).toBe(c);
    expect(result.feeQueryDataHex).toBe(encoded);
    expect(result.inspection.encodedLength).toBe(tx.toU8a().length);
    expect(result.inspection.encodedLength).toBeLessThan(result.inspection.maximumEncodedLength);
    expect(result.fee.amountCodec).toBe('11');
    expect(result).toMatchObject({
      rpcCalls: 2,
      signatureVerified: false,
      accountAuthorityVerified: false,
      feeAdequacyVerified: false,
      observedFill: false,
      transactionSubmitted: false,
    });
    expect(s.calls.slice(8).map(({ method, params }) => ({ method, params }))).toEqual([
      { method: 'state_call', params: ['TransactionPaymentApi_query_info', encoded, c.block.hash] },
      { method: 'state_call', params: ['TransactionPaymentApi_query_fee_details', encoded, c.block.hash] },
    ]);
    expect(Object.isFrozen(result.fee.details.inclusionFee)).toBe(true);
    expect(result.receivedAtMs).toBe(fixture.now);
  });
  it.each(['tip', 'era', 'amount', 'minimum', 'hex'] as const)(
    'rejects changed %s before network reads',
    async (change) => {
      const s = setup();
      const c = await s.provider.capture({ expectedDenominator: '1' });
      const { request } = feeEnvelope(change === 'tip' ? { tip: '1' } : change === 'era' ? { period: 32 } : {});
      if (change === 'amount') request.amountInCodec = '1';
      if (change === 'minimum') request.quotedAmountOutCodec = '880000000000000000';
      if (change === 'hex') request.envelopeHex = '0x00';
      await expect(s.provider.estimateEnvelopeFee(c, request)).rejects.toBeDefined();
      expect(s.calls).toHaveLength(8);
    }
  );
  it('rejects a foreign context without reading its fields or requesting fees', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    await expect(s.provider.estimateEnvelopeFee({ ...c }, feeEnvelope().request)).rejects.toMatchObject({
      reason: 'invalid-input',
    });
    expect(s.calls).toHaveLength(8);
  });
  it('retains the original request across asynchronous fee reads', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    const { request } = feeEnvelope();
    const original = { ...request };
    s.intercept((method, params) => {
      request.amountInCodec = '1';
      request.envelopeHex = '0x00';
      return s.response(method, params);
    });
    const result = await s.provider.estimateEnvelopeFee(c, request);
    expect(result.request.amountInCodec).toBe(original.amountInCodec);
    expect(result.envelopeHex).toBe(original.envelopeHex);
  });
  it('rejects disagreeing raw fee methods without a usable estimate', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    s.intercept((method, params) =>
      params[0] === 'TransactionPaymentApi_query_fee_details' ? feeBytes(1, 7, 4) : s.response(method, params)
    );
    await expect(s.provider.estimateEnvelopeFee(c, feeEnvelope().request)).rejects.toMatchObject({
      reason: 'invalid-response',
    });
    expect(s.calls).toHaveLength(10);
  });
  it.each(['connection', 'receipt-age', 'block-age'] as const)(
    'rejects %s changes between fee methods',
    async (change) => {
      const s = setup();
      if (change === 'block-age') s.proof.timestamp = hex(le(fixture.now - 60000, 8));
      const c = await s.provider.capture({ expectedDenominator: '1' });
      if (change === 'receipt-age') s.setNow(fixture.now + 4900);
      s.intercept((method, params) => {
        if (change === 'connection') s.reconnect();
        else s.setNow(fixture.now + (change === 'receipt-age' ? 5000 : 1));
        return s.response(method, params);
      });
      await expect(s.provider.estimateEnvelopeFee(c, feeEnvelope().request)).rejects.toMatchObject({
        reason:
          change === 'connection' ? 'connection-changed' : change === 'receipt-age' ? 'stale-context' : 'stale-block',
      });
      expect(s.calls).toHaveLength(9);
    }
  );
  it.each(['abort', 'timeout'] as const)('stops %s waits and discards a late fee response', async (reason) => {
    vi.useFakeTimers();
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    const controller = new AbortController();
    let release!: (value: unknown) => void;
    s.intercept(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const pending = s.provider.estimateEnvelopeFee(c, feeEnvelope().request, controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ reason: reason === 'abort' ? 'aborted' : 'timeout' });
    if (reason === 'abort') controller.abort();
    else await vi.advanceTimersByTimeAsync(5000);
    await rejected;
    release(s.response('state_call', ['TransactionPaymentApi_query_info']));
    await Promise.resolve();
    await Promise.resolve();
    expect(s.calls).toHaveLength(9);
    expect(s.calls[8].signal.aborted).toBe(true);
  });
  it('rechecks freshness after the final detached output copy', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    const { request } = feeEnvelope();
    const original = Object.getOwnPropertyDescriptors;
    const spy = vi.spyOn(Object, 'getOwnPropertyDescriptors').mockImplementation((value) => {
      const descriptors = original(value);
      if (descriptors.kind?.value === 'finalized-envelope-fee-estimate') s.setNow(fixture.now + 5000);
      return descriptors;
    });
    try {
      await expect(s.provider.estimateEnvelopeFee(c, request)).rejects.toMatchObject({ reason: 'timeout' });
    } finally {
      spy.mockRestore();
    }
  });
});
describe('browser finalized execution state', () => {
  it('captures eight exact-state RPCs and distinguishes block timestamp from receipt time', async () => {
    const s = setup();
    const context = await s.provider.capture({ expectedDenominator: '1' });
    expect(context.rpcCalls).toBe(8);
    expect(context.block).toMatchObject({
      hash: fixture.identity.blockHash,
      height: 100,
      timestampMs: fixture.now - 6000,
    });
    expect(context.receivedAtMs).toBe(fixture.now);
    expect(context.policy).toEqual(EXECUTION_STATE_POLICY);
    expect(Object.isFrozen(context.pool.state.assets.kusd)).toBe(true);
    expect(Object.keys(context)).not.toContain('identity');
    expect(
      s.calls.filter((c) => c.method.startsWith('state_')).every((c) => c.params.at(-1) === fixture.identity.blockHash)
    ).toBe(true);
    expect(s.calls.find((c) => c.method === 'state_queryStorageAt')!.params[0]).toEqual(Object.values(fixture.keys));
  });
  it('quotes one exact lot and bounded native fee at the same state without applying admission filters', async () => {
    const s = setup();
    const context = await s.provider.capture({ expectedDenominator: '1' });
    s.rawQuote.amount = '970000000000000000'; // >1% impact remains a valid estimate, not an admitted order.
    const result = await s.provider.quote(context, input);
    expect(result.status).toBe('available');
    if (result.status !== 'available') throw Error('expected estimate');
    expect(result.context).toBe(context);
    expect(result.quote.minimumAmountOutCodec).toBe('965150000000000000');
    expect(result.fee.amountCodec).toBe('11');
    expect(result.quote.poolFeeCodec).toBe('6000000000000000');
    expect(result.rpcCalls).toBe(3);
    expect(result.feeAdequacyVerified).toBe(false);
    expect(Object.isFrozen(result.fee.details.inclusionFee)).toBe(true);
    const calls = s.calls.slice(8);
    expect(calls[0].params).toEqual([
      0,
      KUSD,
      XOR,
      input.amountInCodec,
      'WithDesiredInput',
      ['XYKPool'],
      'AllowSelected',
      context.block.hash,
    ]);
    expect(calls.slice(1).map((c) => c.params[1])).toEqual([
      result.fee.envelope.feeQueryDataHex,
      result.fee.envelope.feeQueryDataHex,
    ]);
    expect(calls.every((c) => c.params.at(-1) === context.block.hash)).toBe(true);
  });
  it('supports the exact reverse lot without inventory sizing or route substitution', async () => {
    const s = setup();
    s.rawQuote.route = [XOR, KUSD];
    const c = await s.provider.capture({ expectedDenominator: '1' });
    const result = await s.provider.quote(c, { assetIn: XOR, assetOut: KUSD, amountInCodec: '7' });
    expect(result.status).toBe('available');
    expect(s.calls[8].params[3]).toBe('7');
  });
  it.each(['absent', 'missing-reserves', 'zero-reserves'] as const)(
    'preserves %s pool status without a quote request',
    async (status) => {
      const s = setup();
      if (status === 'absent') {
        s.proof.properties = null;
        s.proof.reserves = null;
      }
      if (status === 'missing-reserves') s.proof.reserves = null;
      if (status === 'zero-reserves') s.proof.reserves = hex(Buffer.concat([le(0), le(1000)]));
      const c = await s.provider.capture({ expectedDenominator: '1' });
      const result = await s.provider.quote(c, input);
      expect(result).toMatchObject({ status: 'unavailable', reason: `pool-${status}`, rpcCalls: 0 });
      expect(s.calls).toHaveLength(8);
    }
  );
  it('returns a null quote honestly and makes no fee request', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    s.intercept((method, params) => (method === 'liquidityProxy_quote' ? null : s.response(method, params)));
    expect(await s.provider.quote(c, input)).toMatchObject({
      status: 'unavailable',
      reason: 'quote-unavailable',
      rpcCalls: 1,
    });
  });
  it.each([
    'genesis',
    'canonical',
    'code',
    'runtime',
    'storage-block',
    'storage-duplicate',
    'storage-order',
    'denominator',
    'asset',
  ])('rejects conflicting %s evidence', async (which) => {
    const s = setup();
    s.intercept((method, params) => {
      const original = s.response(method, params);
      if (which === 'genesis' && method === 'chain_getBlockHash' && params[0] === 0) return H('f');
      if (which === 'canonical' && method === 'chain_getBlockHash' && params[0] !== 0) return H('f');
      if (which === 'code' && method === 'state_getStorageHash') return null;
      if (which === 'runtime' && method === 'state_getRuntimeVersion')
        return { ...(original as object), specVersion: 999 };
      if (method === 'state_queryStorageAt') {
        const rows = original as { block: string; changes: (string | null)[][] }[];
        if (which === 'storage-block') rows[0].block = H('f');
        if (which === 'storage-duplicate') rows[0].changes[1] = rows[0].changes[0];
        if (which === 'storage-order') rows[0].changes.reverse();
        if (which === 'denominator') rows[0].changes[1][1] = hex(le(2));
        if (which === 'asset') rows[0].changes[2][1] = rows[0].changes[3][1];
      }
      return original;
    });
    await expect(s.provider.capture({ expectedDenominator: '1' })).rejects.toMatchObject({
      reason: 'invalid-response',
    });
  });
  it.each([60000, 60001, -1])('enforces finalized block age %s without clock-skew allowance', async (age) => {
    const s = setup();
    s.proof.timestamp = hex(le(fixture.now - age, 8));
    const promise = s.provider.capture({ expectedDenominator: '1' });
    if (age === 60000) expect((await promise).block.timestampMs).toBe(fixture.now - age);
    else await expect(promise).rejects.toMatchObject({ reason: age < 0 ? 'future-block' : 'stale-block' });
  });
  it('rejects foreign, cloned and cross-provider contexts before quoting', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    await expect(s.provider.quote({ ...c }, input)).rejects.toMatchObject({ reason: 'invalid-input' });
    await expect(createExecutionStateProvider(s.dependencies).quote(c, input)).rejects.toMatchObject({
      reason: 'invalid-input',
    });
    expect(s.calls).toHaveLength(8);
  });
  it.each([4999, 5000])('checks context age %s at the beginning', async (age) => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    s.setNow(fixture.now + age);
    const promise = s.provider.quote(c, input);
    if (age === 4999) expect((await promise).status).toBe('available');
    else {
      await expect(promise).rejects.toMatchObject({ reason: 'stale-context' });
      expect(s.calls).toHaveLength(8);
    }
  });
  it('rejects a context that expires during a successful final fee response', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    s.setNow(fixture.now + 4900);
    s.intercept((method, params) => {
      if (params[0] === 'TransactionPaymentApi_query_fee_details') s.setNow(fixture.now + 5000);
      return s.response(method, params);
    });
    await expect(s.provider.quote(c, input)).rejects.toMatchObject({ reason: 'stale-context' });
  });
  it.each(['before', 'during'] as const)('rejects a changed connection %s reads', async (when) => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    if (when === 'before') s.reconnect();
    else
      s.intercept((method, params) => {
        s.reconnect();
        return s.response(method, params);
      });
    await expect(s.provider.quote(c, input)).rejects.toMatchObject({ reason: 'connection-changed' });
    expect(s.calls.length).toBe(when === 'before' ? 8 : 9);
  });
  it('rejects a disconnected client before requesting data', async () => {
    const s = setup();
    s.disconnect();
    await expect(s.provider.capture({ expectedDenominator: '1' })).rejects.toMatchObject({ reason: 'disconnected' });
    expect(s.calls).toHaveLength(0);
  });
  it('times out the whole operation even when transport ignores abort and discards late responses', async () => {
    vi.useFakeTimers();
    const s = setup();
    let release!: (value: unknown) => void;
    s.intercept(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    const promise = s.provider.capture({ expectedDenominator: '1' });
    const rejection = expect(promise).rejects.toMatchObject({ reason: 'timeout' });
    await vi.advanceTimersByTimeAsync(5000);
    await rejection;
    release(fixture.identity.blockHash);
    await Promise.resolve();
    await Promise.resolve();
    expect(s.calls).toHaveLength(2);
    expect(s.calls.every((c) => c.signal.aborted)).toBe(true);
  });
  it('aborts waiting without disconnecting or starting dependent RPCs', async () => {
    const s = setup();
    const controller = new AbortController();
    s.intercept(() => new Promise(() => undefined));
    const promise = s.provider.capture({ expectedDenominator: '1' }, controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ reason: 'aborted' });
    expect(s.calls).toHaveLength(2);
    s.intercept(undefined);
    expect((await s.provider.capture({ expectedDenominator: '1' })).rpcCalls).toBe(8);
  });
  it('checks elapsed clock time after synchronous response processing as well as timers', async () => {
    const s = setup();
    s.intercept((method, params) => {
      s.setNow(fixture.now + 5000);
      return s.response(method, params);
    });
    await expect(s.provider.capture({ expectedDenominator: '1' })).rejects.toMatchObject({ reason: 'timeout' });
  });
  it('never invokes hostile input or response accessors', async () => {
    const getter = vi.fn(() => '1');
    const s = setup();
    await expect(
      s.provider.capture(
        Object.defineProperty({}, 'expectedDenominator', { enumerable: true, get: getter }) as {
          expectedDenominator: string;
        }
      )
    ).rejects.toBeDefined();
    s.intercept((method, params) =>
      method === 'state_getRuntimeVersion'
        ? Object.defineProperty({}, 'specName', { enumerable: true, get: getter })
        : s.response(method, params)
    );
    await expect(s.provider.capture({ expectedDenominator: '1' })).rejects.toBeDefined();
    expect(getter).not.toHaveBeenCalled();
  });
  it.each(['sparse', 'oversize', 'prototype'] as const)('rejects %s raw results', async (kind) => {
    const s = setup();
    s.intercept((method, params) =>
      method !== 'state_getRuntimeVersion'
        ? s.response(method, params)
        : kind === 'sparse'
          ? Array(3)
          : kind === 'oversize'
            ? 'x'.repeat(4_300_001)
            : new Date()
    );
    await expect(s.provider.capture({ expectedDenominator: '1' })).rejects.toBeDefined();
  });
  it.each(['0', '01', '-1', '2.5', '340282366920938463463374607431768211456'])(
    'rejects invalid exact input %s before a quote RPC',
    async (amountInCodec) => {
      const s = setup();
      const c = await s.provider.capture({ expectedDenominator: '1' });
      await expect(s.provider.quote(c, { ...input, amountInCodec })).rejects.toBeDefined();
      expect(s.calls).toHaveLength(8);
    }
  );
  it('rejects inconsistent native fee estimates and exposes no raw provider error', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    s.intercept((method, params) =>
      params[0] === 'TransactionPaymentApi_query_fee_details' ? feeBytes(1, 7, 4) : s.response(method, params)
    );
    await expect(s.provider.quote(c, input)).rejects.toMatchObject({ reason: 'invalid-response' });
    s.intercept(() => {
      throw Error('secret endpoint credentials');
    });
    await expect(s.provider.quote(c, input)).rejects.toMatchObject({
      reason: 'rpc-unavailable',
      message: 'Execution state unavailable: rpc-unavailable',
    });
  });
  it('rechecks context freshness and epoch synchronously without RPC after serialization', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    JSON.stringify(c);
    expect(() => s.provider.assertCurrent(c)).not.toThrow();
    s.setNow(fixture.now + 5000);
    expect(() => s.provider.assertCurrent(c)).toThrow('stale-context');
    s.setNow(fixture.now);
    s.reconnect();
    expect(() => s.provider.assertCurrent(c)).toThrow('connection-changed');
    expect(() => s.provider.assertCurrent({ ...c })).toThrow('invalid-input');
    expect(s.calls).toHaveLength(8);
  });
  it.each(['genesis-finalized', 'first-parent', 'later-genesis-parent'])(
    'rejects known impossible genesis linkage: %s',
    async (which) => {
      const s = setup();
      s.intercept((method, params) => {
        if (which === 'genesis-finalized' && method === 'chain_getFinalizedHead') return GENESIS;
        const raw = s.response(method, params);
        if (method === 'chain_getHeader')
          return {
            ...(raw as object),
            number: which === 'first-parent' ? '0x1' : '0x64',
            parentHash: which === 'first-parent' ? H('3') : GENESIS,
          };
        return raw;
      });
      await expect(s.provider.capture({ expectedDenominator: '1' })).rejects.toMatchObject({
        reason: 'invalid-response',
      });
    }
  );
  it('expires the 60-second block bound independently of the five-second receipt bound', async () => {
    const s = setup();
    s.proof.timestamp = hex(le(fixture.now - 60000, 8));
    const c = await s.provider.capture({ expectedDenominator: '1' });
    s.setNow(fixture.now + 1);
    expect(() => s.provider.assertCurrent(c)).toThrow('stale-block');
    await expect(s.provider.quote(c, input)).rejects.toMatchObject({ reason: 'stale-block' });
    expect(s.calls).toHaveLength(8);
  });
  it('checks freshness again after detaching and freezing the final quote result', async () => {
    const s = setup();
    const c = await s.provider.capture({ expectedDenominator: '1' });
    // Simulate time spent traversing the final immutable output, after the final fee response.
    const original = Object.getOwnPropertyDescriptors;
    const spy = vi.spyOn(Object, 'getOwnPropertyDescriptors').mockImplementation((value) => {
      const result = original(value);
      if (result.status?.value === 'available' && result.feeAdequacyVerified) s.setNow(fixture.now + 5000);
      return result;
    });
    try {
      await expect(s.provider.quote(c, input)).rejects.toMatchObject({ reason: 'timeout' });
    } finally {
      spy.mockRestore();
    }
  });
});
