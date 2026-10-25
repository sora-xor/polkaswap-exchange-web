#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PLAYWRIGHT_VERSION = '1.63.0';
const RUNTIME_NAME = 'polkaswap-preflight-runtime';
const SAFE_RUNTIME_ENTRIES = new Set(['package.json', 'package-lock.json', 'node_modules', 'browsers']);

/** Refuse unrelated directories, personal roots and mismatched runtime manifests before writing. */
export function validateRuntimeDirectory(runtimeDir) {
  if (typeof runtimeDir !== 'string' || !isAbsolute(runtimeDir)) throw new Error('INVALID_RUNTIME_DIRECTORY');
  const normalized = resolve(runtimeDir);
  const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const existing = existsSync(normalized) ? realpathSync(normalized) : normalized;
  if (
    existing === resolve('/') ||
    existing === realpathSync(homedir()) ||
    existing === skillRoot ||
    existing.startsWith(`${skillRoot}/`)
  )
    throw new Error('INVALID_RUNTIME_DIRECTORY');
  if (existsSync(normalized)) {
    const entries = readdirSync(normalized);
    if (entries.some((entry) => !SAFE_RUNTIME_ENTRIES.has(entry))) throw new Error('UNRELATED_RUNTIME_DIRECTORY');
    if (entries.length) {
      const manifest = JSON.parse(readFileSync(join(normalized, 'package.json'), 'utf8'));
      if (
        Object.keys(manifest).some((key) => !['name', 'private', 'dependencies'].includes(key)) ||
        manifest.name !== RUNTIME_NAME ||
        manifest.private !== true ||
        Object.keys(manifest.dependencies ?? {}).some((name) => name !== 'playwright') ||
        (manifest.dependencies?.playwright !== undefined && manifest.dependencies.playwright !== PLAYWRIGHT_VERSION)
      )
        throw new Error('UNRELATED_RUNTIME_DIRECTORY');
    }
  }
  return normalized;
}

/** Explicitly provision only the pinned public runtime; use argument arrays, no shell or global installs. */
export function setupRuntime(runtimeDir, { run = execFileSync, env = process.env } = {}) {
  const directory = validateRuntimeDirectory(runtimeDir);
  mkdirSync(directory, { recursive: true });
  const manifestPath = join(directory, 'package.json');
  if (!existsSync(manifestPath))
    writeFileSync(manifestPath, `${JSON.stringify({ name: RUNTIME_NAME, private: true })}\n`);
  run(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    [
      '--prefix',
      directory,
      'install',
      '--save-exact',
      `playwright@${PLAYWRIGHT_VERSION}`,
      '--registry=https://registry.npmjs.org',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: directory, env, stdio: 'inherit', timeout: 180_000 }
  );
  run(process.execPath, [join(directory, 'node_modules/playwright/cli.js'), 'install', 'chromium', '--only-shell'], {
    cwd: directory,
    env: { ...env, PLAYWRIGHT_BROWSERS_PATH: join(directory, 'browsers') },
    stdio: 'inherit',
    timeout: 240_000,
  });
  return { runtimeDir: directory, playwrightVersion: PLAYWRIGHT_VERSION, browsersPath: join(directory, 'browsers') };
}

/** One explicit setup action; importing this module never installs dependencies or downloads a browser. */
export function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === '--help') {
    process.stdout.write(
      'Node 26. Usage: setup.mjs --runtime-dir /absolute/separate/runtime\nDownloads pinned Playwright 1.63.0 and its matching Chromium shell; no global installs or account setup.\n'
    );
    return;
  }
  try {
    if (Number(process.versions.node.split('.')[0]) !== 26 || argv.length !== 2 || argv[0] !== '--runtime-dir')
      throw new Error('INVALID_SETUP_INPUT');
    process.stdout.write(`${JSON.stringify(setupRuntime(argv[1]))}\n`);
  } catch {
    process.stderr.write(
      'PREFLIGHT_SETUP_FAILED: Node 26, an absolute separate runtime directory, npm and public download access are required. Existing unrelated files are never overwritten.\n'
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
