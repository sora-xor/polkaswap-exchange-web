/** Synthetic metadata and observations shared by offline fee/replay tests; no operational data. */
import { Metadata, TypeRegistry } from '@polkadot/types';
import { createHistoricalGoalFeeCodec } from '../../../../../scripts/bots/historical-goal-fee-codec';
import { prepareHistoricalGoalFill } from '../../../../../scripts/bots/historical-goal-quote';
import { planHistoricalExecutionClock } from '../../../../../scripts/bots/historical-execution-clock';
import {
  createHistoricalExecutionCodec,
  decodeHistoricalFeeDetailsScale,
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../../scripts/bots/historical-execution-codec';
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
export function createHistoricalFeeMetadataFixture(
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
const START = 1000 * 3_600_000;
const HOUR = 3_600_000;
const hash = (value: number) => `0x${value.toString(16).padStart(64, '0')}`;
const feeBytes = (base: bigint | number, length: bigint | number, weight: bigint | number, tip: bigint | number = 0) =>
  hex(Buffer.concat([Buffer.from([1]), ...[base, length, weight, tip].map((part) => le(part))]));
type Mutable<T> = T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T;
const clone = <T>(input: T): Mutable<T> => JSON.parse(JSON.stringify(input));

/** All amounts, blocks, reserves and fee results are invented; real codec/join logic processes them. */
export function createHistoricalBoundFeeFixture(reverse = false) {
  const metadata = createHistoricalFeeMetadataFixture();
  const block = (height: number, timestampMs: number) => ({
    height,
    hash: hash(height),
    parentHash: hash(height - 1),
    timestampMs,
  });
  const closing = block(331, START + HOUR - 6000);
  const previous = block(332, START + HOUR);
  const execution = { ...block(333, START + HOUR + 6000), hash: BLOCK };
  const plan = planHistoricalExecutionClock(
    { completedAtMs: START + HOUR, closing, successor: previous },
    {
      version: 1,
      purpose: 'development',
      availability: 'assumed-after-successor-block',
      signalDelayMs: 0,
      executionDelayMs: 1,
      maximumExecutionLagMs: 6000,
    },
    { startedAtMs: START, endedAtMs: START + 86400000 }
  );
  const request = {
    assetIn: reverse ? XOR : KUSD,
    assetOut: reverse ? KUSD : XOR,
    amountInCodec: '2500000000000000000',
    quotedAmountOutCodec: '1000000000000000001',
  };
  const codec = createHistoricalExecutionCodec(metadata.identity);
  const bound = createHistoricalGoalFeeCodec(metadata.identity).buildBoundSwapEnvelope(request, {
    blockNumber: execution.height,
  });
  const state = { timestampMs: execution.timestampMs, denominator: '1' };
  const requestBlock = { hash: BLOCK, height: execution.height };
  const pending = {
    assetIn: request.assetIn,
    assetOut: request.assetOut,
    amountInCodec: request.amountInCodec,
    expectedDenominator: '1',
  };
  const quoteEvidence = {
    kind: 'hypothetical-historical-execution-estimate',
    request: { ...pending, block: requestBlock },
    context: {
      genesisHash: GENESIS,
      block: requestBlock,
      parentHash: previous.hash,
      expectedDenominator: '1',
      state,
      codecBinding: codec.binding,
    },
    quote: {
      amountOutCodec: request.quotedAmountOutCodec,
      amountWithoutImpactCodec: request.quotedAmountOutCodec,
      poolFeeCodec: '10000',
      dexId: 0,
      liquiditySource: 'XYKPool',
      slippageBps: 50,
      feeAssetAddress: XOR,
      route: [request.assetIn, request.assetOut],
    },
    envelope: codec.buildSwapEnvelope(request),
    fees: { assetId: XOR, info: { partialFeeCodec: '6' }, details: decodeHistoricalFeeDetailsScale(feeBytes(1, 2, 3)) },
    observedFill: false,
    transactionSubmitted: false,
  };
  const pool = {
    binding: codec.binding,
    state,
    basis: 'direct-pool-reserve-ratio',
    status: 'present',
    accounts: { reservesAccountId: hash(501), feesAccountId: hash(502) },
    pair: { baseAssetId: XOR, targetAssetId: KUSD, baseDecimals: 18, targetDecimals: 18 },
    reserves: { kusdCodec: '100000000000000000000', xorCodec: '100000000000000000000' },
    marks: {
      xorPerKusd: { numeratorCodec: '100000000000000000000', denominatorCodec: '100000000000000000000' },
      kusdPerXor: { numeratorCodec: '100000000000000000000', denominatorCodec: '100000000000000000000' },
    },
    observedFill: false,
    transactionSubmitted: false,
  };
  const queryInfo = (fee = '11') =>
    hex(metadata.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: fee }).toU8a());
  const receipt = {
    version: 1,
    kind: 'historical-goal-bound-fee-receipt',
    envelope: clone(bound),
    feeAssetAddress: XOR,
    queries: {
      info: {
        method: 'state_call',
        params: ['TransactionPaymentApi_query_info', bound.feeQueryDataHex, BLOCK],
        resultHex: queryInfo(),
      },
      details: {
        method: 'state_call',
        params: ['TransactionPaymentApi_query_fee_details', bound.feeQueryDataHex, BLOCK],
        resultHex: feeBytes(1, 7, 3),
      },
    },
  };
  const prepared = prepareHistoricalGoalFill(pending, plan, previous, execution, quoteEvidence, pool);
  const source = { identity: metadata.identity, blockNumber: execution.height, request, quoteEvidence };
  return { metadata, source, receipt, prepared, pending, plan, previous, execution, pool, quoteEvidence, queryInfo };
}
export { MAX, hash, hex, le, feeBytes, clone };
