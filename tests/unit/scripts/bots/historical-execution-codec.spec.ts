import { describe, expect, it, vi } from 'vitest';
import { Metadata, TypeRegistry } from '@polkadot/types';
import {
  createHistoricalExecutionCodec,
  historicalMinimumCodec,
  decodeHistoricalFeeDetailsScale,
  assertHistoricalFeeDetailsMatchesQueryInfo,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../scripts/bots/historical-execution-codec';

const BLOCK = `0x${'22'.repeat(32)}`;
const MAX = (1n << 128n) - 1n;
const standard = [
  'CheckSpecVersion',
  'CheckTxVersion',
  'CheckGenesis',
  'CheckMortality',
  'CheckNonce',
  'CheckWeight',
  'ChargeTransactionPayment',
];
const field = (name: string | null, type: number) => ({ name, type, typeName: null, docs: [] });
const variant = (name: string, index: number, fields: ReturnType<typeof field>[] = []) => ({
  name,
  index,
  fields,
  docs: [],
});
const hex = (bytes: Uint8Array) => `0x${Buffer.from(bytes).toString('hex')}`;
const le = (n: bigint | number, size = 16) =>
  Buffer.from(
    BigInt(n)
      .toString(16)
      .padStart(size * 2, '0')
      .match(/../g)!
      .reverse()
      .map((b) => Number.parseInt(b, 16))
  );
const fees = (a: bigint | number, b: bigint | number, c: bigint | number, tip: bigint | number) =>
  hex(Buffer.concat([Buffer.from([1]), ...[a, b, c, tip].map((n) => le(n))]));

/** Invented metadata exercises real SDK codecs; fixtures contain no market observations. */
function fixture(
  palletIndex = 42,
  methodIndex = 3,
  custom = false,
  extraExtension?: string,
  extensionOverrides: Record<number, { identifier?: string; type?: number; additionalSigned?: number }> = {}
) {
  const registry = new TypeRegistry(BLOCK);
  const definitions: Array<Record<string, unknown>> = [
    { def: { primitive: 'U8' } },
    { def: { primitive: 'U32' } },
    { def: { primitive: 'U128' } },
    { def: { array: { len: 32, type: 0 } } },
    { path: ['fixture', 'AssetId'], def: { composite: { fields: [field('code', 3)] } } },
    {
      path: ['fixture', 'SwapAmount'],
      def: {
        variant: {
          variants: [variant('WithDesiredInput', 0, [field('desired_amount_in', 2), field('min_amount_out', 2)])],
        },
      },
    },
    { path: ['fixture', 'LiquiditySourceType'], def: { variant: { variants: [variant('XYKPool', 1)] } } },
    { def: { sequence: { type: 6 } } },
    {
      path: ['fixture', 'FilterMode'],
      def: { variant: { variants: [variant('Disabled', 0), variant('AllowSelected', 1)] } },
    },
    {
      path: ['fixture', 'Call'],
      def: {
        variant: {
          variants: [
            variant('swap', methodIndex, [
              field('dex_id', 1),
              field('input_asset_id', 4),
              field('output_asset_id', 4),
              field('swap_amount', 5),
              field('selected_source_types', 7),
              field('filter_mode', 8),
            ]),
          ],
        },
      },
    },
    {
      path: ['fixture', 'RuntimeCall'],
      def: { variant: { variants: [variant('LiquidityProxy', palletIndex, [field(null, 9)])] } },
    },
    { path: ['sp_core', 'crypto', 'AccountId32'], def: { array: { len: 32, type: 0 } } },
    { path: ['sp_core', 'ed25519', 'Signature'], def: { array: { len: 64, type: 0 } } },
    { def: { tuple: [] } },
    {
      path: ['sp_runtime', 'generic', 'unchecked_extrinsic', 'UncheckedExtrinsic'],
      params: [
        { name: 'Address', type: 11 },
        { name: 'Call', type: 10 },
        { name: 'Signature', type: 12 },
        { name: 'Extra', type: 13 },
      ],
      def: { composite: { fields: [] } },
    },
    { path: ['fixture', 'Runtime'], def: { composite: { fields: [] } } },
    { def: { primitive: 'U64' } },
    { def: { sequence: { type: 0 } } },
    { path: ['fixture', 'AssetInfo'], def: { composite: { fields: [field('symbol', 17), field('precision', 0)] } } },
    { path: ['fixture', 'DEXInfo'], def: { composite: { fields: [field('base_asset_id', 4)] } } },
  ];
  const storagePallet = (name: string, item: string, type: unknown, index: number) => ({
    name,
    calls: null,
    events: null,
    errors: null,
    constants: [],
    index,
    storage: { prefix: name, items: [{ name: item, modifier: 'Optional', type, fallback: '0x00', docs: [] }] },
  });
  definitions.push(
    { path: ['primitive_types', 'H256'], def: { composite: { fields: [field(null, 3)] } } },
    {
      path: ['sp_runtime', 'generic', 'era', 'Era'],
      def: { variant: { variants: [variant('Immortal', 0), variant('Mortal', 1, [field(null, 0), field(null, 0)])] } },
    },
    { def: { compact: { type: 1 } } },
    { def: { compact: { type: 2 } } },
    { path: ['xor_fee', 'extension', 'ChargeTransactionPayment'], def: { composite: { fields: [field('tip', 23)] } } }
  );
  const extensionTypes = [13, 13, 13, 21, 22, 13, 24];
  const extensionPayloadTypes = [1, 1, 20, 20, 13, 13, 13];
  const signedExtensions = custom ? [...standard.slice(0, -1), 'ChargeTransactionPayment2'] : standard;
  const declaredExtensions = extraExtension ? [...signedExtensions, extraExtension] : signedExtensions;
  const metadata = new Metadata(registry, {
    magicNumber: 0x6174656d,
    metadata: {
      V14: {
        lookup: { types: definitions.map((type, id) => ({ id, type: { path: [], params: [], docs: [], ...type } })) },
        pallets: [
          {
            name: 'LiquidityProxy',
            storage: null,
            calls: { type: 9 },
            events: null,
            constants: [],
            errors: null,
            index: palletIndex,
          },
          storagePallet('Timestamp', 'Now', { plain: 16 }, 2),
          storagePallet('Denomination', 'Denominator', { plain: 2 }, 3),
          storagePallet('Assets', 'AssetInfosV2', { map: { hashers: ['Blake2_128Concat'], key: 4, value: 18 } }, 4),
          storagePallet('DexManager', 'DexInfos', { map: { hashers: ['Twox64Concat'], key: 1, value: 19 } }, 5),
        ],
        extrinsic: {
          type: 14,
          version: 4,
          signedExtensions: declaredExtensions.map((identifier, index) => ({
            identifier,
            type: extensionTypes[index] ?? 13,
            additionalSigned: extensionPayloadTypes[index] ?? 13,
            ...extensionOverrides[index],
          })),
        },
        type: 15,
      },
    },
  });
  registry.register({
    Address: 'AccountId',
    ExtrinsicSignature: 'MultiSignature',
    AssetId: { code: 'H256' },
    Balance: 'u128',
    ChargeFeeInfo: { tip: 'Compact<Balance>', target_asset_id: 'AssetId' },
  });
  registry.setMetadata(
    metadata,
    undefined,
    { ChargeTransactionPayment2: { extrinsic: { charge_fee_info: 'ChargeFeeInfo' }, payload: {} } },
    true
  );
  const identity = {
    genesisHash: GENESIS,
    blockHash: BLOCK,
    metadataHex: metadata.toHex(),
    runtimeVersion: { specVersion: 130, transactionVersion: 130 },
  };
  const proof = {
    timestamp: hex(le(1000000, 8)),
    denominator: hex(le(1)),
    kusd: hex(registry.createType('Lookup18', { symbol: 'KUSD', precision: 18 }).toU8a()),
    xor: hex(registry.createType('Lookup18', { symbol: 'XOR', precision: 18 }).toU8a()),
    dex0: hex(registry.createType('Lookup19', { baseAssetId: { code: XOR } }).toU8a()),
  };
  return { identity, registry, proof };
}
const request = {
  assetIn: KUSD,
  assetOut: XOR,
  amountInCodec: '2500000000000000000',
  quotedAmountOutCodec: '1000000000000000001',
};

describe('historical execution codecs', () => {
  it.each([130, 131])(
    'uses observed historical call and fee extension, native XOR, exact min and SCALE u32 (%s)',
    (version) => {
      const { identity, registry } = fixture(42, 3);
      identity.runtimeVersion = { specVersion: version, transactionVersion: version };
      const codec = createHistoricalExecutionCodec(identity);
      const result = codec.buildSwapEnvelope(request);
      expect(result.callHex.slice(0, 6)).toBe('0x2a03');
      expect(result.minimumCodec).toBe('995000000000000000');
      expect(result.feeAssetAddress).toBe(XOR);
      expect(result.estimation.feeExtension).toBe('ChargeTransactionPayment');
      const envelope = registry.createType('Extrinsic', result.envelopeHex);
      expect(envelope.method.toHex()).toBe(result.callHex);
      expect(envelope.isSigned).toBe(true); // Dummy placeholder only; no signing key was supplied.
      expect(envelope.era.isImmortalEra).toBe(true);
      expect(envelope.nonce.toString()).toBe('0');
      expect(result.feeQueryDataHex.slice(0, -8)).toBe(result.envelopeHex);
      expect(Buffer.from(result.feeQueryDataHex.slice(-8), 'hex').readUInt32LE()).toBe(result.encodedLength);
      expect(Object.isFrozen(codec.binding.runtimeVersion)).toBe(true);
      expect(codec).not.toHaveProperty('registry');
    }
  );
  it('supports reverse exact quantities and independent metadata call indexes', () => {
    const { identity, registry } = fixture(51, 7);
    const result = createHistoricalExecutionCodec(identity).buildSwapEnvelope({
      ...request,
      assetIn: XOR,
      assetOut: KUSD,
      amountInCodec: '199',
    });
    expect(result.callHex.slice(0, 6)).toBe('0x3307');
    expect(registry.createType('Call', result.callHex).args[1].toJSON()).toEqual({ code: XOR });
    expect(result.amountInCodec).toBe('199');
  });
  it('refuses unknown, duplicate or ambiguous historical fee extension declarations', () => {
    for (const name of [
      'UnsupportedFutureExtension',
      'CheckNonce',
      'ChargeTransactionPayment2',
      'CheckEra',
      'CheckVersion',
      'SkipCheckIfFeeless',
      'ChargeAssetTxPayment',
    ])
      expect(() => createHistoricalExecutionCodec(fixture(42, 3, false, name).identity)).toThrow();
    expect(() => createHistoricalExecutionCodec(fixture(42, 3, true).identity)).toThrow();
  });
  it('rejects recognized aliases, changed metadata layouts and unobserved runtime profiles', () => {
    for (const extensionOverrides of [
      { 0: { type: 1 } },
      { 0: { additionalSigned: 13 } },
      { 3: { identifier: 'CheckEra' } },
      { 6: { type: 2 } },
      { 0: { identifier: 'CheckTxVersion' }, 1: { identifier: 'CheckSpecVersion' } },
    ])
      expect(() =>
        createHistoricalExecutionCodec(fixture(42, 3, false, undefined, extensionOverrides).identity)
      ).toThrow();
    const { identity } = fixture();
    for (const runtimeVersion of [
      { specVersion: 132, transactionVersion: 132 },
      { specVersion: 130, transactionVersion: 131 },
    ])
      expect(() => createHistoricalExecutionCodec({ ...identity, runtimeVersion })).toThrow();
  });
  it('rejects accessors, inherited fields and extensions without running them', () => {
    const { identity } = fixture();
    const getter = vi.fn();
    const poisoned = { ...identity };
    Object.defineProperty(poisoned, 'metadataHex', { get: getter, enumerable: true });
    expect(() => createHistoricalExecutionCodec(poisoned)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    for (const value of [
      { ...identity, extra: 1 },
      Object.create(identity),
      [],
      { ...identity, genesisHash: BLOCK },
      { ...identity, runtimeVersion: { ...identity.runtimeVersion, extra: 1 } },
    ])
      expect(() => createHistoricalExecutionCodec(value)).toThrow();
    const codec = createHistoricalExecutionCodec(identity);
    for (const value of [
      { ...request, amountInCodec: '01' },
      { ...request, amountInCodec: (MAX + 1n).toString() },
      { ...request, assetOut: KUSD },
      { ...request, extra: 1 },
    ])
      expect(() => codec.buildSwapEnvelope(value)).toThrow();
    const badRequest = { ...request };
    Object.defineProperty(badRequest, 'amountInCodec', { get: getter, enumerable: true });
    expect(() => codec.buildSwapEnvelope(badRequest)).toThrow();
    expect(getter).not.toHaveBeenCalled();
  });
  it('bounds raw metadata and integer minima before SDK parsing', () => {
    const { identity } = fixture();
    expect(() =>
      createHistoricalExecutionCodec({ ...identity, metadataHex: `0x${'00'.repeat(2 * 1024 * 1024 + 1)}` })
    ).toThrow();
    expect(historicalMinimumCodec('201')).toBe('199');
    expect(historicalMinimumCodec(MAX.toString())).toBe(((MAX * 9950n) / 10000n).toString());
    for (const value of ['0', '1', '01', '-1', '1.1', (MAX + 1n).toString(), 201])
      expect(() => historicalMinimumCodec(value)).toThrow();
  });
  it('decodes strict queryInfo without discarding trailing or truncated SCALE', () => {
    const { identity, registry } = fixture();
    const codec = createHistoricalExecutionCodec(identity);
    const raw = hex(registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: 7 }).toU8a());
    expect(codec.decodeQueryInfo(raw).partialFeeCodec).toBe('7');
    for (const value of [raw.slice(0, -2), `${raw}00`, '0x', `0x${'00'.repeat(257)}`])
      expect(() => codec.decodeQueryInfo(value)).toThrow();
  });
  it('derives only historical fixed storage keys and validates exact identities, precision and denominator', () => {
    const { identity, proof } = fixture();
    const codec = createHistoricalExecutionCodec(identity);
    const keys = codec.storageKeys();
    expect(Object.keys(keys)).toEqual(['timestamp', 'denominator', 'kusd', 'xor', 'dex0']);
    expect(new Set(Object.values(keys)).size).toBe(5);
    expect(keys.timestamp).toHaveLength(66);
    expect(codec.decodeStorage(proof)).toEqual({
      timestampMs: 1000000,
      denominator: '1',
      assets: {
        kusd: { assetId: KUSD, symbol: 'KUSD', decimals: 18 },
        xor: { assetId: XOR, symbol: 'XOR', decimals: 18 },
      },
      dex: { id: 0, baseAssetId: XOR },
    });
    for (const values of [
      { ...proof, timestamp: null },
      { ...proof, denominator: hex(le(0)) },
      { ...proof, kusd: proof.xor },
      { ...proof, dex0: KUSD },
      { ...proof, xor: `${proof.xor.slice(0, -2)}0c` },
      { ...proof, denominator: `${proof.denominator}00` },
      { ...proof, timestamp: hex(le(BigInt(Number.MAX_SAFE_INTEGER) + 1n, 8)) },
    ])
      expect(() => codec.decodeStorage(values)).toThrow();
  });
  it('decodes mandatory SCALE tip, exact Option lengths and saturating Rust totals', () => {
    expect(decodeHistoricalFeeDetailsScale(fees(1, 2, 3, 4))).toMatchObject({
      tip: '4',
      inclusionFeeTotal: '6',
      finalFee: '10',
    });
    expect(assertHistoricalFeeDetailsMatchesQueryInfo(fees(1, 2, 3, 4), '6', '4').finalFee).toBe('10');
    expect(decodeHistoricalFeeDetailsScale(fees(MAX, 1, 2, 3)).finalFee).toBe(MAX.toString());
    const none = hex(Buffer.concat([Buffer.from([0]), le(5)]));
    expect(decodeHistoricalFeeDetailsScale(none)).toMatchObject({ inclusionFee: null, tip: '5', finalFee: '5' });
    for (const raw of [
      '0x',
      fees(1, 2, 3, 0).slice(0, -32),
      `${fees(1, 2, 3, 0)}00`,
      `0x02${fees(1, 2, 3, 0).slice(4)}`,
    ])
      expect(() => decodeHistoricalFeeDetailsScale(raw)).toThrow();
    expect(() => assertHistoricalFeeDetailsMatchesQueryInfo(none, '5')).toThrow();
    expect(() => assertHistoricalFeeDetailsMatchesQueryInfo(fees(1, 2, 3, 4), '10', '4')).toThrow();
    expect(() => assertHistoricalFeeDetailsMatchesQueryInfo(fees(1, 2, 3, 4), '6')).toThrow();
  });
});
