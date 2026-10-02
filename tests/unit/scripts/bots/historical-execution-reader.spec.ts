import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HISTORICAL_EXECUTION_ENDPOINT,
  HistoricalExecutionReadError,
  readHistoricalExecutionQuote,
  type HistoricalExecutionRequest,
} from '../../../../scripts/bots/historical-execution-reader';

const codec = vi.hoisted(() => ({
  create: vi.fn(),
  build: vi.fn(),
  storage: vi.fn(),
  info: vi.fn(),
  details: vi.fn(),
}));
vi.mock('../../../../scripts/bots/historical-execution-codec', () => ({
  createHistoricalExecutionCodec: codec.create,
  assertHistoricalFeeDetailsMatchesQueryInfo: codec.details,
}));

const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const BLOCK = `0x${'ab'.repeat(32)}`;
const PARENT = `0x${'ac'.repeat(32)}`;
const ANCHOR = `0x${'ad'.repeat(32)}`;
const FINALIZED = `0x${'ae'.repeat(32)}`;
const METADATA = '0x6d6574610e00';
const KEYS = { timestamp: '0x01', denominator: '0x02', kusd: '0x03', xor: '0x04', dex0: '0x05' };
const state = () => ({
  timestampMs: 1_000_000,
  denominator: '100',
  assets: {
    kusd: { assetId: KUSD, symbol: 'KUSD', decimals: 18 },
    xor: { assetId: XOR, symbol: 'XOR', decimals: 18 },
  },
  dex: { id: 0, baseAssetId: XOR },
});
const request = (): HistoricalExecutionRequest => ({
  block: { hash: BLOCK, height: 100 },
  finalizedSource: { hash: ANCHOR, height: 110, receiptSha256: 'f'.repeat(64) },
  expectedDenominator: '100',
  assetIn: KUSD,
  assetOut: XOR,
  amountInCodec: '2500000000000000000',
});
const runtime = () => ({
  specName: 'sora-substrate',
  specVersion: 130,
  transactionVersion: 130,
  apis: [['0x37c8bb1350a9a2a8', 3]],
});
const header = (height: number, parentHash = PARENT) => ({
  number: `0x${height.toString(16)}`,
  parentHash,
  stateRoot: GENESIS,
  extrinsicsRoot: GENESIS,
  digest: { logs: [] },
});
const rawQuote = (input = KUSD, output = XOR) => ({
  amount: '1000000000000000000',
  amount_without_impact: '1010000000000000000',
  route: [input, output],
  fee: { [XOR]: '100' },
  rewards: [],
});
type RpcCall = { jsonrpc: string; id: number; method: string; params: unknown[] };

/** A complete invented archive; tests never instantiate a provider or use global fetch. */
function transport(mutate?: (call: RpcCall, value: unknown) => unknown) {
  return vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
    expect(url).toBe(HISTORICAL_EXECUTION_ENDPOINT);
    expect(options).toMatchObject({ method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store' });
    const call = JSON.parse(String(options?.body)) as RpcCall;
    expect(call.jsonrpc).toBe('2.0');
    let value: unknown;
    switch (call.method) {
      case 'chain_getBlockHash':
        value = call.params[0] === 0 ? GENESIS : call.params[0] === 110 ? ANCHOR : BLOCK;
        break;
      case 'chain_getFinalizedHead':
        value = FINALIZED;
        break;
      case 'chain_getHeader':
        value = header(call.params[0] === FINALIZED ? 120 : call.params[0] === PARENT ? 99 : 100);
        break;
      case 'state_getRuntimeVersion':
        value = runtime();
        break;
      case 'state_getMetadata':
        value = METADATA;
        break;
      case 'state_getStorage':
        value = '0x00';
        break;
      case 'liquidityProxy_quote':
        value = rawQuote(String(call.params[1]), String(call.params[2]));
        break;
      case 'state_call':
        value = call.params[0] === 'TransactionPaymentApi_query_info' ? '0x06' : '0x07';
        break;
      default:
        throw new Error(`Unexpected test RPC ${call.method}`);
    }
    value = mutate ? mutate(call, value) : value;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: call.id, result: value }), { status: 200 });
  });
}
const calls = (fetcher: ReturnType<typeof transport>) =>
  fetcher.mock.calls.map(([, init]) => JSON.parse(String(init?.body)) as RpcCall);

