#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// SHA-256 of the original standalone distributables and their minified extglobOpen bindings.
// Yarn 4.10.3 in this repo differs from the registry file by a pre-existing space removal.
const bindings = new Map([
  [
    '3ab8877d4bfbbcfcc1b3514801a23290015dd6b5d0ec9974385bc319bf99b980',
    ['it=(x,w)=>{', 'let P={...E[w],conditions:1,inner:""}', 't,g.index,w'],
  ],
  [
    'cd71753d68307301d21034efaf20bd8eee81f9450af75f068477bf9011bb9ad4',
    ['it=(x,w)=>{', 'let P={...E[w],conditions:1,inner:""}', 't,g.index,w'],
  ],
  [
    'a28ad591febb769f939c11f82f89bacad0b0fac0c884d3b78fa2aaaee970907e',
    ['ft=(x,C)=>{', 'let P={...m[C],conditions:1,inner:""}', 't,d.index,C'],
  ],
  [
    '8690135061bc49d187143493b82d26a09b7fb71d6dd817d2242cc9dc52506de9',
    ['ee=i((G,ae)=>{', 'const j={...B[ae],conditions:1,inner:""}', 'f,R.index,ae'],
  ],
]);

/**
 * Validate a repeated extglob at the point where Picomatch recognizes its opener.
 * Prefix-free literal alternatives have one possible division into repetitions.
 * The grammar excludes nested quantifiers, character classes and empty branches.
 * This function is copied into standalone CLI bundles, so keep it self-contained.
 */
export function checkRepeatedExtglob(pattern, operatorIndex, operator) {
  if (operator !== '+' && operator !== '*') return;
  const start = operatorIndex + 2;
  const end = pattern.indexOf(')', start);
  const body = end < 0 ? '' : pattern.slice(start, end);
  if (!body || /[^a-zA-Z0-9_. /|-]/.test(body)) {
    throw new SyntaxError('Repeated extglobs require unambiguous literal alternatives');
  }
  const alternatives = body.toLowerCase().split('|').sort();
  if (!alternatives[0] || alternatives.some((word, i) => i > 0 && word.startsWith(alternatives[i - 1]))) {
    throw new SyntaxError('Repeated extglobs require unambiguous literal alternatives');
  }
}

/**
 * Apply the reviewed parser guard to a known release. Match both the original
 * checksum and exactly one hook before changing any bytes.
 * @param {string} source Original UTF-8 standalone bundle.
 * @returns {string} Patched, still standalone bundle.
 */
export function hardenGlobCli(source) {
  const digest = createHash('sha256').update(source).digest('hex');
  const binding = bindings.get(digest);
  if (!binding) throw new Error('Unreviewed CLI digest; inspect the embedded parser before updating.');
  const [open, following, call] = binding;
  const anchor = open + following;
  const index = source.indexOf(anchor);
  if (index < 0 || source.indexOf(anchor, index + 1) >= 0) throw new Error('Expected one parser opening hook.');
  const offset = index + open.length;
  return source.slice(0, offset) + `(\n${checkRepeatedExtglob.toString()}\n)(${call});` + source.slice(offset);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [sourcePath, destinationPath] = process.argv.slice(2);
  if (!sourcePath || !destinationPath) throw new Error('Usage: harden-glob-cli.mjs ORIGINAL PATCHED');
  await writeFile(destinationPath, hardenGlobCli(await readFile(sourcePath, 'utf8')));
}
