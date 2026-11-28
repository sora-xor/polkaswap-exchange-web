#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { fetchVendorAdvisories } from './audit-vendor.mjs';

const INSTALLED_ALIAS = fileURLToPath(new URL('../../node_modules/picomatch/', import.meta.url));
const FORK_NAME = '@ryotsu/picomatch';
const FORK_VERSION = '4.0.7-a';
const UPSTREAM_VERSION = '4.0.7';
const ADDRESSED_ADVISORY = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
// SHA-256 of lib/parse.js after the checked-in Yarn patch has been applied.
const FIXED_PARSER_SHA256 = '23ccd5fb4892b1c8b32ac6464dd9546b9ac4b9e96226f11a81b2bb566c630bb7';

/**
 * Check advisories under both the original and scoped package names after verifying the installed fork.
 * Alias and patch locator names can differ from the installed manifest's registry identity.
 * Only the documented fix in this exact parser satisfies the corresponding upstream advisory.
 * @returns {Promise<number>} Nonzero on changed installed code, new findings or an incomplete check.
 */
export async function runPicomatchAudit({
  installedPath = INSTALLED_ALIAS,
  fetchImpl = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const manifest = JSON.parse(await readFile(join(installedPath, 'package.json'), 'utf8'));
    const parser = await readFile(join(installedPath, 'lib/parse.js'));
    const hash = createHash('sha256').update(parser).digest('hex');
    if (manifest.name !== FORK_NAME || manifest.version !== FORK_VERSION || hash !== FIXED_PARSER_SHA256) {
      throw new Error('Unexpected installed matcher');
    }
  } catch {
    stderr.write('Picomatch fork identity or parser integrity could not be verified.\n');
    return 1;
  }

  try {
    const findings = await fetchVendorAdvisories(
      { picomatch: [UPSTREAM_VERSION], [FORK_NAME]: [FORK_VERSION] },
      { fetchImpl }
    );
    stdout.write(`Verified ${FORK_NAME}@${FORK_VERSION} with the reviewed parser fix for ${ADDRESSED_ADVISORY}\n`);
    const outstanding = findings.filter(
      (finding) => finding.name !== 'picomatch' || finding.url !== ADDRESSED_ADVISORY
    );
    for (const finding of outstanding) {
      stderr.write(`${finding.severity}: ${finding.name}@${finding.versions.join(',')} ${finding.url}\n`);
    }
    return outstanding.length ? 1 : 0;
  } catch {
    stderr.write('Upstream Picomatch advisory lookup failed.\n');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runPicomatchAudit();
}
