#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const LOCALSTORAGE_FILENAME = '.vitest-localstorage.sqlite';
const localStoragePath = join(process.cwd(), LOCALSTORAGE_FILENAME);

const existingNodeOptions = process.env.NODE_OPTIONS ? process.env.NODE_OPTIONS.split(/\s+/).filter(Boolean) : [];
const sanitizedOptions = existingNodeOptions.filter((flag) => !flag.startsWith('--localstorage-file'));
sanitizedOptions.push(`--localstorage-file=${localStoragePath}`);
process.env.NODE_OPTIONS = sanitizedOptions.join(' ');

const vitestArgs = [
  'run',
  '--config',
  'vitest.config.mjs',
  '--project',
  'unit',
  '--max-workers=1',
  ...process.argv.slice(2),
];

const child = spawn('vitest', vitestArgs, { stdio: 'inherit', env: process.env });

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
