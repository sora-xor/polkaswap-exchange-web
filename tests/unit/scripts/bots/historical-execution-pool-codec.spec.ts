import { describe, expect, it, vi } from 'vitest';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { xxhashAsU8a, blake2AsU8a } from '@polkadot/util-crypto';
import {
  createHistoricalExecutionPoolCodec,
  prepareHistoricalExecutionPoolIdentity,
  roundHistoricalPoolRatioTo18,
} from '../../../../scripts/bots/historical-execution-pool-codec';
import {
  createHistoricalExecutionPoolCodec as createBrowserPoolCodec,
  prepareHistoricalExecutionPoolIdentity as prepareBrowserPoolIdentity,
} from '../../../../src/features/bot-trading/execution-codecs/pool';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
  createHistoricalExecutionCodec,
  createValidatedHistoricalPoolLayout,
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
/** Invented metadata exercises real SDK codecs; fixtures contain no market observations. */
function fixture(
  palletIndex = 42,
  methodIndex = 3,
  custom = false,
  extraExtension?: string,
  extensionOverrides: Record<number, { identifier?: string; type?: number; additionalSigned?: number }> = {},
  poolPrefix = 'PoolXYK',
  poolOverrides: { propertiesModifier?: string; reservesValue?: number; hashers?: string[]; key?: number } = {}
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
  definitions.push(
    { def: { tuple: [4, 4] } },
    { def: { tuple: [11, 11] } },
    { def: { tuple: [2, 2] } },
    { def: { primitive: 'Bool' } },
    { def: { tuple: [28, 28] } }
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
          {
            name: 'PoolXYK',
            calls: null,
            events: null,
            errors: null,
            constants: [],
            index: 60,
            storage: {
              prefix: poolPrefix,
              items: [
                {
                  name: 'Properties',
                  modifier: poolOverrides.propertiesModifier ?? 'Optional',
                  type: {
                    map: {
                      hashers: poolOverrides.hashers ?? ['Blake2_128Concat', 'Blake2_128Concat'],
                      key: poolOverrides.key ?? 25,
                      value: 26,
                    },
                  },
                  fallback: '0x00',
                  docs: [],
                },
                {
                  name: 'Reserves',
                  modifier: 'Default',
                  type: {
                    map: {
                      hashers: ['Blake2_128Concat', 'Blake2_128Concat'],
                      key: poolOverrides.key ?? 25,
                      value: poolOverrides.reservesValue ?? 27,
                    },
                  },
                  fallback: `0x${'00'.repeat(32)}`,
                  docs: [],
                },
              ],
            },
          },
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
    properties: `0x${'11'.repeat(32)}${'22'.repeat(32)}`,
    reserves: hex(Buffer.concat([le(3n * 10n ** 18n), le(2n * 10n ** 18n)])),
  };
  return { identity, registry, proof };
}

/** Independent double-map key construction, using SCALE AssetId32's fixed 32-byte code. */
function expectedPoolKey(prefix: string, item: string) {
  const base = Buffer.from(XOR.slice(2), 'hex');
  const target = Buffer.from(KUSD.slice(2), 'hex');
  return hex(
    Buffer.concat([
      xxhashAsU8a(prefix, 128),
      xxhashAsU8a(item, 128),
      blake2AsU8a(base, 128),
      base,
      blake2AsU8a(target, 128),
      target,
    ])
  );
}

