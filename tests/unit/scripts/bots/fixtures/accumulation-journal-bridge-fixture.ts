/** Invented native packet for journal integration; copied from the sealed bridge test fixture.
 * No observations, acquisition, source authentication or trading authority.
 */
import { createHash } from 'node:crypto';
import { createAccumulationEvidenceFixture } from './accumulation-evidence-fixture';
import { feeBytes, hex } from './historical-goal-bound-fee-fixture';
import { createHistoricalExecutionPoolCodec } from '../../../../../scripts/bots/historical-execution-pool-codec';
import { createHistoricalGoalFeeCodec } from '../../../../../scripts/bots/historical-goal-fee-codec';
import {
  HISTORICAL_EXECUTION_GENESIS as GENESIS,
  HISTORICAL_EXECUTION_KUSD as KUSD,
  HISTORICAL_EXECUTION_XOR as XOR,
} from '../../../../../scripts/bots/historical-execution-codec';
import {
  accumulationEvidenceDigest,
  type AccumulationRpcReceipt,
  type AccumulationTrustedSource,
} from '../../../../../scripts/bots/accumulation-evidence-bridge';
const UNIT = 10n ** 18n;
const endpoint = 'https://ws.mof.sora.org/' as const;
const hash = (n: number) => `0x${n.toString(16).padStart(64, '0')}`;
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
/** Reconstruct synthetic quote/fee/context bytes using the real SCALE codecs. */
export function createAccumulationJournalBridgeFixture(
  completedAt: number,
  denominator = '100000000000000000000000000000000000000'
) {
  const H = completedAt;
  const synthetic = createAccumulationEvidenceFixture(H + 1000);
  synthetic.proof.denominator = hex(synthetic.registry.createType('u128', denominator).toU8a());
  const identity = { ...synthetic.identity, blockHash: hash(100) };
  const codec = createHistoricalExecutionPoolCodec(identity),
    fee = createHistoricalGoalFeeCodec(identity),
    keys = codec.storageKeys();
  let id = 0;
  const rpc = (method: string, params: unknown[], result: unknown): AccumulationRpcReceipt => {
    const n = ++id,
      responseBody = JSON.stringify({ jsonrpc: '2.0', id: n, result });
    return {
      endpoint,
      requestBody: JSON.stringify({ jsonrpc: '2.0', id: n, method, params }),
      responseBody,
      responseSha256: sha(responseBody),
      requestedAtMs: n * 10,
      completedAtMs: n * 10 + 1,
      httpStatus: 200,
      failure: null,
    };
  };
  const header = (n: number) => ({
    number: `0x${n.toString(16)}`,
    parentHash: hash(n - 1),
    stateRoot: hash(900),
    extrinsicsRoot: hash(901),
    digest: { logs: [] },
  });
  const version = { specName: 'sora-substrate', ...identity.runtimeVersion };
  const contextRpc = [
    rpc('chain_getBlockHash', [0], GENESIS),
    rpc('chain_getBlockHash', [110], hash(110)),
    rpc('chain_getFinalizedHead', [], hash(120)),
    rpc('chain_getHeader', [hash(120)], header(120)),
    rpc('chain_getHeader', [hash(110)], header(110)),
    rpc('chain_getBlockHash', [100], hash(100)),
    rpc('chain_getHeader', [hash(100)], header(100)),
    rpc('chain_getBlockHash', [99], hash(99)),
    rpc('chain_getHeader', [hash(99)], header(99)),
    rpc('state_getRuntimeVersion', [hash(100)], version),
    rpc('state_getRuntimeVersion', [hash(99)], version),
    rpc('state_getMetadata', [hash(100)], identity.metadataHex),
    rpc('state_getMetadata', [hash(99)], identity.metadataHex),
    rpc('state_getStorageHash', ['0x3a636f6465', hash(100)], hash(902)),
    rpc(
      'state_queryStorageAt',
      [Object.values(keys), hash(100)],
      [
        {
          block: hash(100),
          changes: Object.entries(keys).map(([name, key]) => [
            key,
            synthetic.proof[name as keyof typeof synthetic.proof],
          ]),
        },
      ]
    ),
  ];
  const row = (symbol: string) => ({
    timestamp: H / 1000 - 1,
    denominator,
    closeEvidence: {
      kind: 'finalized-hour-close',
      genesisHash: GENESIS,
      completedAt: H / 1000,
      timestamp: H / 1000 - 1,
      symbol,
      requestedSymbol: symbol,
      decimals: 18,
      blockHeight: 99,
      blockHash: hash(99),
      nextBlockHeight: 100,
      nextBlockHash: hash(100),
      nextTimestamp: H / 1000 + 1,
      xorPool:
        symbol === 'XOR'
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: String(1000n * UNIT),
              targetAssetReserves: String(2000n * UNIT),
            },
    },
  });
  const closeRowsJson = JSON.stringify({ [KUSD]: [row('KUSD')], [XOR]: [row('XOR')] });
  const candidates = Array.from({ length: 9 }, (_, i) => {
    const amount = String(BigInt(i + 1) * UNIT),
      quoted = { amount, amount_without_impact: amount, fee: { [XOR]: '10' }, route: [KUSD, XOR], rewards: [] };
    const envelope = fee.buildBoundSwapEnvelope(
      { assetIn: KUSD, assetOut: XOR, amountInCodec: amount, quotedAmountOutCodec: amount },
      { blockNumber: 100 }
    );
    const info = hex(
      synthetic.registry.createType('RuntimeDispatchInfo', { weight: 3, class: 'Normal', partialFee: '6' }).toU8a()
    );
    return {
      inputKusd: i + 1,
      quoteReceivedAtMs: H + 2200,
      feeReceivedAtMs: H + 2500,
      expiresAtMs: H + 6000,
      rpc: [
        rpc(
          'liquidityProxy_quote',
          [0, KUSD, XOR, amount, 'WithDesiredInput', ['XYKPool'], 'AllowSelected', hash(100)],
          quoted
        ),
        rpc('state_call', ['TransactionPaymentApi_query_info', envelope.feeQueryDataHex, hash(100)], info),
        rpc(
          'state_call',
          ['TransactionPaymentApi_query_fee_details', envelope.feeQueryDataHex, hash(100)],
          feeBytes(1, 2, 3)
        ),
      ],
    };
  });
  const packet = {
    block: { hash: hash(100), height: 100 },
    contextReceivedAtMs: H + 2100,
    decisionAtMs: H + 3000,
    contextRpc,
    closeRowsJson,
    candidates,
  };
  const trusted: AccumulationTrustedSource = {
    packetSha256: accumulationEvidenceDigest(packet),
    sourceRegistrationSha256: 'a'.repeat(64),
    endpoint,
    finalizedSource: { hash: hash(110), height: 110 },
    metadataSha256: sha(Buffer.from(identity.metadataHex.slice(2), 'hex')),
    codeHash: hash(902),
    runtimeVersion: identity.runtimeVersion,
    denominator,
    completedClose: {
      timestampMs: H,
      availableAtMs: H + 2000,
      rawRowsSha256: sha(closeRowsJson),
      sourceReceiptSha256: 'b'.repeat(64),
    },
  };
  return { packet, trusted, synthetic, fee, rpc };
}
