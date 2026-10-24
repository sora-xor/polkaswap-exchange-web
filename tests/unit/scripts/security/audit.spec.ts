import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { runSecurityAuditCli } from '../../../../scripts/security/audit.mjs';

/** Capture summaries and mock subprocesses so no registry calls occur. */
function harness() {
  return {
    argv: [],
    root: '/test/repository with spaces',
    runCommand: vi.fn().mockReturnValue({ status: 0, error: undefined, signal: null }),
    stdout: { write: vi.fn() },
    stderr: { write: vi.fn() },
  };
}

describe('runSecurityAuditCli', () => {
  it('runs all inventories using pinned Yarn and separate argument arrays', () => {
    const options = harness();
    expect(runSecurityAuditCli(options)).toBe(0);
    expect(options.runCommand.mock.calls).toEqual([
      [
        process.execPath,
        [
          join(options.root, '.yarn/releases/yarn-4.10.3.cjs'),
          'npm',
          'audit',
          '--all',
          '--recursive',
          '--no-deprecations',
        ],
        { cwd: options.root, stdio: 'inherit', timeout: 60_000, shell: false },
      ],
      [
        process.execPath,
        [join(options.root, 'scripts/security/audit-vendor.mjs')],
        { cwd: options.root, stdio: 'inherit', timeout: 60_000, shell: false },
      ],
      [
        'npm',
        ['audit', '--package-lock-only', '--prefix', join(options.root, 'scripts/ucan')],
        { cwd: options.root, stdio: 'inherit', timeout: 60_000, shell: false },
      ],
    ]);
    expect(options.stdout.write).toHaveBeenLastCalledWith('Dependency audit: all checks passed.\n');
  });

  it.each([0, 1, 2])('keeps running all audits when inventory %s reports advisories', (failingIndex) => {
    const options = harness();
    options.runCommand.mockImplementation(() => ({
      status: options.runCommand.mock.calls.length - 1 === failingIndex ? 1 : 0,
    }));
    expect(runSecurityAuditCli(options)).toBe(1);
    expect(options.runCommand).toHaveBeenCalledTimes(3);
    expect(options.stdout.write).toHaveBeenLastCalledWith('Dependency audit: findings or incomplete checks remain.\n');
  });

  it.each([
    { status: null, signal: 'SIGTERM' },
    { status: null, error: new Error('private process detail') },
    { status: 0, error: new Error('private process detail') },
    { status: undefined },
  ])('fails closed on process errors without skipping later audits', (result) => {
    const options = harness();
    options.runCommand.mockReturnValueOnce(result);
    expect(runSecurityAuditCli(options)).toBe(1);
    expect(options.runCommand).toHaveBeenCalledTimes(3);
    expect(options.stderr.write).toHaveBeenCalledWith('Application Yarn dependencies: failed or incomplete.\n');
    expect(JSON.stringify(options.stderr.write.mock.calls)).not.toContain('private');
  });

  it('continues after a thrown subprocess error without printing the error', () => {
    const options = harness();
    options.runCommand.mockImplementationOnce(() => {
      throw new Error('private process detail');
    });
    expect(runSecurityAuditCli(options)).toBe(1);
    expect(options.runCommand).toHaveBeenCalledTimes(3);
    expect(options.stderr.write).toHaveBeenCalledWith('Application Yarn dependencies: failed to run.\n');
  });

  it('handles help and invalid arguments without launching audits', () => {
    const options = harness();
    expect(runSecurityAuditCli({ ...options, argv: ['--help'] })).toBe(0);
    expect(runSecurityAuditCli({ ...options, argv: ['private-value'] })).toBe(1);
    expect(options.runCommand).not.toHaveBeenCalled();
    expect(options.stderr.write).toHaveBeenCalledWith('No arguments are supported except --help.\n');
  });
});
