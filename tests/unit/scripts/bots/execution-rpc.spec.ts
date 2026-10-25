import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TypeRegistry } from '@polkadot/types';
import {
  EXECUTION_EVIDENCE_ENDPOINT,
  EXECUTION_EVIDENCE_GENESIS,
  EXECUTION_EVIDENCE_INPUT_CODEC,
  EXECUTION_EVIDENCE_KUSD,
  EXECUTION_EVIDENCE_XOR,
  normalizeExecutionQuote,
} from '../../../../scripts/bots/execution-evidence';
import {
  assertExecutionCall,
  assertExecutionRuntime,
  EXECUTION_ESTIMATION_ASSUMPTIONS,
  openExecutionReader,
} from '../../../../scripts/bots/execution-rpc';

const transport = vi.hoisted(() => ({
  construct: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@polkadot/api', () => ({
  WsProvider: class {
    constructor(...args: unknown[]) {
      transport.construct(...args);
    }
    connect = transport.connect;
    disconnect = transport.disconnect;
  },
  ApiPromise: { create: transport.create },
}));
vi.mock('@polkadot/types', async (importOriginal) => {
  const original = await importOriginal<typeof import('@polkadot/types')>();
  return {
    ...original,
    Metadata: class {
      version: number;
      private readonly bytes: Uint8Array;
      constructor(_registry: unknown, value: string) {
        this.bytes = Buffer.from(value.slice(2), 'hex');
        this.version = this.bytes[0];
      }
      toU8a() {
        return this.bytes;
      }
    },
  };
});
vi.mock('../../../../src/lib/substrate/type-definitions', () => ({ types: {}, rpc: {}, typesBundle: {} }));

const blockHash = `0x${'ab'.repeat(32)}`;
const metadataBytes = new Uint8Array([16, 2, 3, 4]);
const headHash = `0x${'bc'.repeat(32)}`;
const envelopeBytes = new Uint8Array(208).fill(7);
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const hex = (value: string) => `0x${BigInt(value).toString(16)}`;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const codec = (value: string | number, json: unknown = value) => ({
  toString: () => String(value),
  toJSON: () => json,
  toNumber: () => Number(value),
  toU8a: () => new Uint8Array(),
});

function callArgs(): unknown[] {
  return [
    0,
    { code: EXECUTION_EVIDENCE_KUSD },
    { code: EXECUTION_EVIDENCE_XOR },
    {
      withDesiredInput: {
        desiredAmountIn: hex(EXECUTION_EVIDENCE_INPUT_CODEC),
        minAmountOut: hex('995000000000000000'),
      },
    },
    ['XYKPool'],
    'AllowSelected',
  ];
}

