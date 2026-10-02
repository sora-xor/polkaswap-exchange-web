import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { TypeRegistry } from '@polkadot/types';
import { types } from '@/lib/substrate/type-definitions';
const require = createRequire(import.meta.url);
const host = require('../../../../output/go-history/goal-runtime-wasm-offline-20260921/runtime-host.cjs');
const base = resolve('output/go-history/goal-runtime-wasm-offline-20260921');
const paths: string[] = [];
afterEach(async () => {
  await Promise.all(paths.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

describe('strict offline runtime readiness', () => {
  it('executes both Core_version exports only after OS connect denial, then traps instead of inventing fixture state', async () => {
    const output = await mkdtemp(join(tmpdir(), 'offline-wasm-'));
    paths.push(output);
    const stdout = execFileSync(
      '/usr/bin/sandbox-exec',
      ['-f', join(base, 'network-deny.sb'), process.execPath, join(base, 'run.cjs'), output],
      { encoding: 'utf8', timeout: 15000 }
    );
    const result = JSON.parse(stdout);
    expect(result).toMatchObject({
      complete: true,
      runtimeVersions: [130, 131],
      coreVersionExportExecuted: true,
      customSectionUsedInstead: false,
      remoteStateReads: 0,
      walletCalls: 0,
      transactionSubmissions: 0,
      fixtureReady: false,
      economicEquivalence: false,
      runtimeAdmissionGranted: false,
      networkDenial: { code: 'EPERM', syscall: 'connect', networkPacketsSent: 0 },
    });
    for (const version of [130, 131]) {
      const record = JSON.parse(await readFile(join(output, `runtime-${version}.json`), 'utf8'));
      expect(record.core).toMatchObject({
        success: true,
        api: 'Core_version',
        decoded: { specVersion: version, transactionVersion: version },
      });
      expect(record.core.hostCalls.map((call: { name: string }) => call.name)).toEqual([
        'ext_logging_max_level_version_1',
        'ext_allocator_malloc_version_1',
      ]);
      expect(record.quoteBoundary.success).toBe(false);
      expect(record.quoteBoundary.error).toBe('unsupported-host:ext_storage_get_version_1');
      expect(record.quoteBoundary.hostCalls.at(-1).keyHex).toBe(
        '0xa1bd2c8b755a708aa525cd47c8e225fd49e90400771bdeb88bf8ecd95a3c447db4def25cfda6ef3a00000000'
      );
    }
    expect(() =>
      execFileSync(
        '/usr/bin/sandbox-exec',
        ['-f', join(base, 'network-deny.sb'), process.execPath, join(base, 'run.cjs'), output],
        { encoding: 'utf8', timeout: 15000, stdio: 'pipe' }
      )
    ).toThrow();
  });
  it('rejects a changed binary before decompression and unsupported profiles before file access', async () => {
    const output = await mkdtemp(join(tmpdir(), 'offline-wasm-invalid-'));
    paths.push(output);
    const file = join(output, 'changed.wasm');
    await writeFile(file, Buffer.from('wrong'));
    expect(() => host.loadBinary(host.PROFILES[0], file)).toThrow('binary-hash');
    expect(() => host.loadBinary({ ...host.PROFILES[0] }, 'missing')).toThrow('unsupported-profile');
  });
  it('does not expose a transaction-submission or arbitrary runtime call lane', () => {
    expect(() => host.invoke({}, 'BlockBuilder_apply_extrinsic')).toThrow('unapproved-export');
    expect(() => host.invoke({}, 'OffchainWorkerApi_offchain_worker')).toThrow('unapproved-export');
  });
  it.each([false, true])('encodes the fixed API-v3 quote shape for reverse=%s without economic input', (reverse) => {
    const registry = new TypeRegistry();
    registry.register(types);
    const input = host.quoteInput(reverse);
    const decoded = registry.createType(
      '(u32,AssetId,AssetId,u128,SwapVariant,Vec<LiquiditySourceType>,FilterMode)',
      input
    );
    expect(Buffer.from(decoded.toU8a())).toEqual(input);
    const values = decoded.toJSON() as unknown[];
    expect(values[0]).toBe(0);
    expect(BigInt(String(values[3]))).toBe(reverse ? 1000000000000000000n : 5000000000000000000n);
    expect(values.slice(4)).toEqual(['WithDesiredInput', ['XYKPool'], 'AllowSelected']);
    expect(() => host.quoteInput('true')).toThrow();
  });
});
