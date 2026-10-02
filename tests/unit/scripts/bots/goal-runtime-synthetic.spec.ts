import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { TypeRegistry } from '@polkadot/types';

const require = createRequire(import.meta.url);
const base = resolve('output/go-history/goal-runtime-wasm-offline-20260921');
const host = require(join(base, 'runtime-synthetic.cjs'));
const fixture = require(join(base, 'fixture.cjs'));
const available =
  process.platform === 'darwin' &&
  existsSync('/usr/bin/sandbox-exec') &&
  ['4.8.8', '4.8.9'].every((version) =>
    existsSync(
      `/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-${version}/framenode-runtime-${version}.compact.compressed.wasm`
    )
  );
let output = '';
const json = async (name: string) => JSON.parse(await readFile(join(output, name), 'utf8'));

describe.skipIf(!available)('exact runtime synthetic execution under OS network denial', () => {
  beforeAll(async () => {
    output = await mkdtemp(join(tmpdir(), 'goal-runtime-synthetic-'));
    execFileSync(
      '/usr/bin/sandbox-exec',
      ['-f', join(base, 'network-deny.sb'), process.execPath, join(base, 'run-synthetic.cjs'), output],
      { encoding: 'utf8', timeout: 40000 }
    );
  }, 45000);
  afterAll(async () => {
    if (output) await rm(output, { recursive: true, force: true });
  });

  it('compares actual exports from both exact binaries without granting live admission', async () => {
    expect(await json('result.json')).toMatchObject({
      complete: true,
      finiteRouteCasesMatched: true,
      quoteCalls: 4,
      dispatchCalls: 12,
      feeMethodCalls: 8,
      networkDenial: { code: 'EPERM', syscall: 'connect', networkPacketsSent: 0 },
      realTestSignaturesVerified: true,
      invalidTestSignaturesRejected: true,
      remoteStateReads: 0,
      walletCalls: 0,
      networkExtrinsicSubmissions: 0,
      productionFeeCeilingProven: false,
      economicQualificationGranted: false,
      runtimeAdmissionGranted: false,
    });
    const protocol = await json('protocol.json');
    for (const [name, expected] of Object.entries(protocol.sourceHashes))
      expect(
        createHash('sha256')
          .update(await readFile(join(base, name)))
          .digest('hex')
      ).toBe(expected);
  });
  it('obtains full metadata from each actual WASM export with its independently pinned profile hash', async () => {
    for (const version of [130, 131]) {
      const record = await json(`metadata-${version}.json`);
      const bytes = Buffer.from(record.actualExport.resultHex.slice(2), 'hex');
      const opaque = new TypeRegistry().createType('Bytes', bytes);
      expect(Buffer.from(opaque.toU8a())).toEqual(bytes);
      expect(
        createHash('sha256')
          .update(Buffer.from(opaque.toHex().slice(2), 'hex'))
          .digest('hex')
      ).toBe(record.binding.metadataSha256);
      expect(record.core.decoded.specVersion).toBe(version);
      expect(record.actualExport.hostCalls).toEqual([{ name: 'ext_logging_max_level_version_1' }]);
    }
  });
  it('uses real account reserves for exact fixed-lot quotes in both directions', async () => {
    for (const version of [130, 131]) {
      const f = await json(`quote-fixture-${version}.json`);
      expect(f.declarations.some((d: { item: string }) => d.item === 'Reserves')).toBe(false);
      for (const [label, amount, fee] of [
        ['kusd-xor', '496751624187906046', '2998500749625188'],
        ['xor-kusd', '9930129451325382569', '6000000000000000'],
      ]) {
        const quote = await json(`quote-${version}-${label}.json`);
        expect(quote.quote.amount).toBe(amount);
        expect(quote.quote.fees[0].amount).toBe(fee);
        expect(quote.actualExport.postState).toEqual(f.state);
        expect(
          quote.actualExport.hostCalls
            .filter((c: { name: string }) => c.name.startsWith('ext_storage_'))
            .every((c: { declared?: boolean; declaredEmptyPrefix?: boolean }) => c.declared || c.declaredEmptyPrefix)
        ).toBe(true);
      }
    }
  });
  it('charges the native synthetic fee, agrees across fee methods and preserves balance conservation on success', async () => {
    for (const version of [130, 131])
      for (const label of ['kusd-xor', 'xor-kusd']) {
        const record = await json(`dispatch-${version}-${label}-success.json`);
        expect(record.summary).toMatchObject({
          applied: true,
          dispatchSuccess: true,
          nativeFee: '721000000000000',
          rollbackCount: 0,
        });
        const { before, after } = record.summary;
        expect(BigInt(after.xorIssuance)).toBe(BigInt(before.xorIssuance) - BigInt(record.summary.nativeFee));
        expect(BigInt(after.payerXor) + BigInt(after.poolXor) + BigInt(after.feeXor)).toBe(BigInt(after.xorIssuance));
        expect(BigInt(after.payerKusd) + BigInt(after.poolKusd)).toBe(BigInt(after.kusdIssuance));
        const { partialFee, baseFee, lenFee, adjustedWeightFee } = record.feeMethods.decoded;
        expect(BigInt(partialFee)).toBe(BigInt(baseFee) + BigInt(lenFee) + BigInt(adjustedWeightFee));
        expect(BigInt(partialFee)).toBeGreaterThanOrEqual(BigInt(record.summary.nativeFee));
        expect(record.summary.events.filter((e: { method: string }) => e.method === 'Exchange')).toHaveLength(1);
      }
  });
  it('fails exactly one codec above the quote, rolls back pool transfers, but retains actual nonce and native fee', async () => {
    for (const version of [130, 131])
      for (const label of ['kusd-xor', 'xor-kusd']) {
        const quote = await json(`quote-${version}-${label}.json`),
          record = await json(`dispatch-${version}-${label}-minimum-failure.json`);
        expect(BigInt(record.minimum)).toBe(BigInt(quote.quote.amount) + 1n);
        expect(record.summary).toMatchObject({
          applied: true,
          dispatchSuccess: false,
          nativeFee: '721000000000000',
          rollbackCount: 2,
        });
        for (const key of ['payerKusd', 'poolXor', 'poolKusd', 'feeXor'])
          expect(record.summary.after[key]).toBe(record.summary.before[key]);
        expect(record.summary.after.payerNonce).toBe('1');
        expect(record.summary.events.some((e: { method: string }) => e.method === 'Exchange')).toBe(false);
        expect(record.summary.events.some((e: { method: string }) => e.method === 'ExtrinsicFailed')).toBe(true);
      }
  });
  it('verifies real Ed25519 signatures and rejects corrupted signatures with no storage or fee effects', async () => {
    for (const version of [130, 131])
      for (const label of ['kusd-xor', 'xor-kusd']) {
        const good = await json(`dispatch-${version}-${label}-success.json`),
          bad = await json(`dispatch-${version}-${label}-bad-signature.json`);
        expect(
          good.actualExport.hostCalls.find((c: { name: string }) => c.name === 'ext_crypto_ed25519_verify_version_1')
            .valid
        ).toBe(true);
        expect(
          bad.actualExport.hostCalls.find((c: { name: string }) => c.name === 'ext_crypto_ed25519_verify_version_1')
            .valid
        ).toBe(false);
        expect(bad.summary).toMatchObject({ applied: false, dispatchSuccess: false, nativeFee: '0', eventCount: 0 });
        expect(bad.actualExport.postState).toEqual(bad.declaredState);
        expect(bad.actualExport.writes).toEqual([]);
      }
  });
  it('does not silently infer absent keys or undeclared empty storage prefixes', async () => {
    for (const version of [130, 131]) {
      const controls = await json(`negative-controls-${version}.json`);
      expect(controls.unknown.success).toBe(false);
      expect(controls.unknown.error).toMatch(/^undeclared-storage:/);
      expect(controls.scan.success).toBe(false);
      expect(controls.scan.error).toMatch(/^undeclared-prefix:/);
    }
  });
  it('rejects trailing, missing and wrong-direction quote bytes', async () => {
    const result = await json('quote-130-kusd-xor.json');
    expect(fixture.decodeQuote(result.actualExport.resultHex)).toEqual(result.quote);
    expect(() => fixture.decodeQuote(result.actualExport.resultHex + '00')).toThrow('quote-trailing');
    expect(() => fixture.decodeQuote('0x00')).toThrow('quote-not-some');
    expect(() => fixture.decodeQuote(result.actualExport.resultHex, true)).toThrow();
    expect(() => fixture.decodeQuote('0x01')).toThrow('quote-truncated');
  });
});

describe('synthetic host input boundary', () => {
  it('rejects arbitrary export names and state accessors before WASM execution', () => {
    expect(() => host.invokeSynthetic({}, 'OffchainWorkerApi_offchain_worker')).toThrow('unapproved-export');
    const getter = vi.fn(() => '0x00');
    expect(() =>
      host.invokeSynthetic({}, 'Core_version', Buffer.alloc(0), {
        get '0x00'() {
          return getter();
        },
      })
    ).toThrow('declared-key');
    expect(getter).not.toHaveBeenCalled();
    expect(() => fixture.loadMetadata({ version: 130 })).toThrow('profile');
  });
});