/** Synthetic codecs reproduce public SDK JSON shapes. There is no provider, account, or signature access. */
function fixture() {
  const metadata = { version: 16, toU8a: () => metadataBytes };
  const registry = new TypeRegistry();
  const metadataResponse = (bytes: Uint8Array) => ({
    toHex: () =>
      `0x${Buffer.from(
        registry
          .createType(
            'Option<OpaqueMetadata>',
            registry.createType('OpaqueMetadata', `0x${Buffer.from(bytes).toString('hex')}`)
          )
          .toU8a()
      ).toString('hex')}`,
  });
  const runtime = { specVersion: codec(131), transactionVersion: codec(3) };
  const rawQuote = {
    amount: hex('1000000000000000000'),
    amountWithoutImpact: hex('1020000000000000000'),
    route: [{ code: EXECUTION_EVIDENCE_KUSD }, { code: EXECUTION_EVIDENCE_XOR }],
    fee: { [EXECUTION_EVIDENCE_XOR]: hex('6000000000000000') },
    rewards: [],
  };
  const quoted = {
    ...codec('quote', rawQuote),
    amount: codec('1000000000000000000'),
    amountWithoutImpact: codec('1020000000000000000'),
    route: [EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR].map((address) => ({
      ...codec(address),
      code: codec(address),
    })),
    fee: new Map([
      [{ ...codec(EXECUTION_EVIDENCE_XOR), code: codec(EXECUTION_EVIDENCE_XOR) }, codec('6000000000000000')],
    ]),
  };
  const infoJson = { partialFee: hex('100020612589707326'), weight: { refTime: 100, proofSize: 1 }, class: 'Normal' };
  const feeJson = {
    inclusionFee: { baseFee: 0, lenFee: hex('20800000000000'), adjustedWeightFee: hex('99999812589707326') },
    tip: 0,
  };
  const details = {
    ...codec('details', feeJson),
    tip: codec('0'),
    inclusionFee: {
      isNone: false,
      unwrap: () => ({
        baseFee: codec('0'),
        lenFee: codec('20800000000000'),
        adjustedWeightFee: codec('99999812589707326'),
      }),
    },
  };
  const pinned = {
    query: {
      timestamp: { now: vi.fn().mockResolvedValue(codec(2000000)) },
      denomination: { denominator: vi.fn().mockResolvedValue(codec('100000000000000000000000000000000000000')) },
      poolXYK: { properties: vi.fn().mockResolvedValue(codec('pool', ['public-pool', 'public-fees'])) },
      assets: { assetInfosV2: vi.fn().mockResolvedValue(codec('asset', { precision: 18 })) },
      dexManager: {
        dexInfos: vi.fn().mockResolvedValue(codec('dex', { baseAssetId: { code: EXECUTION_EVIDENCE_XOR } })),
      },
    },
    call: {
      transactionPaymentApi: {
        queryInfo: vi.fn().mockResolvedValue({ ...codec('info', infoJson), partialFee: codec('100020612589707326') }),
        queryFeeDetails: vi.fn().mockResolvedValue(details),
      },
    },
  };
  const tx = { method: { toHex: () => '0x01020304' }, signFake: vi.fn(), toU8a: () => envelopeBytes };
  const chain = {
    isConnected: true,
    genesisHash: codec(EXECUTION_EVIDENCE_GENESIS),
    runtimeVersion: runtime,
    runtimeMetadata: metadata,
    registry,
    at: vi.fn().mockResolvedValue(pinned),
    disconnect: vi.fn().mockResolvedValue(undefined),
    rpc: {
      chain: {
        getFinalizedHead: vi.fn().mockResolvedValue(codec(blockHash)),
        getBlockHash: vi.fn().mockResolvedValue(codec(headHash)),
        getHeader: vi.fn().mockResolvedValue({ number: codec(27702199) }),
      },
      state: {
        getRuntimeVersion: vi.fn().mockResolvedValue(runtime),
        getMetadata: vi.fn().mockResolvedValue({ version: 14, toU8a: () => new Uint8Array([14, 9, 9, 9]) }),
        call: vi.fn().mockResolvedValue(metadataResponse(metadataBytes)),
      },
      dexApi: { canExchange: vi.fn().mockResolvedValue(codec('true')) },
      liquidityProxy: { quote: vi.fn().mockResolvedValue({ isNone: false, unwrap: () => quoted }) },
    },
    tx: { liquidityProxy: { swap: vi.fn().mockReturnValue(tx) } },
    createType: vi.fn().mockImplementation((type: string, value: unknown) => {
      if (type === 'Call') return { args: callArgs().map((arg) => ({ toJSON: () => arg })) };
      if (type === 'Option<OpaqueMetadata>' && !(value instanceof Uint8Array))
        throw new Error('Option requires encoded bytes');
      if (type !== 'Option<OpaqueMetadata>' && type !== 'u32') throw new Error(`Unexpected mock type ${type}`);
      return registry.createType(type, value);
    }),
  };
  transport.create.mockResolvedValue(chain);
  return { chain, pinned, tx, rawQuote, infoJson, feeJson, details, quoted, metadataResponse };
}

