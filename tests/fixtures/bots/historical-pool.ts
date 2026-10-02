/** Synthetic V14 pool metadata for offline archive-reader tests; contains no market observations. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../scripts/bots/historical-execution-codec';

const BLOCK = `0x${'22'.repeat(32)}`;
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
export function createHistoricalPoolFixture(
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
