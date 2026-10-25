import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  collectVendorInventory,
  fetchVendorAdvisories,
  runVendorAuditCli,
} from '../../../../scripts/security/audit-vendor.mjs';

const directories: string[] = [];
const inventory = { 'base-x': ['4.0.0', '4.0.1'] };
const advisory = { id: 1104178, severity: 'high', url: 'https://github.com/advisories/GHSA-xq7p-g2vc-g82p' };

/** Create an isolated vendor tree without touching the real repository. */
async function vendorRoot() {
  const directory = await mkdtemp(join(tmpdir(), 'polkaswap-vendor-audit-test-'));
  directories.push(directory);
  return directory;
}

/** Write one fixture manifest with optional nested directories. */
async function manifest(root: string, path: string, content: unknown) {
  const directory = join(root, path);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), JSON.stringify(content));
}

/** Return a fresh offline npm response. */
function response(payload: unknown = {}) {
  return new Response(JSON.stringify(payload), { status: 200 });
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  vi.restoreAllMocks();
});

describe('collectVendorInventory', () => {
  it('deduplicates named versions and ignores dependency declarations and module scope markers', async () => {
    const root = await vendorRoot();
    await manifest(root, 'a', { name: 'base-x', version: '4.0.1', dependencies: { absent: '1.0.0' } });
    await manifest(root, 'a/cjs', { type: 'commonjs' });
    await manifest(root, 'copy', { name: 'base-x', version: '4.0.1' });
    await manifest(root, 'older', { name: 'base-x', version: '4.0.0' });
    await manifest(root, '@scope/package', { name: '@scope/package', version: '2.0.0-beta.1' });
    await manifest(root, 'node_modules/untracked', { name: 'untracked', version: '1.0.0' });
    expect(await collectVendorInventory(root)).toEqual({
      '@scope/package': ['2.0.0-beta.1'],
      'base-x': ['4.0.0', '4.0.1'],
    });
  });

  it('fails on empty or unreadable inventories instead of reporting them clean', async () => {
    const root = await vendorRoot();
    await expect(collectVendorInventory(root)).rejects.toThrow('empty');
    await expect(collectVendorInventory(join(root, 'missing'))).rejects.toThrow('Unable to read');
    await writeFile(join(root, 'package.json'), 'not-json');
    await expect(collectVendorInventory(root)).rejects.toThrow('Unable to read');
  });

  it.each([{ name: 'bad\nname', version: '1.0.0' }, { name: 'base-x', version: '^4.0.1' }, null, []])(
    'rejects invalid manifest identity %s',
    async (content) => {
      const root = await vendorRoot();
      await manifest(root, 'package', content);
      await expect(collectVendorInventory(root)).rejects.toThrow('invalid');
    }
  );

  it('does not silently omit packages hidden behind symlinks', async () => {
    const root = await vendorRoot();
    await symlink('/unread-target', join(root, 'linked'));
    await expect(collectVendorInventory(root)).rejects.toThrow('symlink');
  });
});

describe('fetchVendorAdvisories', () => {
  it('posts only the inventory to the fixed registry and returns matching advisories', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response({ 'base-x': [advisory] }));
    expect(await fetchVendorAdvisories(inventory, { fetchImpl })).toEqual([
      { ...advisory, name: 'base-x', versions: ['4.0.0', '4.0.1'] },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith('https://registry.npmjs.org/-/npm/v1/security/advisories/bulk', {
      method: 'POST',
      redirect: 'error',
      signal: expect.any(AbortSignal),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(inventory),
    });
  });

  it('accepts an empty successful registry response as no known advisories', async () => {
    await expect(
      fetchVendorAdvisories(inventory, { fetchImpl: vi.fn().mockResolvedValue(response()) })
    ).resolves.toEqual([]);
  });

  it.each([null, [], { error: 'private-response' }, { 'base-x': [{}] }, { unexpected: [advisory] }])(
    'fails closed for malformed registry results',
    async (payload) => {
      await expect(
        fetchVendorAdvisories(inventory, { fetchImpl: vi.fn().mockResolvedValue(response(payload)) })
      ).rejects.toThrow('security status is unknown');
    }
  );

  it.each([301, 401, 429, 500])('fails closed for HTTP %s', async (status) => {
    await expect(
      fetchVendorAdvisories(inventory, { fetchImpl: vi.fn().mockResolvedValue(new Response('private', { status })) })
    ).rejects.toThrow('security status is unknown');
  });

  it('does not expose transport failures or response bodies', async () => {
    for (const fetchImpl of [
      vi.fn().mockRejectedValue(new Error('private-token')),
      vi.fn().mockResolvedValue(new Response('private-token')),
      vi.fn().mockResolvedValue({ status: 200, redirected: true }),
    ]) {
      await expect(fetchVendorAdvisories(inventory, { fetchImpl })).rejects.toThrow(
        'Vendor advisory lookup failed; security status is unknown.'
      );
    }
  });

  it('rejects invalid input before performing network access', async () => {
    const fetchImpl = vi.fn();
    await expect(fetchVendorAdvisories({}, { fetchImpl })).rejects.toThrow('inventory is invalid');
    await expect(fetchVendorAdvisories(inventory, { fetchImpl, timeoutMs: 0 })).rejects.toThrow('timeout');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('runVendorAuditCli', () => {
  it('returns nonzero for every advisory, including low severity, and zero only for a complete clean audit', async () => {
    const root = await vendorRoot();
    await manifest(root, 'base-x', { name: 'base-x', version: '4.0.0' });
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };
    const fetchImpl = vi.fn().mockResolvedValueOnce(response({ 'base-x': [{ ...advisory, severity: 'low' }] }));
    expect(await runVendorAuditCli({ argv: [], root, stdout, stderr, fetchImpl })).toBe(1);
    expect(stdout.write).toHaveBeenCalledWith(expect.stringContaining('low: base-x@4.0.0'));
    fetchImpl.mockResolvedValueOnce(response());
    expect(await runVendorAuditCli({ argv: [], root, stdout, stderr, fetchImpl })).toBe(0);
    fetchImpl.mockRejectedValueOnce(new Error('private-token'));
    expect(await runVendorAuditCli({ argv: [], root, stdout, stderr, fetchImpl })).toBe(1);
    expect(stderr.write).toHaveBeenCalledWith('Vendor advisory lookup failed; security status is unknown.\n');
  });

  it('shows help and rejects unexpected arguments without a network request', async () => {
    const fetchImpl = vi.fn();
    const stdout = { write: vi.fn() };
    const stderr = { write: vi.fn() };
    expect(await runVendorAuditCli({ argv: ['--help'], stdout, stderr, fetchImpl })).toBe(0);
    expect(await runVendorAuditCli({ argv: ['private-token'], stdout, stderr, fetchImpl })).toBe(1);
    expect(stderr.write).toHaveBeenCalledWith('No arguments are supported except --help.\n');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
