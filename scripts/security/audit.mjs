#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Audit every dependency inventory, even when an earlier audit finds issues.
 * Commands use argument arrays and the checked-in Yarn release. Any finding,
 * timeout, or process error makes the aggregate result nonzero.
 * @param {{ argv?: string[], root?: string, runCommand?: typeof spawnSync, stdout?: Pick<NodeJS.WriteStream, 'write'>, stderr?: Pick<NodeJS.WriteStream, 'write'> }} options
 * @returns {number} Zero only when all three audit commands succeed.
 */
export function runSecurityAuditCli({
  argv = process.argv.slice(2),
  root = REPOSITORY_ROOT,
  runCommand = spawnSync,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  if (argv.length === 1 && argv[0] === '--help') {
    stdout.write('Usage: yarn security:audit\nRuns the Yarn, copied vendor, and standalone UCAN audits.\n');
    return 0;
  }
  if (argv.length) {
    stderr.write('No arguments are supported except --help.\n');
    return 1;
  }
  const audits = [
    {
      name: 'Application Yarn dependencies',
      command: process.execPath,
      args: [join(root, '.yarn/releases/yarn-4.10.3.cjs'), 'npm', 'audit', '--all', '--recursive', '--no-deprecations'],
    },
    {
      name: 'Copied vendor packages',
      command: process.execPath,
      args: [join(root, 'scripts/security/audit-vendor.mjs')],
    },
    {
      name: 'Standalone UCAN dependencies',
      command: 'npm',
      args: ['audit', '--package-lock-only', '--prefix', join(root, 'scripts/ucan')],
    },
  ];
  let failed = false;
  for (const audit of audits) {
    stdout.write(`Auditing: ${audit.name}\n`);
    try {
      const result = runCommand(audit.command, audit.args, {
        cwd: root,
        stdio: 'inherit',
        timeout: 60_000,
        shell: false,
      });
      if (result.status !== 0 || result.error || result.signal) {
        failed = true;
        stderr.write(`${audit.name}: failed or incomplete.\n`);
      } else {
        stdout.write(`${audit.name}: passed.\n`);
      }
    } catch {
      failed = true;
      stderr.write(`${audit.name}: failed to run.\n`);
    }
  }
  stdout.write(
    failed ? 'Dependency audit: findings or incomplete checks remain.\n' : 'Dependency audit: all checks passed.\n'
  );
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runSecurityAuditCli();
}
