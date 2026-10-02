import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { compactAddLength, compactStripLength, compactToU8a } from '@polkadot/util';
import {
  createHistoricalGoalFeeCodec,
  HISTORICAL_GOAL_FEE_POLICY,
} from '../../../../scripts/bots/historical-goal-fee-codec';
import {
  createHistoricalExecutionCodec,
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
const hex = (bytes: Uint8Array): `0x${string}` => `0x${Buffer.from(bytes).toString('hex')}`;
const le = (n: bigint | number, size = 16) =>
  Buffer.from(
    BigInt(n)
      .toString(16)
      .padStart(size * 2, '0')
      .match(/../g)!
      .reverse()
      .map((b) => Number.parseInt(b, 16))
  );
/** Invented metadata exercises real SDK codecs; fixtures contain no market observations. */
function fixture(
  palletIndex = 42,
  methodIndex = 3,
  custom = false,
  extraExtension?: string,
  extensionOverrides: Record<number, { identifier?: string; type?: number; additionalSigned?: number }> = {},
  alter?: (definitions: Array<Record<string, unknown>>) => void
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
        { name: 'Signature', type: 28 },
        { name: 'Extra', type: 31 },
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
  definitions[11] = { path: ['sp_core', 'crypto', 'AccountId32'], def: { composite: { fields: [field(null, 3)] } } };
  definitions[12] = { path: ['sp_core', 'ed25519', 'Signature'], def: { composite: { fields: [field(null, 29)] } } };
  definitions.push(
    { path: ['sp_core', 'sr25519', 'Signature'], def: { composite: { fields: [field(null, 29)] } } },
    { path: ['sp_core', 'ecdsa', 'Signature'], def: { composite: { fields: [field(null, 30)] } } },
    { path: ['sp_core', 'eth', 'Signature'], def: { composite: { fields: [field(null, 30)] } } },
    {
      path: ['sp_runtime', 'MultiSignature'],
      def: {
        variant: {
          variants: [
            variant('Ed25519', 0, [field(null, 12)]),
            variant('Sr25519', 1, [field(null, 25)]),
            variant('Ecdsa', 2, [field(null, 26)]),
            variant('Eth', 3, [field(null, 27)]),
          ],
        },
      },
    },
    { def: { array: { len: 64, type: 0 } } },
    { def: { array: { len: 65, type: 0 } } },
    { def: { tuple: [13, 13, 13, 21, 22, 13, 32] } },
    { path: ['sp_runtime', 'AsTransactionExtension'], def: { composite: { fields: [field(null, 24)] } } }
  );
  alter?.(definitions);
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
const context = { blockNumber: 333 };

function candidate(
  f: ReturnType<typeof fixture>,
  options: {
    nonce?: string;
    signature?: number;
    period?: number;
    current?: number;
    tip?: string;
    callHex?: string;
    immortal?: boolean;
    address?: string;
  } = {}
) {
  const call = options.callHex ?? createHistoricalExecutionCodec(f.identity).buildSwapEnvelope(request).callHex;
  const envelope = f.registry.createType('Extrinsic', f.registry.createType('Call', call), { version: 4 });
  const type = options.signature ?? 1;
  const signature = Uint8Array.from([type, ...new Array(type < 2 ? 64 : 65).fill(1)]);
  const payload = f.registry.createType(
    'ExtrinsicPayload',
    {
      method: call,
      nonce: options.nonce ?? '0',
      tip: options.tip ?? '0',
      era: options.immortal ? 0 : { current: options.current ?? context.blockNumber, period: options.period ?? 64 },
      genesisHash: GENESIS,
      blockHash: BLOCK,
      ...f.identity.runtimeVersion,
    },
    { version: 4 }
  );
  envelope.addSignature(options.address ?? `0x${'33'.repeat(32)}`, hex(signature), payload.toHex());
  return envelope;
}

describe('historical goal fee envelope bounds', () => {
  it.each([130, 131])('encodes the measured mortal64/Ecdsa/u32 bound for runtime %i', (version) => {
    const f = fixture();
    f.identity.runtimeVersion = { specVersion: version, transactionVersion: version };
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const result = codec.buildBoundSwapEnvelope(request, context);
    const decoded = f.registry.createType('Extrinsic', result.envelopeHex);
    expect(decoded.isSigned).toBe(true); // Non-cryptographic placeholder only.
    expect(decoded.era.asMortalEra.period.toNumber()).toBe(64);
    expect(decoded.era.asMortalEra.phase.toNumber()).toBe(13);
    expect(decoded.nonce.toString()).toBe('4294967295');
    expect(decoded.tip.toString()).toBe('0');
    expect(decoded.signature.toU8a()).toHaveLength(65);
    expect(result.estimation).toMatchObject({
      nonceEncodedLength: 5,
      signatureEncodedLength: 66,
      addressEncodedLength: 32,
      eraEncodedLength: 2,
    });
    expect(result.minimumCodec).toBe('995000000000000000');
    expect(result.amountInCodec).toBe(request.amountInCodec);
    expect(result.feeAssetAddress).toBe(XOR);
    expect(result.callHex).toBe(createHistoricalExecutionCodec(f.identity).buildSwapEnvelope(request).callHex);
    expect(result.encodedLength).toBe(decoded.toU8a().length);
    expect(result.feeQueryDataHex.slice(0, -8)).toBe(result.envelopeHex);
    expect(Buffer.from(result.feeQueryDataHex.slice(-8), 'hex').readUInt32LE()).toBe(result.encodedLength);
    expect(result.policySha256).toBe(
      createHash('sha256').update(JSON.stringify(HISTORICAL_GOAL_FEE_POLICY)).digest('hex')
    );
    expect(result).toMatchObject({
      blockHash: BLOCK,
      genesisHash: GENESIS,
      signatureVerified: false,
      feeAdequacyVerified: false,
      transactionSubmitted: false,
    });
    expect(codec.inspectSwapEnvelope(request, context, result.envelopeHex).encodedLength).toBe(result.encodedLength);
    expect(codec).not.toHaveProperty('registry');
  });

  it.each([
    ['0', 1],
    ['63', 1],
    ['64', 2],
    ['16383', 2],
    ['16384', 4],
    ['1073741823', 4],
    ['1073741824', 5],
    ['4294967295', 5],
  ] as const)('bounds actual compact nonce %s with %i bytes for every allowed signature', (nonce, width) => {
    const f = fixture();
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const bound = codec.buildBoundSwapEnvelope(request, context);
    for (const signature of [0, 1, 2]) {
      const envelope = candidate(f, { nonce, signature });
      expect(envelope.nonce.toU8a()).toHaveLength(width);
      const result = codec.inspectSwapEnvelope(request, context, envelope.toHex());
      expect(result.nonce).toBe(nonce);
      expect(result.encodedLength).toBeLessThanOrEqual(bound.encodedLength);
      expect(result.signatureType).toBe(['Ed25519', 'Sr25519', 'Ecdsa'][signature]);
    }
  });

  it('measures real era/signature/nonce changes and the complete outer length prefix', () => {
    const f = fixture();
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const legacy = createHistoricalExecutionCodec(f.identity).buildSwapEnvelope(request);
    const mortal = candidate(f);
    const ecdsa = candidate(f, { signature: 2 });
    const maximum = candidate(f, { signature: 2, nonce: '4294967295' });
    expect(mortal.toU8a().length).toBe(legacy.encodedLength + 1);
    expect(ecdsa.toU8a().length).toBe(mortal.toU8a().length + 1);
    expect(maximum.toU8a().length).toBe(ecdsa.toU8a().length + 4);
    expect(codec.buildBoundSwapEnvelope(request, context).encodedLength).toBe(maximum.toU8a().length);
  });

  it('retains independent call indexes, reverse route and u128 exact quantities', () => {
    const f = fixture(51, 7);
    const reverse = {
      assetIn: XOR,
      assetOut: KUSD,
      amountInCodec: MAX.toString(),
      quotedAmountOutCodec: MAX.toString(),
    };
    const result = createHistoricalGoalFeeCodec(f.identity).buildBoundSwapEnvelope(reverse, context);
    expect(result.callHex.slice(0, 6)).toBe('0x3307');
    expect(result.amountInCodec).toBe(MAX.toString());
    expect(result.minimumCodec).toBe(((MAX * 9950n) / 10000n).toString());
    expect(result.assetIn).toBe(XOR);
  });

  it('rejects immortal, different period, paid tip, different call and trailing bytes', () => {
    const f = fixture();
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const wrongCall = createHistoricalExecutionCodec(f.identity).buildSwapEnvelope({
      ...request,
      amountInCodec: '1',
    }).callHex;
    for (const options of [{ immortal: true }, { period: 32 }, { period: 128 }, { tip: '1' }, { callHex: wrongCall }])
      expect(() => codec.inspectSwapEnvelope(request, context, candidate(f, options).toHex())).toThrow();
    expect(() => codec.inspectSwapEnvelope(request, context, `${candidate(f).toHex()}00`)).toThrow();
  });

  it('rejects an unsupported Eth discriminant, invalid signature and nonce above u32', () => {
    const f = fixture();
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const valid = candidate(f, { signature: 2 }).toU8a();
    // Signature follows the two-byte outer length, signed-version byte and AccountId32.
    const eth = Uint8Array.from(valid);
    eth[35] = 3;
    expect(() => codec.inspectSwapEnvelope(request, context, hex(eth))).toThrow();
    const invalid = Uint8Array.from(valid);
    invalid[35] = 9;
    expect(() => codec.inspectSwapEnvelope(request, context, hex(invalid))).toThrow();
    const maximum = candidate(f, { signature: 2, nonce: '4294967295' });
    const body = compactStripLength(maximum.toU8a())[1];
    const nonceOffset = 1 + 32 + 66 + 2;
    const large = compactAddLength(
      Uint8Array.from([
        ...body.subarray(0, nonceOffset),
        ...compactToU8a(4294967296n),
        ...body.subarray(nonceOffset + 5),
      ])
    );
    expect(() => codec.inspectSwapEnvelope(request, context, hex(large))).toThrow();
  });

  it('checks length only, permitting other AccountId32 values and mortal64 phases without signature claims', () => {
    const f = fixture();
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const result = codec.inspectSwapEnvelope(request, context, candidate(f, { current: 335 }).toHex());
    expect(result.eraPhase).toBe(15);
    expect(result.kind).toBe('structural-length-compatible');
    expect(result.signatureVerified).toBe(false);
  });

  it('rejects wrong metadata extension/runtime/route rather than selecting another policy', () => {
    for (const identity of [
      fixture(42, 3, true).identity,
      fixture(42, 3, false, 'UnknownExtension').identity,
      fixture(42, 3, false, undefined, { 4: { type: 1 } }).identity,
      { ...fixture().identity, runtimeVersion: { specVersion: 132, transactionVersion: 132 } },
      { ...fixture().identity, runtimeVersion: { specVersion: 130, transactionVersion: 131 } },
    ])
      expect(() => createHistoricalGoalFeeCodec(identity)).toThrow();
    const codec = createHistoricalGoalFeeCodec(fixture().identity);
    expect(() => codec.buildBoundSwapEnvelope({ ...request, assetOut: KUSD }, context)).toThrow();
    expect(() => codec.buildBoundSwapEnvelope({ ...request, amountInCodec: (MAX + 1n).toString() }, context)).toThrow();
  });

  it('rejects altered AccountId, signature payload, variant order and generic parameter metadata', () => {
    const mutations: Array<(definitions: Array<Record<string, unknown>>) => void> = [
      (d) => {
        d[31] = { def: { tuple: [13, 13, 13, 21, 1, 13, 32] } };
      },
      (d) => {
        d[32] = { def: { composite: { fields: [field('named', 24)] } } };
      },
      (d) => {
        d[10] = { def: { variant: { variants: [variant('WrongPallet', 42, [field(null, 9)])] } } };
      },
      (d) => {
        d[11] = { def: { array: { len: 33, type: 0 } } };
      },
      (d) => {
        d[30] = { def: { array: { len: 66, type: 0 } } };
      },
      (d) => {
        d[28] = {
          def: {
            variant: {
              variants: [
                variant('Ed25519', 0, [field(null, 12)]),
                variant('Sr25519', 1, [field(null, 25)]),
                variant('Ecdsa', 2, [field(null, 26)]),
              ],
            },
          },
        };
      },
      (d) => {
        d[28] = {
          def: {
            variant: {
              variants: [
                variant('Sr25519', 0, [field(null, 25)]),
                variant('Ed25519', 1, [field(null, 12)]),
                variant('Ecdsa', 2, [field(null, 26)]),
                variant('Eth', 3, [field(null, 27)]),
              ],
            },
          },
        };
      },
      (d) => {
        d[14] = {
          ...d[14],
          params: [
            { name: 'Address', type: 11 },
            { name: 'Call', type: 10 },
            { name: 'Signature', type: 28 },
          ],
        };
      },
    ];
    for (const mutate of mutations)
      expect(() => createHistoricalGoalFeeCodec(fixture(42, 3, false, undefined, {}, mutate).identity)).toThrow();
  });

  it('rejects accessors and extra fields without invoking them, and detaches immutable evidence', () => {
    const f = fixture();
    const getter = vi.fn();
    const poison = { ...f.identity };
    Object.defineProperty(poison, 'metadataHex', { get: getter, enumerable: true });
    expect(() => createHistoricalGoalFeeCodec(poison)).toThrow();
    const codec = createHistoricalGoalFeeCodec(f.identity);
    const malicious = Object.defineProperty({}, 'blockNumber', { get: getter, enumerable: true });
    expect(() => codec.buildBoundSwapEnvelope(request, malicious)).toThrow();
    expect(() => codec.buildBoundSwapEnvelope({ ...request, extra: 'x' }, context)).toThrow();
    for (const blockNumber of [0, -1, 1.5, 4294967296, NaN])
      expect(() => codec.buildBoundSwapEnvelope(request, { blockNumber })).toThrow();
    expect(getter).not.toHaveBeenCalled();
    const result = codec.buildBoundSwapEnvelope(request, context);
    f.identity.runtimeVersion.specVersion = 131;
    expect(result.runtimeVersion.specVersion).toBe(130);
    for (const value of [
      codec,
      codec.binding,
      result,
      result.runtimeVersion,
      result.policy,
      result.policy.allowedSignatures,
      result.policy.allowedSignatures[0],
      result.estimation,
    ])
      expect(Object.isFrozen(value)).toBe(true);
  });
});
