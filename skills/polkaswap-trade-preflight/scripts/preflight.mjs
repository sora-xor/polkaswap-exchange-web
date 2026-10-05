#!/usr/bin/env node
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArguments, PreflightError, runPreflight } from './preflight-core.mjs';
import { PLAYWRIGHT_VERSION } from './setup.mjs';

/** Load only the separately installed Playwright runtime; skill installation never installs it. */
export function loadChromium(runtimeDir) {
  if (typeof runtimeDir !== 'string' || !isAbsolute(runtimeDir)) throw new PreflightError('RUNTIME_UNAVAILABLE');
  process.env.PLAYWRIGHT_BROWSERS_PATH = join(runtimeDir, 'browsers');
  try {
    const requireRuntime = createRequire(join(runtimeDir, 'package.json'));
    if (requireRuntime('playwright/package.json').version !== PLAYWRIGHT_VERSION)
      throw new PreflightError('RUNTIME_UNAVAILABLE');
    return requireRuntime('playwright').chromium;
  } catch {
    throw new PreflightError('RUNTIME_UNAVAILABLE');
  }
}

/** Emit bounded, public JSON on success and fixed error codes on failure. */
export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    if (Number(process.versions.node.split('.')[0]) !== 26) throw new PreflightError('RUNTIME_UNAVAILABLE');
    const options = parseArguments(argv, env);
    if (options.help) {
      process.stdout.write(
        'Node 26. Usage: preflight.mjs --asset-in XOR --asset-out PSWAP --amount 1 [--side input|output] [--slippage 0.5] --runtime-dir /absolute/runtime\nRead-only, no wallets or executable intents. See references/setup.md.\n'
      );
      return;
    }
    const report = await runPreflight(loadChromium(options.runtimeDir), options);
    const json = JSON.stringify(report, null, 2);
    if (Buffer.byteLength(json) > 65_536) throw new PreflightError('INVALID_PLAN');
    process.stdout.write(`${json}\n`);
  } catch (error) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, error: { code: error instanceof PreflightError ? error.code : 'PREFLIGHT_FAILED' }, canExecute: false })}\n`
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) await main();
