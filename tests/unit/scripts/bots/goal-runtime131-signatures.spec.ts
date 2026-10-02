/** Exact installed WASM only, all fixture state invented, execution isolated under OS network denial. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  registry131,
  receiptFixture131,
  verifyCase131,
  verifyDirectory131,
  type SyntheticSignatureCase,
} from '../../../../output/go-history/goal-runtime131-signatures-20260921/verify.mts';
import { readGoalFinalizedReceipt } from '@/features/bot-trading/goal-receipt';
import { captureGoalSigningPayload, retainGoalSignedMortality } from '@/features/bot-trading/goal-mortality';
import { GOAL_EXACT_POLICY } from '@/features/bot-trading/goal-exact-ledger';

const require = createRequire(import.meta.url);
const base = resolve('output/go-history/goal-runtime131-signatures-20260921');
const old = resolve('output/go-history/goal-runtime-wasm-offline-20260921');
const available =
  process.platform === 'darwin' &&
  existsSync('/usr/bin/sandbox-exec') &&
  existsSync(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );
let directory = '',
  metadataHex = '';
const read = async (name: string) => JSON.parse(await readFile(join(directory, name + '.json'), 'utf8'));
const record = async (id: string): Promise<SyntheticSignatureCase> => read(id);

describe.skipIf(!available)('runtime131 actual signatures and browser consumer conformance', () => {
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'runtime131-signatures-'));
    execFileSync(
      '/usr/bin/sandbox-exec',
      ['-f', join(old, 'network-deny.sb'), process.execPath, join(base, 'run.cjs'), directory],
      { encoding: 'utf8', timeout: 45000 }
    );
    metadataHex = (await read('metadata')).metadataHex;
  }, 50000);
  afterAll(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('executes the exact pinned131 binary under OS network denial without granting any live authority', async () => {
    expect(await read('result')).toMatchObject({
      complete: true,
      dispatchCalls: 12,
      feeCalls: 12,
      networkDenial: { code: 'EPERM', networkPacketsSent: 0 },
      remoteStateReads: 0,
      walletCalls: 0,
      networkSubmissions: 0,
      runtimeAdmissionGranted: false,
      economicQualificationGranted: false,
    });
    expect((await read('metadata')).binding.metadataSha256).toBe(
      '18aedaf96860e55c96ac6ad1d26f77cb2dc877ea822edf3242fdbe4f58bdd824'
    );
    const protocol = await read('protocol');
    for (const [path, sha] of Object.entries(protocol.sourceHashes))
      expect(
        createHash('sha256')
          .update(await readFile(resolve(path)))
          .digest('hex')
      ).toBe(sha);
  });

  it('verifies real Sr25519 and ECDSA, all compact nonce widths, era phase wrap and exact persisted reload', async () => {
    for (const id of [
      'sr63-phase63-buy',
      'sr64-phase63-sell',
      'sr16384-four-byte',
      'sr1073741824-five-byte',
      'ecdsa-largest-width',
    ]) {
      const value = await record(id),
        result = await verifyCase131(value, metadataHex);
      expect(result).toMatchObject({
        signatureVerified: true,
        applied: true,
        mortality: {
          birthBlockNumber: 191,
          deathBlockNumber: 255,
          nonceCodec: String(value.vector.nonce),
          signatureType: value.vector.type,
          signatureVerified: true,
          checkpointCanonicality: 'not-yet-checked',
        },
        envelope: { maximumEncodedLength: 215, signatureVerified: false, feeAdequacyVerified: false },
        receipt: { success: true, outputCodec: value.summary.output, actualFeeCodec: value.summary.nativeFee },
      });
    }
    expect((await record('ecdsa-largest-width')).encodedLength).toBe(215);
    expect((await record('sr1073741824-five-byte')).encodedLength).toBe(214);
  }, 30000);

  it('joins actual included-failure events to fee-only receipt effects, with original u128 maximum minimum preserved', async () => {
    const value = await record('sr-included-failure');
    expect(value.minimum).toBe(((1n << 128n) - 1n).toString());
    expect(await verifyCase131(value, metadataHex)).toMatchObject({
      applied: true,
      receipt: {
        success: false,
        outputCodec: '0',
        actualFeeCodec: value.summary.nativeFee,
      },
    });
    expect(BigInt(value.summary.nativeFee)).toBeGreaterThan(0n);
  });

  it('rejects corrupted real signatures in both runtime and browser mortality verification', async () => {
    for (const id of ['sr-bad-signature', 'ecdsa-bad-signature']) {
      const value = await record(id);
      expect(value.summary).toMatchObject({ applied: false, nativeFee: '0', output: '0' });
      expect(await verifyCase131(value, metadataHex)).toMatchObject({ invalidSignatureRejected: true, applied: false });
    }
  });

  it('does not turn valid-but-stale, wrong-checkpoint or expired signatures into included receipts', async () => {
    for (const id of ['sr-stale-nonce', 'sr-wrong-checkpoint', 'sr-expired-era']) {
      const result = await verifyCase131(await record(id), metadataHex);
      expect(result).toMatchObject({ signatureVerified: true, applied: false, absentInclusionEffectsRejected: true });
    }
    const stale = await read('sr-stale-nonce');
    expect(stale.actual.writes).toHaveLength(1);
    expect(stale.summary.before).toEqual(stale.summary.after);
    expect(stale.summary.eventCount).toBe(0);
  });

  it('rejects a130-version payload on exact131 and a different checkpoint with the same phase', async () => {
    expect(await verifyCase131(await record('sr-wrong-runtime'), metadataHex)).toMatchObject({
      runtimePayloadRejected: true,
    });
    const value = await record('sr64-phase63-sell'),
      f = receiptFixture131(value, metadataHex);
    const input = {
      metadataHex,
      account: value.address,
      genesisHash: GOAL_EXACT_POLICY.genesisHash,
      callHex: value.payload.method,
      runtimeVersion: { specVersion: 131, transactionVersion: 131 },
      payload: {
        ...value.payload,
        blockNumber: '0x000000ff' as const,
        blockHash: `0x${'44'.repeat(32)}` as `0x${string}`,
      },
    };
    expect(retainGoalSignedMortality(captureGoalSigningPayload(input), f.signed)).toBe(false);
  });

  it('rejects wrong order direction, duplicate actual fee events and missing fee in actual runtime event bytes', async () => {
    const value = await record('sr63-phase63-buy');
    const options = (f: ReturnType<typeof receiptFixture131>) => ({
      client: f.client,
      isCurrent: () => true,
      now: () => 1000,
      order: f.order,
      blockHash: f.blockHash,
    });
    const wrong = receiptFixture131(value, metadataHex);
    [wrong.order.inputAsset, wrong.order.outputAsset] = [wrong.order.outputAsset, wrong.order.inputAsset];
    await expect(readGoalFinalizedReceipt(options(wrong))).rejects.toThrow();
    const duplicate = receiptFixture131(value, metadataHex);
    const fee = [...duplicate.events].find((e) => e.event.section === 'xorFee' && e.event.method === 'FeeWithdrawn')!;
    duplicate.events.push(fee);
    await expect(readGoalFinalizedReceipt(options(duplicate))).rejects.toThrow();
    const missing = receiptFixture131(value, metadataHex);
    missing.events.splice(
      missing.events.findIndex((e) => e.event.section === 'xorFee' && e.event.method === 'FeeWithdrawn'),
      1
    );
    await expect(readGoalFinalizedReceipt(options(missing))).rejects.toThrow();
  });

  it('writes only a no-clobber exact-byte verification receipt and rejects changed metadata', async () => {
    const destination = join(directory, 'verified.json');
    const verified = await verifyDirectory131(directory, destination);
    expect(verified.vectors).toHaveLength(12);
    expect(verified).toMatchObject({
      realFinalityProven: false,
      runtimeAdmissionGranted: false,
      productionFeeCeilingProven: false,
    });
    await expect(verifyDirectory131(directory, destination)).rejects.toThrow(/EEXIST/);
    expect(() => registry131(metadataHex.slice(0, -2) + '00')).toThrow('exact-131-metadata');
  }, 30000);
});

describe('additional crypto host scope', () => {
  it('retains original strict state/export boundary and refuses unknown fixture vectors', () => {
    const host = require(join(base, 'runtime-signatures.cjs'));
    expect(() => host.invokeSynthetic({}, 'OffchainWorkerApi_offchain_worker')).toThrow('unapproved-export');
    expect(() =>
      require(join(base, 'fixture.cjs')).signedFixture({}, {}, { type: 'sr25519' }, GOAL_EXACT_POLICY.genesisHash)
    ).toThrow('undeclared-vector');
  });
});
