/** Join exact runtime synthetic bytes to unchanged browser signing, fee and receipt code. Never proves finality. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Metadata, TypeRegistry } from '@polkadot/types';
import { blake2AsHex, cryptoWaitReady } from '@polkadot/util-crypto';
import { hexToU8a } from '@polkadot/util';
import type { Extrinsic, EventRecord } from '@polkadot/types/interfaces';
import type { Vec } from '@polkadot/types-codec';
import type { SignerPayloadJSON } from '@polkadot/types/types';
import { types } from '../../../../../src/lib/substrate/type-definitions/index.ts';
import { createHistoricalGoalFeeCodec } from '../../../../../src/features/bot-trading/execution-codecs/fee.ts';
import {
  captureGoalSigningPayload,
  goalRawSigningPayload,
  retainGoalSignedMortality,
  readGoalSignedMortality,
  exportGoalPersistedSigning,
  verifyGoalPersistedSigning,
} from '../../../../../src/features/bot-trading/goal-mortality.ts';
import {
  readGoalFinalizedReceipt,
  goalSignedEnvelopeDigest,
  type GoalReceiptClient,
  type GoalReceiptEvent,
} from '../../../../../src/features/bot-trading/goal-receipt.ts';
import {
  GOAL_EXECUTION_PROTOCOL,
  type GoalExecutionOrder,
} from '../../../../../src/features/bot-trading/goal-execution-types.ts';
import {
  GOAL_EXACT_POLICY,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
} from '../../../../../src/features/bot-trading/goal-exact-ledger.ts';

export interface SyntheticSignatureCase {
  vector: { id: string; type: 'sr25519' | 'ecdsa'; nonce: number; reverse: boolean; mode?: string };
  payer: string;
  address: string;
  payload: SignerPayloadJSON;
  payloadHex: string;
  extrinsicHex: string;
  encodedLength: number;
  minimum: string;
  summary: { applied: boolean; success: boolean; nativeFee: string; output: string; eventHex: string };
}
const SHA131 = '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const hex = (value: string) => ({ toHex: () => value });
/** Load only hash-pinned actual 131 metadata; these keys/payloads remain artificial. */
export function registry131(metadataHex: string) {
  assert.equal(hash(hexToU8a(metadataHex)), SHA131, 'exact-131-metadata');
  const registry = new TypeRegistry();
  registry.register(types);
  registry.setMetadata(new Metadata(registry, metadataHex as `0x${string}`), undefined, undefined, true);
  return registry;
}
/** Actual events and extrinsic, with an explicitly mocked finalized block transport; no network API is called. */
export function receiptFixture131(record: SyntheticSignatureCase, metadataHex: string) {
  const registry = registry131(metadataHex);
  const signed = registry.createType<Extrinsic>('Extrinsic', record.extrinsicHex);
  assert.equal(signed.toHex(), record.extrinsicHex, 'signed-full-consumption');
  const events = registry.createType<Vec<EventRecord>>('Vec<EventRecord>', record.summary.eventHex);
  assert.equal(events.toHex(), record.summary.eventHex, 'event-full-consumption');
  const blockHash = '0x' + '55'.repeat(32);
  const header = { hash: hex(blockHash), number: { toNumber: () => 192 } };
  const listeners = new Set<() => void>();
  const client: GoalReceiptClient = {
    isConnected: true,
    genesisHash: hex(GOAL_EXACT_POLICY.genesisHash),
    runtimeVersion: hex('0x8300000083000000'),
    runtimeMetadata: registry.metadata,
    on: (_event, listener) => listeners.add(listener),
    off: (_event, listener) => listeners.delete(listener),
    rpc: {
      chain: {
        getFinalizedHead: async () => hex(blockHash),
        getHeader: async () => header,
        getBlockHash: async () => hex(blockHash),
        getBlock: async () => ({ block: { header, extrinsics: [signed] } }),
      },
    },
    at: async () => ({ query: { system: { events: async () => events as unknown as ArrayLike<GoalReceiptEvent> } } }),
  };
  const order: GoalExecutionOrder = {
    id: 'synthetic-' + record.vector.id,
    botId: 'synthetic-bot',
    account: record.address,
    network: GOAL_EXACT_POLICY.genesisHash,
    intentId: 'synthetic-intent',
    status: 'submitted',
    inputAsset: record.vector.reverse ? XOR : KUSD,
    outputAsset: record.vector.reverse ? KUSD : XOR,
    inputCodec: record.vector.reverse ? '1000000000000000000' : '5000000000000000000',
    minOutputCodec: record.minimum,
    feeAsset: XOR,
    feeCodec: '1',
    createdAt: 1000,
    txHash: signed.hash.toHex(),
    signedAtBlock: 191,
    goalExecution: {
      protocol: GOAL_EXECUTION_PROTOCOL,
      execution: { protocol: 'finalized-xyk-native-fee-v1', expectedDenominator: '1' },
      goalId: 'synthetic-goal',
      consentDigest: 'a'.repeat(64),
      qualificationDigest: 'b'.repeat(64),
      policyDigest: 'c'.repeat(64),
      ledgerRevision: 1,
      controlRevision: 1,
      ledgerStateSha256: 'd'.repeat(64),
      quoteDigest: 'e'.repeat(64),
      envelopeDigest: 'f'.repeat(64),
      feePolicyDigest: '0'.repeat(64),
      orderRevision: 2,
      phase: 'submitted',
      signedEnvelopeDigest: goalSignedEnvelopeDigest(record.extrinsicHex),
    },
  };
  return { registry, signed, events, client, order, blockHash, listeners };
}
/** Verify exact signature binding and persisted reload, then parse the actual runtime's success/failure effects. */
export async function verifyCase131(record: SyntheticSignatureCase, metadataHex: string) {
  await cryptoWaitReady();
  const f = receiptFixture131(record, metadataHex);
  const input = {
    metadataHex,
    account: record.address,
    genesisHash: GOAL_EXACT_POLICY.genesisHash,
    callHex: record.payload.method,
    runtimeVersion: { specVersion: 131, transactionVersion: 131 },
    payload: record.payload,
  };
  if (record.vector.mode === 'wrong-runtime') {
    assert.throws(() => captureGoalSigningPayload(input), /bots.errors.intent/);
    return { id: record.vector.id, runtimePayloadRejected: true, applied: false };
  }
  const capture = captureGoalSigningPayload(input);
  assert.equal(goalRawSigningPayload(capture), record.payloadHex, 'actual-signed-payload');
  const valid = retainGoalSignedMortality(capture, f.signed);
  assert.equal(valid, record.vector.mode !== 'bad-signature', 'signature-verification');
  if (!valid) {
    assert.equal(readGoalSignedMortality(f.signed), undefined);
    assert.equal(exportGoalPersistedSigning(f.signed), undefined);
    return { id: record.vector.id, invalidSignatureRejected: true, applied: false };
  }
  const mortality = readGoalSignedMortality(f.signed)!;
  assert.equal(mortality.birthBlockNumber, 191);
  assert.equal(mortality.deathBlockNumber, 255);
  assert.equal(mortality.nonceCodec, String(record.vector.nonce));
  assert.equal(mortality.signatureType, record.vector.type);
  assert.equal(mortality.checkpointCanonicality, 'not-yet-checked');
  const persisted = exportGoalPersistedSigning(f.signed)!;
  assert.deepEqual(
    verifyGoalPersistedSigning(persisted, {
      account: record.address,
      network: GOAL_EXACT_POLICY.genesisHash,
      txHash: mortality.txHash,
      signedEnvelopeDigest: mortality.signedEnvelopeDigest,
    }),
    mortality,
    'reload-reverification'
  );
  const feeCodec = createHistoricalGoalFeeCodec({
    metadataHex,
    genesisHash: GOAL_EXACT_POLICY.genesisHash,
    blockHash: record.payload.blockHash,
    runtimeVersion: { specVersion: 131, transactionVersion: 131 },
  });
  // Invented quote-derived minimum for structural inspection only; this is not liquidity/price evidence.
  const quotedAmountOutCodec = ((BigInt(record.minimum) * 10000n + 9949n) / 9950n).toString();
  let envelope;
  if (BigInt(quotedAmountOutCodec) <= (1n << 128n) - 1n) {
    envelope = feeCodec.inspectSwapEnvelope(
      {
        assetIn: f.order.inputAsset,
        assetOut: f.order.outputAsset,
        amountInCodec: f.order.inputCodec,
        quotedAmountOutCodec,
      },
      { blockNumber: 191 },
      record.extrinsicHex
    );
    assert.equal(envelope.encodedLength, record.encodedLength);
    assert.equal(envelope.maximumEncodedLength, 215);
  }
  if (!record.summary.applied) {
    await assert.rejects(
      readGoalFinalizedReceipt({
        client: f.client,
        isCurrent: () => true,
        now: () => 1000,
        order: f.order,
        blockHash: f.blockHash,
      })
    );
    assert.equal(f.listeners.size, 0);
    return {
      id: record.vector.id,
      signatureVerified: true,
      applied: false,
      absentInclusionEffectsRejected: true,
      mortality,
      envelope,
    };
  }
  const receipt = await readGoalFinalizedReceipt({
    client: f.client,
    isCurrent: () => true,
    now: () => 1000,
    order: f.order,
    blockHash: f.blockHash,
  });
  assert.equal(f.listeners.size, 0);
  assert.equal(receipt.success, record.summary.success);
  assert.equal(receipt.actualFeeCodec, record.summary.nativeFee);
  assert.equal(receipt.outputCodec, record.summary.output);
  assert.equal(receipt.txHash, blake2AsHex(hexToU8a(record.extrinsicHex), 256));
  assert.equal(receipt.blockNumber, 192);
  assert.equal(receipt.extrinsicIndex, 0);
  return {
    id: record.vector.id,
    signatureVerified: true,
    applied: true,
    mortality,
    envelope,
    receipt,
    finalitySource: 'mocked synthetic transport; no chain attestation',
  };
}
/** Reverify one completed synthetic invocation and save a separate no-clobber consumer receipt. */
export async function verifyDirectory131(directory: string, destination: string) {
  const inputs: Record<string, { bytes: number; sha256: string }> = {};
  const read = (name: string) => {
    assert(/^[a-z0-9-]+\.json$/.test(name));
    const bytes = readFileSync(join(directory, name));
    assert(bytes.length < 8 * 1024 * 1024);
    inputs[name] = { bytes: bytes.length, sha256: hash(bytes) };
    return JSON.parse(bytes.toString('utf8'));
  };
  const sourcePaths = [
    'tests/fixtures/bots/runtime-tools/goal-runtime131-signatures-20260921/verify.mts',
    'src/features/bot-trading/goal-mortality.ts',
    'src/features/bot-trading/goal-signing-record.ts',
    'src/features/bot-trading/goal-receipt.ts',
    'src/features/bot-trading/goal-execution-types.ts',
    'src/features/bot-trading/goal-exact-ledger.ts',
    'src/features/bot-trading/execution-codecs/fee.ts',
    'src/features/bot-trading/execution-codecs/execution.ts',
    'src/features/agent-trading/intent.ts',
    'src/lib/substrate/type-definitions/index.ts',
  ];
  for (const name of readdirSync(join(root, 'src/lib/substrate/type-definitions')))
    if (name.endsWith('.ts')) sourcePaths.push('src/lib/substrate/type-definitions/' + name);
  const sourceHashes = Object.fromEntries(sourcePaths.map((p) => [p, hash(readFileSync(join(root, p)))]));
  const result = read('result.json');
  assert.equal(result.complete, true);
  assert.equal(result.runtimeAdmissionGranted, false);
  assert.equal(result.economicQualificationGranted, false);
  assert.equal(result.networkDenial.code, 'EPERM');
  for (const [name, expected] of Object.entries(result.files)) {
    read(name);
    assert.deepEqual(inputs[name], expected, 'retained-bytes:' + name);
  }
  const protocol = read('protocol.json');
  for (const [path, expected] of Object.entries(protocol.sourceHashes))
    assert.equal(hash(readFileSync(join(root, path))), expected, 'changed-source:' + path);
  const metadataHex = read('metadata.json').metadataHex;
  const vectors: Awaited<ReturnType<typeof verifyCase131>>[] = [];
  for (const vector of protocol.cases) vectors.push(await verifyCase131(read(vector.id + '.json'), metadataHex));
  for (const [path, expected] of Object.entries(sourceHashes))
    assert.equal(hash(readFileSync(join(root, path))), expected, 'changed-consumer-source:' + path);
  const report = {
    protocol: 'runtime131-browser-consumer-conformance-v1',
    complete: true,
    createdAt: new Date().toISOString(),
    inputs,
    sourceHashes,
    metadataSha256: SHA131,
    vectors,
    runtimeAdmissionGranted: false,
    economicQualificationGranted: false,
    realFinalityProven: false,
    productionFeeCeilingProven: false,
    liveWalletCalls: 0,
    networkSubmissions: 0,
  };
  writeFileSync(destination, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifyDirectory131(resolve(process.argv[2]), resolve(process.argv[3]));
  console.log(
    JSON.stringify({ complete: result.complete, vectors: result.vectors.length, runtimeAdmissionGranted: false })
  );
}