beforeEach(() => {
  vi.resetAllMocks();
  transport.connect.mockResolvedValue(undefined);
  transport.disconnect.mockResolvedValue(undefined);
});

describe('execution envelope binding', () => {
  it('accepts exact decoded amounts in hexadecimal and both asset codec JSON forms', () => {
    expect(() =>
      assertExecutionCall(
        callArgs(),
        EXECUTION_EVIDENCE_KUSD,
        EXECUTION_EVIDENCE_XOR,
        EXECUTION_EVIDENCE_INPUT_CODEC,
        '995000000000000000'
      )
    ).not.toThrow();
    const args = callArgs();
    args[1] = EXECUTION_EVIDENCE_KUSD;
    args[2] = EXECUTION_EVIDENCE_XOR;
    args[3] = {
      withDesiredInput: { desiredAmountIn: EXECUTION_EVIDENCE_INPUT_CODEC, minAmountOut: '995000000000000000' },
    };
    expect(() =>
      assertExecutionCall(
        args,
        EXECUTION_EVIDENCE_KUSD,
        EXECUTION_EVIDENCE_XOR,
        EXECUTION_EVIDENCE_INPUT_CODEC,
        '995000000000000000'
      )
    ).not.toThrow();
  });
  it.each([
    ['dex', 0, 1],
    ['input', 1, EXECUTION_EVIDENCE_XOR],
    ['output', 2, EXECUTION_EVIDENCE_KUSD],
    ['amount', 3, { withDesiredInput: { desiredAmountIn: '5000000000000000001', minAmountOut: '995000000000000000' } }],
    [
      'minimum',
      3,
      { withDesiredInput: { desiredAmountIn: EXECUTION_EVIDENCE_INPUT_CODEC, minAmountOut: '994999999999999999' } },
    ],
    [
      'variant',
      3,
      { withDesiredOutput: { desiredAmountOut: '995000000000000000', maxAmountIn: EXECUTION_EVIDENCE_INPUT_CODEC } },
    ],
    ['sources', 4, ['XYKPool', 'XSTPool']],
    ['filter', 5, 'Disabled'],
  ])('rejects changed %s before a fake envelope can be priced', (_label, index, value) => {
    const args = callArgs();
    args[index as number] = value;
    expect(() =>
      assertExecutionCall(
        args,
        EXECUTION_EVIDENCE_KUSD,
        EXECUTION_EVIDENCE_XOR,
        EXECUTION_EVIDENCE_INPUT_CODEC,
        '995000000000000000'
      )
    ).toThrow();
  });
  it.each(['-1', '1e18', '1.5', '0x', 5000000000000000000, null])('rejects malformed decoded balance %s', (value) => {
    const args = callArgs();
    args[3] = { withDesiredInput: { desiredAmountIn: value, minAmountOut: '995000000000000000' } };
    expect(() =>
      assertExecutionCall(
        args,
        EXECUTION_EVIDENCE_KUSD,
        EXECUTION_EVIDENCE_XOR,
        EXECUTION_EVIDENCE_INPUT_CODEC,
        '995000000000000000'
      )
    ).toThrow();
  });
  it('rejects unexpected argument count', () => {
    expect(() =>
      assertExecutionCall(
        [...callArgs(), null],
        EXECUTION_EVIDENCE_KUSD,
        EXECUTION_EVIDENCE_XOR,
        EXECUTION_EVIDENCE_INPUT_CODEC,
        '995000000000000000'
      )
    ).toThrow();
  });
});

