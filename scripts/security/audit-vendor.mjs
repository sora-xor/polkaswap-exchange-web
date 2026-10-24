#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VENDOR_ROOT = fileURLToPath(new URL('../../vendor/', import.meta.url));
const ADVISORY_ENDPOINT = 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';
const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
const PACKAGE_VERSION = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?$/;
const SEVERITIES = new Set(['info', 'low', 'moderate', 'high', 'critical']);

/** Expected errors never include file contents, registry bodies, or credentials. */
class VendorAuditError extends Error {}

/**
 * Inventory the versions actually declared by vendored package manifests.
 * Ignore dependency declarations: a manifest's dependencies are not evidence
 * that those versions are present. Yarn audits the installed dependency graph.
 * @param {string} root Directory containing copied vendor packages.
 * @returns {Promise<Record<string, string[]>>} Sorted, deduplicated inventory.
 */
export async function collectVendorInventory(root = VENDOR_ROOT) {
  const versions = new Map();

  /** Visit real directories only; do not scan nested installs or Git metadata. */
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const path = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new VendorAuditError('Vendor inventory contains a symlink; review its target before auditing.');
      }
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && entry.name === 'package.json') {
        const manifest = JSON.parse(await readFile(path, 'utf8'));
        if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
          throw new VendorAuditError('Vendor inventory contains an invalid package manifest.');
        }
        // CJS/ESM scope markers contain only "type", without package identity.
        if (manifest.name === undefined && manifest.version === undefined) continue;
        if (
          typeof manifest.name !== 'string' ||
          !PACKAGE_NAME.test(manifest.name) ||
          typeof manifest.version !== 'string' ||
          !PACKAGE_VERSION.test(manifest.version)
        ) {
          throw new VendorAuditError('Vendor inventory contains an invalid package name or version.');
        }
        if (!versions.has(manifest.name)) versions.set(manifest.name, new Set());
        versions.get(manifest.name).add(manifest.version);
      }
    }
  }

  try {
    await visit(root);
  } catch (error) {
    if (error instanceof VendorAuditError) throw error;
    throw new VendorAuditError('Unable to read every vendor package manifest.');
  }
  if (!versions.size) throw new VendorAuditError('Vendor inventory is empty; no audit was performed.');
  return Object.fromEntries(
    [...versions]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, values]) => [name, [...values].sort()])
  );
}

/**
 * Query npm's public advisory API using only package names and versions.
 * Reject transport failures and malformed responses instead of reporting clean.
 * @param {Record<string, string[]>} inventory Vendored package versions.
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number }} options Injectable transport for offline tests.
 * @returns {Promise<Array<{ name: string, versions: string[], id: number, severity: string, url: string }>>}
 */
export async function fetchVendorAdvisories(inventory, { fetchImpl = globalThis.fetch, timeoutMs = 15_000 } = {}) {
  if (
    !inventory ||
    typeof inventory !== 'object' ||
    Array.isArray(inventory) ||
    !Object.keys(inventory).length ||
    Object.entries(inventory).some(
      ([name, versions]) =>
        !PACKAGE_NAME.test(name) ||
        !Array.isArray(versions) ||
        !versions.length ||
        versions.some((version) => typeof version !== 'string' || !PACKAGE_VERSION.test(version))
    )
  ) {
    throw new VendorAuditError('Vendor advisory inventory is invalid.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new VendorAuditError('Vendor advisory timeout must be between 1 and 30000 milliseconds.');
  }
  try {
    const response = await fetchImpl(ADVISORY_ENDPOINT, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(inventory),
    });
    if (response.status !== 200 || response.redirected) throw new Error('Invalid status');
    const payload = await response.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid response');
    const findings = [];
    for (const [name, advisories] of Object.entries(payload)) {
      if (!Object.hasOwn(inventory, name) || !Array.isArray(advisories)) throw new Error('Invalid package');
      for (const advisory of advisories) {
        if (
          !Number.isSafeInteger(advisory?.id) ||
          advisory.id <= 0 ||
          !SEVERITIES.has(advisory.severity) ||
          typeof advisory.url !== 'string' ||
          !/^https:\/\/github\.com\/advisories\/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(advisory.url)
        ) {
          throw new Error('Invalid advisory');
        }
        findings.push({
          name,
          versions: inventory[name],
          id: advisory.id,
          severity: advisory.severity,
          url: advisory.url,
        });
      }
    }
    return findings;
  } catch {
    throw new VendorAuditError('Vendor advisory lookup failed; security status is unknown.');
  }
}

/** Run the vendor audit, returning 1 for any advisory or an incomplete lookup. */
export async function runVendorAuditCli({
  argv = process.argv.slice(2),
  root = VENDOR_ROOT,
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  if (argv.length === 1 && argv[0] === '--help') {
    stdout.write(
      'Usage: node scripts/security/audit-vendor.mjs\nAudits copied vendor package manifests through npm.\n'
    );
    return 0;
  }
  try {
    if (argv.length) throw new VendorAuditError('No arguments are supported except --help.');
    const inventory = await collectVendorInventory(root);
    const findings = await fetchVendorAdvisories(inventory, { fetchImpl });
    stdout.write(`Vendor audit: ${Object.keys(inventory).length} package names; ${findings.length} advisories.\n`);
    for (const finding of findings) {
      stdout.write(`${finding.severity}: ${finding.name}@${finding.versions.join(',')} ${finding.url}\n`);
    }
    return findings.length ? 1 : 0;
  } catch (error) {
    stderr.write(`${error instanceof VendorAuditError ? error.message : 'Vendor audit failed.'}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runVendorAuditCli();
}
