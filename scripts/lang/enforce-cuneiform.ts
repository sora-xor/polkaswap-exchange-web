#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

type Args = { locales: string[] };

function parseArgs(argv: string[]): Args {
  const args: Args = { locales: [] };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--locales=')) {
      args.locales = a
        .replace('--locales=', '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (!args.locales.length) args.locales = ['akk'];
  return args;
}

function flatten(source: Record<string, any>, prefix: Array<string> = []): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  Object.keys(source).forEach((k) => {
    const v = (source as any)[k];
    const pathArr = [...prefix, k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out.push(...flatten(v, pathArr));
    } else if (typeof v === 'string') {
      out.push({ key: pathArr.join('.'), value: v });
    }
  });
  return out;
}

function hasLatinOutsidePlaceholders(s: string): boolean {
  const stripped = s.replace(/\{[^}]*\}/g, '');
  return /[A-Za-z]/.test(stripped);
}

function checkFile(file: string): Array<{ key: string; value: string }> {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out: Array<{ key: string; value: string }> = [];
  for (const { key, value } of flatten(data)) {
    if (hasLatinOutsidePlaceholders(value)) out.push({ key, value });
  }
  return out;
}

(function main() {
  const args = parseArgs(process.argv);
  const base = path.join('src', 'lang');
  let violations = 0;
  for (const loc of args.locales) {
    const mainFile = path.join(base, `${loc}.json`);
    const cardFile = path.join(base, 'card', `${loc}.json`);
    const files = [mainFile, cardFile].filter((f) => fs.existsSync(f));
    for (const f of files) {
      const errs = checkFile(f);
      if (errs.length) {
        violations += errs.length;

        console.error(`[cuneiform-enforce] ${f} violations:`);
        for (const e of errs) {
          console.error(`  - ${e.key} = ${e.value}`);
        }
      }
    }
  }
  if (violations) process.exit(1);

  console.info('[cuneiform-enforce] OK');
})();