describe('historical execution pool codec', () => {
  it('keeps validated layouts tied to exact metadata while rebinding every block independently', () => {
    const identity = fixture().identity;
    const nextBlock = { ...identity, blockHash: `0x${'33'.repeat(32)}` };
    const otherMetadata = fixture(42, 3, false, undefined, {}, 'ArchivedPoolXYK').identity;
    for (const build of [createHistoricalExecutionPoolCodec, createBrowserPoolCodec]) {
      const first = build(identity);
      const second = build(nextBlock);
      const distinct = build(otherMetadata);
      expect(first.binding.blockHash).toBe(identity.blockHash);
      expect(second.binding.blockHash).toBe(nextBlock.blockHash);
      expect(first.binding.metadataSha256).toBe(second.binding.metadataSha256);
      expect(first.storageKeys()).toEqual(second.storageKeys());
      expect(distinct.binding.metadataSha256).not.toBe(first.binding.metadataSha256);
      expect(distinct.storageKeys().properties).not.toBe(first.storageKeys().properties);
    }
    const base = createHistoricalExecutionCodec(identity);
    expect(() => createValidatedHistoricalPoolLayout({ ...base })).toThrow();
  });

  it('derives the exact XOR-first pair keys from the historical storage prefix', () => {
    for (const prefix of ['PoolXYK', 'ArchivedPoolXYK']) {
      const { identity } = fixture(42, 3, false, undefined, {}, prefix);
      const codec = createHistoricalExecutionPoolCodec(identity);
      const keys = codec.storageKeys();
      expect(Object.keys(keys)).toEqual(['timestamp', 'denominator', 'kusd', 'xor', 'dex0', 'properties', 'reserves']);
      expect(keys.properties).toBe(expectedPoolKey(prefix, 'Properties'));
      expect(keys.reserves).toBe(expectedPoolKey(prefix, 'Reserves'));
      expect(Object.isFrozen(keys)).toBe(true);
      expect(codec).not.toHaveProperty('registry');
    }
  });

  it('rejects unsupported pool modifiers, hashing contracts and non-u128 reserve layouts', () => {
    for (const poolOverrides of [
      { propertiesModifier: 'Default' },
      { reservesValue: 26 },
      { hashers: ['Identity', 'Identity'] },
    ])
      expect(() =>
        createHistoricalExecutionPoolCodec(fixture(42, 3, false, undefined, {}, 'PoolXYK', poolOverrides).identity)
      ).toThrow();
  });

  it('rejects same-arity boolean key components that coerce asset objects into the wrong pool key', () => {
    const { identity, registry } = fixture(42, 3, false, undefined, {}, 'PoolXYK', { key: 29 });
    expect(registry.lookup.getTypeDef(29).type).toBe('(bool,bool)');
    expect(hex(registry.createType('Lookup28', { code: XOR }).toU8a())).toBe('0x01');
    expect(() => createHistoricalExecutionPoolCodec(identity)).toThrow();
  });

  it('preserves exact u128 reserves and reciprocal orientation without rounding the default marks', () => {
    const { identity, proof } = fixture();
    const codec = createHistoricalExecutionPoolCodec(identity);
    const result = codec.decodeStorage(proof);
    expect(result).toMatchObject({
      status: 'present',
      basis: 'direct-pool-reserve-ratio',
      observedFill: false,
      transactionSubmitted: false,
      binding: { blockHash: BLOCK, runtimeVersion: { specVersion: 130, transactionVersion: 130 } },
      accounts: { reservesAccountId: `0x${'11'.repeat(32)}`, feesAccountId: `0x${'22'.repeat(32)}` },
      reserves: { xorCodec: '3000000000000000000', kusdCodec: '2000000000000000000' },
      marks: {
        xorPerKusd: { numeratorCodec: '3000000000000000000', denominatorCodec: '2000000000000000000' },
        kusdPerXor: { numeratorCodec: '2000000000000000000', denominatorCodec: '3000000000000000000' },
      },
      state: { denominator: '1', timestampMs: 1000000 },
      pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
    });
    expect(roundHistoricalPoolRatioTo18(result.marks!.xorPerKusd).decimal).toBe('1.5');
    expect(roundHistoricalPoolRatioTo18(result.marks!.kusdPerXor).decimal).toBe('0.666666666666666666');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.marks!.xorPerKusd)).toBe(true);
    expect(Object.isFrozen(result.state.assets.kusd)).toBe(true);
  });

  it('keeps absent properties and missing raw reserves distinct from encoded zeros', () => {
    const { identity, proof } = fixture();
    const codec = createHistoricalExecutionPoolCodec(identity);
    expect(codec.decodeStorage({ ...proof, properties: null, reserves: null })).toMatchObject({
      status: 'absent',
      accounts: null,
      reserves: null,
      marks: null,
    });
    expect(codec.decodeStorage({ ...proof, reserves: null })).toMatchObject({
      status: 'missing-reserves',
      reserves: null,
      marks: null,
    });
    for (const [xor, kusd] of [
      [0, 0],
      [0, 4],
      [7, 0],
    ])
      expect(codec.decodeStorage({ ...proof, reserves: hex(Buffer.concat([le(xor), le(kusd)])) })).toMatchObject({
        status: 'zero-reserves',
        reserves: { xorCodec: String(xor), kusdCodec: String(kusd) },
        marks: null,
      });
    expect(() => codec.decodeStorage({ ...proof, properties: null })).toThrow();
  });

  it('rejects Optional tags, missing fields and truncated or trailing SCALE bytes', () => {
    const { identity, proof } = fixture();
    const codec = createHistoricalExecutionPoolCodec(identity);
    for (const invalid of [
      { ...proof, properties: `0x01${proof.properties.slice(2)}` },
      { ...proof, properties: proof.properties.slice(0, -2) },
      { ...proof, properties: undefined },
      { ...proof, reserves: `${proof.reserves}00` },
      { ...proof, reserves: proof.reserves.slice(0, -2) },
      { ...proof, reserves: '0x' },
      { ...proof, extra: 1 },
    ])
      expect(() => codec.decodeStorage(invalid)).toThrow();
  });

  it('revalidates same-state token identities, precision and denomination with the unchanged base codec', () => {
    const { identity, proof } = fixture();
    const codec = createHistoricalExecutionPoolCodec(identity);
    for (const invalid of [
      { ...proof, kusd: proof.xor },
      { ...proof, denominator: hex(le(0)) },
      { ...proof, xor: `${proof.xor.slice(0, -2)}0c` },
      { ...proof, timestamp: null },
    ])
      expect(() => codec.decodeStorage(invalid)).toThrow();
    expect(() => createHistoricalExecutionPoolCodec({ ...identity, genesisHash: BLOCK })).toThrow();
    expect(() => createHistoricalExecutionPoolCodec(fixture(42, 3, true).identity)).toThrow();
  });

  it('retains maximal u128 observations exactly without overflowing ratio intermediates', () => {
    const { identity, proof } = fixture();
    const result = createHistoricalExecutionPoolCodec(identity).decodeStorage({
      ...proof,
      reserves: hex(Buffer.concat([le(MAX), le(1)])),
    });
    expect(result.reserves).toEqual({ xorCodec: MAX.toString(), kusdCodec: '1' });
    expect(roundHistoricalPoolRatioTo18(result.marks!.xorPerKusd)).toMatchObject({
      scaled: (MAX * 10n ** 18n).toString(),
      decimal: MAX.toString(),
      status: 'available',
    });
    expect(roundHistoricalPoolRatioTo18(result.marks!.kusdPerXor)).toMatchObject({
      scaled: '0',
      decimal: '0',
      status: 'below-18-decimal-resolution',
    });
    expect(result.marks!.kusdPerXor).toEqual({ numeratorCodec: '1', denominatorCodec: MAX.toString() });
  });

  it('requires an explicit valid positive ratio for optional 18-decimal floor conversion', () => {
    expect(roundHistoricalPoolRatioTo18({ numeratorCodec: '2', denominatorCodec: '3' })).toEqual({
      status: 'available',
      decimals: 18,
      rounding: 'floor',
      scaled: '666666666666666666',
      decimal: '0.666666666666666666',
    });
    for (const value of ['0', '-1', '01', '1.1', (MAX + 1n).toString(), 1]) {
      expect(() => roundHistoricalPoolRatioTo18({ numeratorCodec: value, denominatorCodec: '1' })).toThrow();
      expect(() => roundHistoricalPoolRatioTo18({ numeratorCodec: '1', denominatorCodec: value })).toThrow();
    }
  });

  it('rejects getters without evaluating them and detaches retained state from caller mutation', () => {
    const { identity, proof } = fixture();
    const getter = vi.fn();
    const poisonedIdentity = Object.defineProperty({ ...identity }, 'metadataHex', { enumerable: true, get: getter });
    expect(() => createHistoricalExecutionPoolCodec(poisonedIdentity)).toThrow();
    const codec = createHistoricalExecutionPoolCodec(identity);
    const poisonedProof = Object.defineProperty({ ...proof }, 'properties', { enumerable: true, get: getter });
    expect(() => codec.decodeStorage(poisonedProof)).toThrow();
    expect(getter).not.toHaveBeenCalled();
    expect(() => codec.decodeStorage(Object.create(proof))).toThrow();
    const result = codec.decodeStorage(proof);
    proof.properties = `0x${'99'.repeat(64)}`;
    proof.reserves = hex(Buffer.concat([le(1), le(1)]));
    identity.runtimeVersion.specVersion = 131;
    expect(result.accounts?.reservesAccountId).toBe(`0x${'11'.repeat(32)}`);
    expect(result.reserves?.xorCodec).toBe('3000000000000000000');
    expect(result.binding.runtimeVersion.specVersion).toBe(130);
  });
});

