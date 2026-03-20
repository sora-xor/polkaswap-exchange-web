#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..');

export const resolveYarnEntry = (root = repoRoot) => {
  const yarnRcPath = path.join(root, '.yarnrc.yml');
  if (existsSync(yarnRcPath)) {
    const yarnRc = readFileSync(yarnRcPath, 'utf8');
    const match = yarnRc.match(/^\s*yarnPath:\s*(.+)\s*$/m);
    if (match) {
      return path.resolve(root, match[1].trim());
    }
  }

  return null;
};

export const buildVitestArgs = (forwardedArgs) => {
  const hasProjectArg = forwardedArgs.some((arg) => arg === '--project' || arg.startsWith('--project='));
  const hasConfigArg = forwardedArgs.some((arg) => arg === '--config' || arg.startsWith('--config='));
  const hasRunSubcommand = forwardedArgs.includes('run');
  const hasReporterArg = forwardedArgs.some((arg) => arg === '--reporter' || arg.startsWith('--reporter='));
  const vitestArgs = ['vitest'];

  if (!hasRunSubcommand) {
    vitestArgs.push('run');
  }

  if (!hasConfigArg) {
    vitestArgs.push('--config', 'vitest.config.mjs');
  }

  if (!hasProjectArg) {
    vitestArgs.push('--project', 'unit');
  }

  if (!hasReporterArg) {
    vitestArgs.push('--reporter=dot');
  }

  vitestArgs.push('--max-workers=1', ...forwardedArgs);

  return vitestArgs;
};

export const spawnVitest = (forwardedArgs = process.argv.slice(2)) => {
  const vitestArgs = buildVitestArgs(forwardedArgs);
  const yarnEntry = resolveYarnEntry();

  if (yarnEntry) {
    return spawn(process.execPath, [yarnEntry, ...vitestArgs], { stdio: 'inherit', env: process.env });
  }

  return spawn('yarn', vitestArgs, { stdio: 'inherit', env: process.env });
};

const isCliEntry = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isCliEntry) {
  const child = spawnVitest();

  child.on('exit', (code, signal) => {
    if (typeof code === 'number') {
      process.exit(code);
    }
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(1);
    }
  });
}