async function readFailure(pending: Promise<unknown>): Promise<HistoricalExecutionReadError> {
  try {
    await pending;
  } catch (error) {
    expect(error).toBeInstanceOf(HistoricalExecutionReadError);
    return error as HistoricalExecutionReadError;
  }
  throw new Error('Expected a retained reader failure');
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  codec.create.mockImplementation((binding) => ({
    binding,
    storageKeys: () => ({ ...KEYS }),
    decodeStorage: codec.storage,
    buildSwapEnvelope: codec.build,
    decodeQueryInfo: codec.info,
  }));
  codec.storage.mockImplementation((raw) => {
    if (Object.values(raw).some((value) => value === null)) throw new Error('Missing exact historical storage');
    return state();
  });
  codec.build.mockImplementation((input) => ({
    ...input,
    minimumCodec: '995000000000000000',
    feeQueryDataHex: '0xabcd',
    envelopeSha256: 'e'.repeat(64),
    encodedLength: 2,
  }));
  codec.info.mockReturnValue({ partialFeeCodec: '6', rawQueryInfo: { partialFee: '6' } });
  codec.details.mockReturnValue({ inclusionFeeTotal: '6', finalFee: '6', tip: '0' });
});

describe('bounded historical execution reader', () => {
  it.each([
    [KUSD, XOR],
    [XOR, KUSD],
  ])('pins every state/quote/fee read and preserves exact %s→%s evidence', async (input, output) => {
    const fetcher = transport();
    const result = await readHistoricalExecutionQuote(
      { ...request(), assetIn: input, assetOut: output },
      { fetch: fetcher }
    );
    expect(result.kind).toBe('hypothetical-historical-execution-estimate');
    expect(result.context).toMatchObject({
      block: { hash: BLOCK, height: 100 },
      state: state(),
      causalArrivalTimeKnown: false,
    });
    expect(result.context.finalityAttestation).toEqual({
      kind: 'rpc-canonical-finalized',
      hash: FINALIZED,
      height: 120,
    });
    const sent = calls(fetcher);
    expect(sent).toHaveLength(19);
    expect(sent.filter((call) => call.method === 'state_getStorage').map((call) => call.params)).toEqual(
      Object.values(KEYS).map((key) => [key, BLOCK])
    );
    expect(sent.find((call) => call.method === 'liquidityProxy_quote')?.params).toEqual([
      0,
      input,
      output,
      '2500000000000000000',
      'WithDesiredInput',
      ['XYKPool'],
      'AllowSelected',
      BLOCK,
    ]);
    expect(sent.filter((call) => call.method === 'state_call').map((call) => call.params)).toEqual([
      ['TransactionPaymentApi_query_info', '0xabcd', BLOCK],
      ['TransactionPaymentApi_query_fee_details', '0xabcd', BLOCK],
    ]);
    expect(codec.create).toHaveBeenCalledWith({
      genesisHash: GENESIS,
      blockHash: BLOCK,
      metadataHex: METADATA,
      runtimeVersion: { specVersion: 130, transactionVersion: 130 },
    });
    expect(codec.details).toHaveBeenCalledWith('0x07', '6', '0');
    expect(
      result.rpcEvidence.every(
        (item) => item.httpStatus === 200 && item.responseBody && item.responseSha256?.length === 64
      )
    ).toBe(true);
    expect(result).toMatchObject({ observedFill: false, transactionSubmitted: false, fees: { assetId: XOR } });
  });

  it('accepts exact variable u128 inputs without floating-point conversion', async () => {
    const amount = ((1n << 128n) - 1n).toString();
    await readHistoricalExecutionQuote({ ...request(), amountInCodec: amount }, { fetch: transport() });
    expect(codec.build).toHaveBeenCalledWith(expect.objectContaining({ amountInCodec: amount }));
  });

  it('captures request scalars before await, preventing caller mutation from changing amount or state', async () => {
    const source = request();
    const fetcher = transport((call, value) => {
      if (call.id === 1) {
        source.amountInCodec = '999';
        source.block.hash = PARENT;
        source.expectedDenominator = '999';
      }
      return value;
    });
    const result = await readHistoricalExecutionQuote(source, { fetch: fetcher });
    expect(result.request.amountInCodec).toBe('2500000000000000000');
    expect(result.request.block.hash).toBe(BLOCK);
    expect(result.request.expectedDenominator).toBe('100');
  });

  it('returns unavailable only for an actual null quote, with no fee calls or fabricated costs', async () => {
    const fetcher = transport((call, value) => (call.method === 'liquidityProxy_quote' ? null : value));
    const result = await readHistoricalExecutionQuote(request(), { fetch: fetcher });
    expect(result.kind).toBe('historical-quote-unavailable');
    expect(result).not.toHaveProperty('fees');
    expect(codec.build).not.toHaveBeenCalled();
    expect(calls(fetcher).filter((call) => call.method === 'state_call')).toHaveLength(0);
  });

  it.each(['0', '01', '-1', '1.5', (1n << 128n).toString()])(
    'rejects invalid amount %s before HTTP',
    async (amountInCodec) => {
      const fetcher = transport();
      await expect(
        readHistoricalExecutionQuote({ ...request(), amountInCodec }, { fetch: fetcher })
      ).rejects.toMatchObject({ diagnostic: { stage: 'request' } });
      expect(fetcher).not.toHaveBeenCalled();
    }
  );

  it('rejects unsupported pair, self pair, invalid provenance and getters before HTTP', async () => {
    const fetcher = transport();
    const bad = [
      { ...request(), assetIn: GENESIS },
      { ...request(), assetOut: KUSD },
      { ...request(), expectedDenominator: '0' },
      { ...request(), finalizedSource: { hash: ANCHOR, height: 99, receiptSha256: 'f'.repeat(64) } },
      { ...request(), finalizedSource: { hash: ANCHOR, height: 110, receiptSha256: 'bad' } },
    ];
    const getter = vi.fn(() => BLOCK);
    bad.push({
      ...request(),
      block: Object.defineProperty({ height: 100 }, 'hash', { get: getter }) as HistoricalExecutionRequest['block'],
    });
    for (const input of bad)
      await expect(readHistoricalExecutionQuote(input, { fetch: fetcher })).rejects.toBeInstanceOf(
        HistoricalExecutionReadError
      );
    expect(fetcher).not.toHaveBeenCalled();
    expect(getter).not.toHaveBeenCalled();
  });

  it.each(['genesis', 'canonical', 'anchor', 'head', 'header', 'parent'])(
    'fails closed on mismatched %s proof before quotes',
    async (kind) => {
      const fetcher = transport((call, value) => {
        if (kind === 'genesis' && call.method === 'chain_getBlockHash' && call.params[0] === 0) return PARENT;
        if (kind === 'canonical' && call.method === 'chain_getBlockHash' && call.params[0] === 100) return PARENT;
        if (kind === 'anchor' && call.method === 'chain_getBlockHash' && call.params[0] === 110) return PARENT;
        if (kind === 'head' && call.method === 'chain_getHeader' && call.params[0] === FINALIZED) return header(109);
        if (kind === 'header' && call.method === 'chain_getHeader' && call.params[0] === BLOCK) return header(101);
        if (kind === 'parent' && call.method === 'chain_getHeader' && call.params[0] === PARENT) return header(98);
        return value;
      });
      await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toMatchObject({
        diagnostic: { stage: 'finality' },
      });
      expect(codec.create).not.toHaveBeenCalled();
      expect(calls(fetcher).some((call) => call.method === 'liquidityProxy_quote')).toBe(false);
    }
  );

  it.each(['runtime', 'metadata'])(
    'rejects parent/post %s changes rather than using a current registry',
    async (kind) => {
      const fetcher = transport((call, value) => {
        if (kind === 'runtime' && call.method === 'state_getRuntimeVersion' && call.params[0] === PARENT)
          return { ...runtime(), specVersion: 129 };
        if (kind === 'metadata' && call.method === 'state_getMetadata' && call.params[0] === PARENT)
          return '0x6d6574610f00';
        return value;
      });
      await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toMatchObject({
        diagnostic: { stage: 'runtime' },
      });
      expect(codec.create).not.toHaveBeenCalled();
    }
  );

  it('accepts only the known SORA mainnet runtime name, without a generic sora alias', async () => {
    const fetcher = transport((call, value) =>
      call.method === 'state_getRuntimeVersion' ? { ...runtime(), specName: 'sora' } : value
    );
    await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toMatchObject({
      diagnostic: { stage: 'runtime' },
    });
    expect(codec.create).not.toHaveBeenCalled();
  });

  it.each(['denomination', 'precision', 'asset', 'dex', 'timestamp', 'missing'])(
    'rejects invalid exact-state %s evidence',
    async (kind) => {
      const observed = state();
      if (kind === 'denomination') observed.denominator = '101';
      if (kind === 'precision') observed.assets.kusd.decimals = 17;
      if (kind === 'asset') observed.assets.xor.assetId = KUSD;
      if (kind === 'dex') observed.dex.baseAssetId = KUSD;
      if (kind === 'timestamp') observed.timestampMs = 0;
      if (kind !== 'missing') codec.storage.mockReturnValue(observed);
      const fetcher = transport((call, value) =>
        kind === 'missing' && call.method === 'state_getStorage' ? null : value
      );
      await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toMatchObject({
        diagnostic: { stage: 'state' },
      });
      expect(calls(fetcher).some((call) => call.method === 'liquidityProxy_quote')).toBe(false);
    }
  );

  it.each(['route', 'fee', 'amount', 'impact', 'object'])(
    'retains malformed quote %s as an error, not unavailable',
    async (kind) => {
      const invalid: Record<string, unknown> = rawQuote();
      if (kind === 'route') invalid.route = [KUSD, GENESIS, XOR];
      if (kind === 'fee') invalid.fee = { [KUSD]: '100' };
      if (kind === 'amount') invalid.amount = '0';
      if (kind === 'impact') invalid.amount_without_impact = '1';
      const fetcher = transport((call, value) =>
        call.method === 'liquidityProxy_quote' ? (kind === 'object' ? [] : invalid) : value
      );
      try {
        await readHistoricalExecutionQuote(request(), { fetch: fetcher });
        expect.fail('Expected failure');
      } catch (error) {
        expect(error).toBeInstanceOf(HistoricalExecutionReadError);
        const failure = error as HistoricalExecutionReadError;
        expect(failure.diagnostic.stage).toBe('quote');
        expect(failure.diagnostic.rpcEvidence.at(-1)?.responseBody).toBeTruthy();
        expect(failure.message).not.toContain('1000000000000000000');
      }
      expect(codec.build).not.toHaveBeenCalled();
    }
  );

  it('propagates fee decode mismatch with both retained responses and no retry', async () => {
    codec.details.mockImplementation(() => {
      throw new Error('private codec failure');
    });
    const fetcher = transport();
    await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toMatchObject({
      diagnostic: { stage: 'fees' },
    });
    expect(calls(fetcher).filter((call) => call.method === 'state_call')).toHaveLength(2);
  });

  it.each(['status', 'id', 'jsonrpc', 'error', 'invalid-json', 'redirect'])(
    'rejects bad HTTP/RPC %s without retries',
    async (kind) => {
      const fetcher = vi.fn(async () => {
        const body: Record<string, unknown> = { jsonrpc: '2.0', id: 1, result: GENESIS };
        if (kind === 'id') body.id = 2;
        if (kind === 'jsonrpc') body.jsonrpc = '1.0';
        if (kind === 'error') body.error = { code: -32000, message: 'No archive state' };
        const response = new Response(kind === 'invalid-json' ? '{' : JSON.stringify(body), {
          status: kind === 'status' ? 502 : 200,
        });
        if (kind === 'redirect') Object.defineProperty(response, 'redirected', { value: true });
        return response;
      });
      await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toBeInstanceOf(
        HistoricalExecutionReadError
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  );

  it('enforces body and declared-length limits', async () => {
    for (const response of [
      new Response('x'.repeat(2 * 1024 * 1024 + 1)),
      new Response('{}', { headers: { 'content-length': String(2 * 1024 * 1024 + 1) } }),
    ]) {
      const fetcher = vi.fn(async () => response);
      await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toBeInstanceOf(
        HistoricalExecutionReadError
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });

  it('honors pre-abort and timeout even when injected transport never settles', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn(
      (_url: string | URL | Request, _options?: RequestInit) => new Promise<Response>(() => undefined)
    );
    await expect(
      readHistoricalExecutionQuote(request(), { fetch: fetcher, signal: controller.signal })
    ).rejects.toMatchObject({ diagnostic: { reason: 'aborted' } });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher, timeoutMs: 2 })).rejects.toMatchObject({
      diagnostic: { reason: 'timeout' },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('bounds cumulative evidence even when individual responses fit the per-response limit', async () => {
    const archive = transport();
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const response = await archive(url, init);
      return new Response(`${await response.text()}${' '.repeat(750_000)}`);
    });
    await expect(readHistoricalExecutionQuote(request(), { fetch: fetcher })).rejects.toMatchObject({
      diagnostic: { reason: 'response-limit' },
    });
    expect(fetcher.mock.calls.length).toBeLessThan(19);
    expect(codec.build).not.toHaveBeenCalled();
  });

  it.each(['timeout', 'abort'])('cancels a stalled response body on %s with no later RPC', async (kind) => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const fetcher = vi.fn(async () => new Response(new ReadableStream<Uint8Array>({ cancel })));
    const pending = readHistoricalExecutionQuote(request(), {
      fetch: fetcher,
      signal: controller.signal,
      timeoutMs: kind === 'timeout' ? 2 : 1000,
    });
    if (kind === 'abort') setTimeout(() => controller.abort(), 2);
    await expect(pending).rejects.toMatchObject({ diagnostic: { reason: kind === 'abort' ? 'aborted' : 'timeout' } });
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('cancels transport resolving after timeout and never changes the returned diagnostic', async () => {
    let resolveResponse!: (value: Response) => void;
    const fetcher = vi.fn(
      (_url: string | URL | Request, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        })
    );
    const failure = await readFailure(readHistoricalExecutionQuote(request(), { fetch: fetcher, timeoutMs: 2 }));
    expect(failure).toBeInstanceOf(HistoricalExecutionReadError);
    expect(failure.diagnostic.reason).toBe('timeout');
    const before = JSON.stringify(failure.diagnostic);
    const cancel = vi.fn();
    resolveResponse(new Response(new ReadableStream<Uint8Array>({ cancel })));
    await new Promise((resolve) => setImmediate(resolve));
    expect(cancel).toHaveBeenCalledOnce();
    expect(JSON.stringify(failure.diagnostic)).toBe(before);
    expect(failure.diagnostic.rpcEvidence[0]).not.toHaveProperty('httpStatus');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('handles abort between transport resolution and response processing without reading its body', async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const fetcher = vi.fn(async () => {
      controller.abort();
      return new Response(new ReadableStream<Uint8Array>({ cancel }));
    });
    const failure = await readFailure(
      readHistoricalExecutionQuote(request(), { fetch: fetcher, signal: controller.signal })
    );
    expect(failure).toBeInstanceOf(HistoricalExecutionReadError);
    expect(failure.diagnostic.reason).toBe('aborted');
    expect(failure.diagnostic.rpcEvidence[0]).not.toHaveProperty('httpStatus');
    expect(cancel).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