/** Reuse schema decoding only; every selected block and proof must retain its own result. */
describe('privately owned pool decoder identities', () => {
  it.each([130, 131])('keeps runtime %s block bindings and changed raw reserves separate', (version) => {
    const f = fixture();
    f.identity.runtimeVersion = { specVersion: version, transactionVersion: version };
    const nextIdentity = { ...f.identity, blockHash: `0x${'33'.repeat(32)}` };
    const nextProof = {
      ...f.proof,
      timestamp: hex(le(1060000, 8)),
      reserves: hex(Buffer.concat([le(7n * 10n ** 18n), le(5n * 10n ** 18n)])),
    };
    for (const [build, prepare] of [
      [createHistoricalExecutionPoolCodec, prepareHistoricalExecutionPoolIdentity],
      [createBrowserPoolCodec, prepareBrowserPoolIdentity],
    ] as const) {
      const anchor = build(f.identity);
      const prepared = prepare(anchor, nextIdentity);
      const selected = build(prepared);
      const first = anchor.decodeStorage(f.proof);
      const next = selected.decodeStorage(nextProof);
      expect(next).toEqual(build(nextIdentity).decodeStorage(nextProof));
      expect(build(JSON.parse(JSON.stringify(prepared))).decodeStorage(nextProof)).toEqual(next);
      expect(next.binding.blockHash).toBe(nextIdentity.blockHash);
      expect(next.binding).not.toBe(first.binding);
      expect(next.reserves).not.toBe(first.reserves);
      expect(next.state.timestampMs).toBe(1060000);
      expect(next.reserves?.xorCodec).toBe('7000000000000000000');
      expect(first.binding.blockHash).toBe(f.identity.blockHash);
      expect(first.state.timestampMs).toBe(1000000);
      expect(first.reserves?.xorCodec).toBe('3000000000000000000');
      nextProof.reserves = hex(Buffer.concat([le(9), le(4)]));
      const changed = selected.decodeStorage(nextProof);
      expect(changed).toEqual(build(nextIdentity).decodeStorage(nextProof));
      expect(changed.reserves).toEqual({ xorCodec: '9', kusdCodec: '4' });
      expect(next.reserves?.xorCodec).toBe('7000000000000000000');
      nextProof.reserves = hex(Buffer.concat([le(7n * 10n ** 18n), le(5n * 10n ** 18n)]));
      expect(Object.keys(selected).sort()).toEqual(['binding', 'decodeStorage', 'storageKeys']);
      expect(Object.isFrozen(prepared)).toBe(true);
      expect(Object.isFrozen(next.binding.runtimeVersion)).toBe(true);
    }
  });

  it('isolates genuine metadata owners and snapshots identity mutation before reuse', () => {
    const f = fixture(),
      other = fixture(42, 3, false, undefined, {}, 'ArchivedPoolXYK');
    for (const [build, prepare] of [
      [createHistoricalExecutionPoolCodec, prepareHistoricalExecutionPoolIdentity],
      [createBrowserPoolCodec, prepareBrowserPoolIdentity],
    ] as const) {
      const anchor = build(f.identity),
        distinct = build(other.identity);
      expect(() => prepare(anchor, other.identity)).toThrow();
      expect(build(prepare(distinct, other.identity)).storageKeys()).toEqual(distinct.storageKeys());
      expect(distinct.storageKeys().properties).not.toBe(anchor.storageKeys().properties);
      for (const changed of [
        { ...f.identity, genesisHash: BLOCK },
        { ...f.identity, metadataHex: `${f.identity.metadataHex}00` },
        { ...f.identity, runtimeVersion: { specVersion: 131, transactionVersion: 131 } },
        { ...f.identity, blockHash: '0x00' },
      ])
        expect(() => prepare(anchor, changed)).toThrow();
      const raw = { ...f.identity, runtimeVersion: { ...f.identity.runtimeVersion } };
      const prepared = prepare(anchor, raw);
      raw.blockHash = `0x${'44'.repeat(32)}`;
      raw.metadataHex += '00';
      raw.runtimeVersion.specVersion = 132;
      expect(build(prepared).decodeStorage(f.proof)).toEqual(anchor.decodeStorage(f.proof));
      expect(() => prepare(anchor, raw)).toThrow();
    }
  });

  it('rejects copied or foreign capabilities and getter-bearing identities without invoking accessors', () => {
    const f = fixture();
    const original = createHistoricalExecutionPoolCodec(f.identity);
    const browser = createBrowserPoolCodec(f.identity);
    for (const [anchor, foreign, prepare] of [
      [original, browser, prepareHistoricalExecutionPoolIdentity],
      [browser, original, prepareBrowserPoolIdentity],
    ] as const) {
      const getter = vi.fn();
      expect(() => Object.defineProperty(anchor.binding, 'blockHash', { value: `0x${'55'.repeat(32)}` })).toThrow();
      for (const owner of [
        { ...anchor },
        JSON.parse(JSON.stringify(anchor)),
        Object.defineProperty({}, 'binding', { enumerable: true, get: getter }),
        foreign,
        undefined,
      ]) {
        expect(() => prepare(owner, f.identity)).toThrow();
      }
      for (const bad of [
        { ...f.identity, extra: true },
        Object.defineProperty({ ...f.identity }, 'metadataHex', { enumerable: true, get: getter }),
        {
          ...f.identity,
          runtimeVersion: Object.defineProperty({ ...f.identity.runtimeVersion }, 'specVersion', {
            enumerable: true,
            get: getter,
          }),
        },
        Object.create(f.identity),
      ])
        expect(() => prepare(anchor, bad)).toThrow();
      expect(getter).not.toHaveBeenCalled();
    }
  });

  it('continues validating fresh raw proof and exact absent/missing/zero states after priming', () => {
    const f = fixture();
    for (const [build, prepare] of [
      [createHistoricalExecutionPoolCodec, prepareHistoricalExecutionPoolIdentity],
      [createBrowserPoolCodec, prepareBrowserPoolIdentity],
    ] as const) {
      const anchor = build(f.identity),
        selected = build(prepare(anchor, f.identity));
      selected.decodeStorage(f.proof);
      for (const proof of [
        { ...f.proof, properties: null, reserves: null },
        { ...f.proof, reserves: null },
        { ...f.proof, reserves: hex(Buffer.concat([le(0), le(3)])) },
        { ...f.proof, reserves: hex(Buffer.concat([le(MAX), le(1)])) },
      ])
        expect(selected.decodeStorage(proof)).toEqual(anchor.decodeStorage(proof));
      const getter = vi.fn();
      for (const bad of [
        { ...f.proof, reserves: `${f.proof.reserves}00` },
        { ...f.proof, kusd: f.proof.xor },
        { ...f.proof, denominator: hex(le(0)) },
        { ...f.proof, properties: null },
        { ...f.proof, extra: '0x00' },
        Object.defineProperty({ ...f.proof }, 'reserves', { enumerable: true, get: getter }),
      ])
        expect(() => selected.decodeStorage(bad)).toThrow();
      expect(getter).not.toHaveBeenCalled();
      expect(selected.decodeStorage(f.proof)).toEqual(anchor.decodeStorage(f.proof));
    }
  });
});