describe('pinned runtime identity', () => {
  const context = { specVersion: 131, transactionVersion: 3, metadataHash: sha(metadataBytes) };
  it('accepts matching versions and metadata', () => {
    expect(() =>
      assertExecutionRuntime(context, { specVersion: 131, transactionVersion: 3 }, context.metadataHash)
    ).not.toThrow();
  });
  it.each([
    [132, 3, context.metadataHash],
    [131, 4, context.metadataHash],
    [131, 3, '0'.repeat(64)],
  ])('rejects an identity change', (specVersion, transactionVersion, metadataHash) => {
    expect(() =>
      assertExecutionRuntime(
        context,
        { specVersion: specVersion as number, transactionVersion: transactionVersion as number },
        metadataHash as string
      )
    ).toThrow('Runtime or metadata changed');
  });
});

describe('public execution RPC adapter', () => {
  it('matches pinned V16 encoding despite a different legacy V14 metadata response', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const legacy = await f.chain.rpc.state.getMetadata();
    expect(legacy.version).toBe(14);
    expect(sha(legacy.toU8a())).not.toBe(sha(metadataBytes));
    f.chain.rpc.state.getMetadata.mockClear();
    const context = await reader.context();
    expect(context).toMatchObject({
      metadataFormatVersion: 16,
      metadataReadMethod: 'Metadata_metadata_at_version',
      metadataHash: sha(metadataBytes),
    });
    expect(f.chain.rpc.state.getMetadata).not.toHaveBeenCalled();
    expect(f.chain.rpc.state.call.mock.calls).toEqual([
      ['Metadata_metadata_at_version', '0x10000000', blockHash],
      ['Metadata_metadata_at_version', '0x10000000', headHash],
    ]);
    const decodedOptions = f.chain.createType.mock.calls.filter(([type]) => type === 'Option<OpaqueMetadata>');
    expect(decodedOptions).toHaveLength(2);
    for (const [, value] of decodedOptions) expect(value).toBeInstanceOf(Uint8Array);
    const versionHashes = f.chain.rpc.state.getRuntimeVersion.mock.calls.map(([hash]) => String(hash));
    expect(versionHashes).toEqual([blockHash, headHash]);
    await reader.close();
  });

  it('rejects unavailable requested metadata without falling back to a different format', async () => {
    const f = fixture();
    f.chain.rpc.state.call.mockResolvedValue({ toHex: () => '0x00' });
    const reader = await openExecutionReader(new AbortController().signal);
    await expect(reader.context()).rejects.toThrow('Pinned encoding metadata format unavailable');
    expect(f.chain.rpc.state.getMetadata).not.toHaveBeenCalled();
    expect(f.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    await reader.close();
  });

  it('rejects a metadata response encoded in a different version than requested', async () => {
    const f = fixture();
    f.chain.rpc.state.call.mockResolvedValue(f.metadataResponse(new Uint8Array([15, 2, 3, 4])));
    const reader = await openExecutionReader(new AbortController().signal);
    await expect(reader.context()).rejects.toThrow('Unexpected encoding metadata format');
    expect(f.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    await reader.close();
  });

  it('rejects a loaded encoding format change even if its metadata bytes do not change', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    f.chain.runtimeMetadata.version = 15;
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Encoding metadata format changed');
    expect(f.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    await reader.close();
  });

  it('normalizes direct asset codecs as well as wrapped AssetId codecs', async () => {
    const f = fixture();
    for (const address of [...f.quoted.route, ...f.quoted.fee.keys()]) Reflect.deleteProperty(address, 'code');
    f.quoted.toJSON = () => ({ ...f.rawQuote, route: [EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR] });
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    const quote = await reader.quote(
      context,
      EXECUTION_EVIDENCE_KUSD,
      EXECUTION_EVIDENCE_XOR,
      EXECUTION_EVIDENCE_INPUT_CODEC
    );
    expect(normalizeExecutionQuote(quote).routeFees).toEqual([
      { assetAddress: EXECUTION_EVIDENCE_XOR, amountCodec: '6000000000000000' },
    ]);
    expect(quote.route).toEqual([EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR]);
    await reader.close();
  });

  it('emits detached quote and envelope evidence before awaiting either fee RPC', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    const partials: Record<string, unknown>[] = [];
    f.pinned.call.transactionPaymentApi.queryFeeDetails.mockImplementation(async () => {
      expect(partials[0]).toEqual({
        blockHash,
        assetIn: EXECUTION_EVIDENCE_KUSD,
        assetOut: EXECUTION_EVIDENCE_XOR,
        amountInCodec: EXECUTION_EVIDENCE_INPUT_CODEC,
        rawQuoteJson: f.rawQuote,
      });
      expect(partials[1]).toMatchObject({
        minimumCodec: '995000000000000000',
        callHex: '0x01020304',
        envelopeHash: sha(envelopeBytes),
      });
      return f.details;
    });
    await reader.quote(
      context,
      EXECUTION_EVIDENCE_KUSD,
      EXECUTION_EVIDENCE_XOR,
      EXECUTION_EVIDENCE_INPUT_CODEC,
      (partial) => partials.push(partial)
    );
    expect(partials[0]).not.toHaveProperty('rawQueryInfo');
    expect(partials[0]).not.toHaveProperty('rawFeeDetails');
    expect(partials.at(-1)).toMatchObject({ rawQueryInfo: f.infoJson, rawFeeDetails: f.feeJson });
    (partials[0].rawQuoteJson as Record<string, unknown>).amount = 'tampered-copy';
    expect(f.rawQuote.amount).toBe(hex('1000000000000000000'));
    expect((partials[1].rawQuoteJson as Record<string, unknown>).amount).toBe(f.rawQuote.amount);
    await reader.close();
  });

  it('retains the quote and successful fee response when the other fee RPC fails', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    const partials: Record<string, unknown>[] = [];
    f.pinned.call.transactionPaymentApi.queryFeeDetails.mockRejectedValue(new Error('fee detail unavailable'));
    await expect(
      reader.quote(
        context,
        EXECUTION_EVIDENCE_KUSD,
        EXECUTION_EVIDENCE_XOR,
        EXECUTION_EVIDENCE_INPUT_CODEC,
        (partial) => partials.push(partial)
      )
    ).rejects.toThrow('fee detail unavailable');
    expect(partials.at(-1)).toMatchObject({
      rawQuoteJson: f.rawQuote,
      rawQueryInfo: f.infoJson,
      envelopeHash: sha(envelopeBytes),
    });
    expect(partials.at(-1)).not.toHaveProperty('rawFeeDetails');
    await reader.close();
  });

  it('uses one finalized hash for pool checks, quotes and both fee RPCs and retains their raw JSON', async () => {
    const f = fixture();
    const controller = new AbortController();
    const reader = await openExecutionReader(controller.signal);
    const context = await reader.context();
    const quote = await reader.quote(
      context,
      EXECUTION_EVIDENCE_KUSD,
      EXECUTION_EVIDENCE_XOR,
      EXECUTION_EVIDENCE_INPUT_CODEC
    );
    expect(transport.construct).toHaveBeenCalledWith(EXECUTION_EVIDENCE_ENDPOINT, false);
    expect(context).toMatchObject({
      blockHash,
      blockNumber: 27702199,
      metadataHash: sha(metadataBytes),
      finalizedAt: 2000000,
    });
    expect(f.chain.rpc.chain.getHeader).toHaveBeenCalledWith(
      expect.objectContaining({ toString: expect.any(Function) })
    );
    for (const [hash] of f.chain.at.mock.calls) expect(String(hash)).toBe(blockHash);
    expect(f.pinned.query.assets.assetInfosV2.mock.calls).toEqual([
      [{ code: EXECUTION_EVIDENCE_KUSD }],
      [{ code: EXECUTION_EVIDENCE_XOR }],
    ]);
    expect(f.pinned.query.poolXYK.properties).toHaveBeenCalledWith(EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_KUSD);
    for (const args of f.chain.rpc.dexApi.canExchange.mock.calls) expect(String(args[4])).toBe(blockHash);
    expect(f.chain.rpc.liquidityProxy.quote).toHaveBeenCalledWith(
      0,
      EXECUTION_EVIDENCE_KUSD,
      EXECUTION_EVIDENCE_XOR,
      EXECUTION_EVIDENCE_INPUT_CODEC,
      'WithDesiredInput',
      ['XYKPool'],
      'AllowSelected',
      blockHash
    );
    expect(f.chain.tx.liquidityProxy.swap).toHaveBeenCalledWith(
      0,
      EXECUTION_EVIDENCE_KUSD,
      EXECUTION_EVIDENCE_XOR,
      { WithDesiredInput: { desiredAmountIn: EXECUTION_EVIDENCE_INPUT_CODEC, minAmountOut: '995000000000000000' } },
      ['XYKPool'],
      'AllowSelected'
    );
    expect(f.pinned.call.transactionPaymentApi.queryInfo).toHaveBeenCalledWith(envelopeBytes, 208);
    expect(f.pinned.call.transactionPaymentApi.queryFeeDetails).toHaveBeenCalledWith(envelopeBytes, 208);
    expect(f.tx.signFake).toHaveBeenCalledWith(
      EXECUTION_ESTIMATION_ASSUMPTIONS.address,
      expect.objectContaining({ nonce: 0, tip: 0 })
    );
    expect(quote.rawQuoteJson).toEqual(f.rawQuote);
    expect(quote.fee).toMatchObject({
      envelopeHash: sha(envelopeBytes),
      rawQueryInfo: f.infoJson,
      rawFeeDetails: f.feeJson,
    });
    expect(normalizeExecutionQuote(quote).minimumCodec).toBe('995000000000000000');
    await reader.close();
    controller.abort();
    expect(f.chain.disconnect).toHaveBeenCalledOnce();
    expect(transport.disconnect).not.toHaveBeenCalled();
  });

  it.each(['precision', 'dex', 'pool', 'forward', 'reverse'])(
    'fails closed when the exact pool %s check fails',
    async (failure) => {
      const f = fixture();
      if (failure === 'precision')
        f.pinned.query.assets.assetInfosV2.mockResolvedValueOnce(codec('asset', { precision: 6 }));
      if (failure === 'dex')
        f.pinned.query.dexManager.dexInfos.mockResolvedValue(
          codec('dex', { baseAssetId: { code: EXECUTION_EVIDENCE_KUSD } })
        );
      if (failure === 'pool') f.pinned.query.poolXYK.properties.mockResolvedValue(codec('pool', null));
      if (failure === 'forward') f.chain.rpc.dexApi.canExchange.mockResolvedValueOnce(codec('false'));
      if (failure === 'reverse')
        f.chain.rpc.dexApi.canExchange.mockResolvedValueOnce(codec('true')).mockResolvedValueOnce(codec('false'));
      const reader = await openExecutionReader(new AbortController().signal);
      await expect(reader.context()).rejects.toThrow('Exact 18-decimal');
      expect(f.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
      await reader.close();
    }
  );

  it('rejects a head metadata change even when runtime numbers remain unchanged', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    f.chain.rpc.state.call.mockResolvedValue(f.metadataResponse(new Uint8Array([16, 9, 9, 9])));
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Runtime or metadata changed');
    expect(f.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    await reader.close();
  });

  it('rejects a loaded encoder runtime change without using its new call format', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    f.chain.runtimeVersion.specVersion = codec(132);
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Runtime or metadata changed');
    expect(f.chain.tx.liquidityProxy.swap).not.toHaveBeenCalled();
    await reader.close();
  });

  it('rejects continuity loss after fee lookup so mixed observations cannot be accepted', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    f.pinned.call.transactionPaymentApi.queryFeeDetails.mockImplementation(async () => {
      f.chain.runtimeVersion.transactionVersion = codec(4);
      return f.details;
    });
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Runtime or metadata changed');
    await reader.close();
  });

  it('rejects a decoded minimum mismatch before signFake or fee estimation', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    const args = clone(callArgs());
    args[3] = { withDesiredInput: { desiredAmountIn: EXECUTION_EVIDENCE_INPUT_CODEC, minAmountOut: '1' } };
    const createOriginal = f.chain.createType.getMockImplementation()!;
    f.chain.createType.mockImplementation((type: string, value: unknown) =>
      type === 'Call' ? { args: args.map((arg) => ({ toJSON: () => arg })) } : createOriginal(type, value)
    );
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Swap encoding mismatch');
    expect(f.tx.signFake).not.toHaveBeenCalled();
    expect(f.pinned.call.transactionPaymentApi.queryInfo).not.toHaveBeenCalled();
    await reader.close();
  });

  it('rejects a missing quote without creating an envelope', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    f.chain.rpc.liquidityProxy.quote.mockResolvedValue({ isNone: true, unwrap: () => f.quoted });
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('No exact-input XYK quote');
    expect(f.tx.signFake).not.toHaveBeenCalled();
    await reader.close();
  });

  it('rejects missing inclusion fee evidence', async () => {
    const f = fixture();
    const reader = await openExecutionReader(new AbortController().signal);
    const context = await reader.context();
    f.details.inclusionFee.isNone = true;
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Missing inclusion fee');
    await reader.close();
  });

  it.each(['genesis', 'connection'])('closes the provider when initialization has wrong %s', async (failure) => {
    const f = fixture();
    if (failure === 'genesis') f.chain.genesisHash = codec(`0x${'cd'.repeat(32)}`);
    else f.chain.isConnected = false;
    await expect(openExecutionReader(new AbortController().signal)).rejects.toThrow(
      failure === 'genesis' ? 'Unexpected genesis' : 'RPC disconnected'
    );
    expect(transport.disconnect).toHaveBeenCalledOnce();
    expect(f.chain.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
  });

  it('does not start a connection for a previously aborted request', async () => {
    fixture();
    const controller = new AbortController();
    controller.abort();
    await expect(openExecutionReader(controller.signal)).rejects.toThrow('Execution observation aborted');
    expect(transport.connect).not.toHaveBeenCalled();
    expect(transport.create).not.toHaveBeenCalled();
    expect(transport.disconnect).toHaveBeenCalledOnce();
  });

  it('disconnects immediately while API initialization is pending and rejects late readiness', async () => {
    const f = fixture();
    let ready!: (chain: typeof f.chain) => void;
    transport.create.mockImplementation(
      () =>
        new Promise((resolve) => {
          ready = resolve;
        })
    );
    const controller = new AbortController();
    const opening = openExecutionReader(controller.signal);
    const rejected = expect(opening).rejects.toThrow('Execution observation aborted');
    await Promise.resolve();
    expect(transport.create).toHaveBeenCalledOnce();
    controller.abort();
    expect(transport.disconnect).toHaveBeenCalledOnce();
    ready(f.chain);
    await rejected;
    expect(f.chain.rpc.chain.getFinalizedHead).not.toHaveBeenCalled();
  });

  it('disconnects on abort and prevents further market calls on an existing reader', async () => {
    const f = fixture();
    const controller = new AbortController();
    const reader = await openExecutionReader(controller.signal);
    const context = await reader.context();
    controller.abort();
    expect(transport.disconnect).toHaveBeenCalledOnce();
    await expect(
      reader.quote(context, EXECUTION_EVIDENCE_KUSD, EXECUTION_EVIDENCE_XOR, EXECUTION_EVIDENCE_INPUT_CODEC)
    ).rejects.toThrow('Execution observation aborted');
    expect(f.chain.rpc.liquidityProxy.quote).not.toHaveBeenCalled();
    await reader.close();
  });
});
