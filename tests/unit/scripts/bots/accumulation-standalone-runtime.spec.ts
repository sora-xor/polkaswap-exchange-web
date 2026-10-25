// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const config = join(root, 'scripts/bots/tsconfig.accumulation.json');
const child = join(root, 'tests/unit/scripts/bots/fixtures/accumulation-standalone-runtime-child.ts');

describe('standalone accumulation research runtime', () => {
  it('runs real Node+tsx imports and all three pure stages outside Vitest/Vite mocks', () => {
    const result = spawnSync(
      process.execPath,
      [join(root, 'node_modules/tsx/dist/cli.mjs'), '--tsconfig', config, child],
      {
        cwd: root,
        env: { LANG: 'C', LC_ALL: 'C', TZ: 'UTC' },
        encoding: 'utf8',
        shell: false,
        timeout: 10_000,
        maxBuffer: 64 * 1024,
        killSignal: 'SIGKILL',
      }
    );
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.signal, result.stderr).toBeNull();
    expect(result.status, result.stderr).toBe(0);
    // These retained synthetic metadata warnings and Node26/tsx deprecation are not suppressed.
    // Unexpected diagnostics still fail; the Python admission receipt's empty-stderr rule is unchanged.
    const diagnostics = result.stderr.trim().split('\n').filter(Boolean);
    const allowed = [
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} PORTABLEREGISTRY: Unable to determine runtime Event type, cannot inspect frame_system::EventRecord$/,
      /^Unable to map u16 to a lookup index$/,
      /^\(node:\d+\) \[DEP0205\] DeprecationWarning: `module\.register\(\)` is deprecated\. Use `module\.registerHooks\(\)` instead\.$/,
      /^\(Use `node --trace-deprecation \.\.\.` to show where the warning was created\)$/,
    ];
    expect(diagnostics.length).toBeLessThanOrEqual(32);
    expect(diagnostics.filter((line) => !allowed.some((pattern) => pattern.test(line)))).toEqual([]);
    expect(result.stdout.length).toBeLessThan(2048);
    const receipt = JSON.parse(result.stdout);
    expect(result.stdout).toBe(JSON.stringify(receipt) + '\n');
    expect(receipt).toEqual({
      kind: 'accumulation-standalone-runtime-smoke-v1',
      aliases: ['@/*', '@sora-substrate/math', '@sora-substrate/math/*', '@sora-substrate/liquidity-proxy'],
      amountCodec: '1250000000000000000',
      nativeMarkOwned: true,
      admissionOwned: true,
      nativeRatio: { numerator: '2', denominator: '3' },
      candidateCount: 9,
      selectedInputKusd: 1,
      freshStatus: 'fresh-research-buy',
      expiredStatus: 'unusable-buy',
      actualClockCaptured: true,
      modelInvoked: false,
      acquisitionInvoked: false,
      financialActions: false,
    });
  }, 15_000);
});
