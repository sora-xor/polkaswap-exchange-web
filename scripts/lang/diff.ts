import fs from 'fs';
import { spawnSync } from 'child_process';

type ChangeType = 'added' | 'removed' | 'changed';

export type DiffEntry = {
  key: string;
  change: ChangeType;
  before?: string;
  after?: string;
};

type FileDiff = {
  file: string;
  entries: DiffEntry[];
};

type CliOptions = {
  baseRef: string;
  files: string[];
  output: 'human' | 'json';
};

const DEFAULT_FILES = ['src/lang/en.json', 'src/lang/card/en.json'];

/**
 * Converts a deeply nested locale object into dot-notation entries.
 */
export function flattenLocale(input: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  if (input === null || input === undefined) {
    return result;
  }

  if (typeof input !== 'object') {
    if (!prefix) {
      return result;
    }
    result[prefix] = formatValue(input);
    return result;
  }

  if (Array.isArray(input)) {
    input.forEach((value, index) => {
      const nextKey = prefix ? `${prefix}.${index}` : `${index}`;
      Object.assign(result, flattenLocale(value, nextKey));
    });
    return result;
  }

  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(result, flattenLocale(value, nextKey));
    } else {
      result[nextKey] = formatValue(value);
    }
  });

  return result;
}

/**
 * Computes the translation diff between two locale trees.
 */
export function diffLocales(base: unknown, head: unknown): DiffEntry[] {
  const baseFlat = flattenLocale(base ?? {});
  const headFlat = flattenLocale(head ?? {});
  const keys = Array.from(new Set([...Object.keys(baseFlat), ...Object.keys(headFlat)])).sort((a, b) =>
    a.localeCompare(b)
  );

  return keys.reduce<DiffEntry[]>((buffer, key) => {
    const before = baseFlat[key];
    const after = headFlat[key];

    if (before === undefined && after !== undefined) {
      buffer.push({ key, change: 'added', after });
    } else if (before !== undefined && after === undefined) {
      buffer.push({ key, change: 'removed', before });
    } else if (before !== after) {
      buffer.push({ key, change: 'changed', before, after });
    }

    return buffer;
  }, []);
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function parseArgs(raw: string[]): CliOptions {
  const options: CliOptions = {
    baseRef: 'origin/main',
    files: [],
    output: 'human',
  };

  raw.forEach((arg) => {
    if (arg.startsWith('--base=')) {
      options.baseRef = arg.replace('--base=', '') || options.baseRef;
    } else if (arg.startsWith('--file=')) {
      options.files.push(arg.replace('--file=', ''));
    } else if (arg.startsWith('--files=')) {
      const values = arg
        .replace('--files=', '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      options.files.push(...values);
    } else if (arg === '--json') {
      options.output = 'json';
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (!arg.startsWith('--')) {
      options.files.push(arg);
    }
  });

  options.files = options.files.filter(Boolean);

  if (!options.files.length) {
    options.files = DEFAULT_FILES.slice();
  }

  return options;
}

function printUsage(): void {
  console.info(`Usage: yarn lang:diff [options]

Options:
  --base=<ref>       Git ref to compare against (default: origin/main)
  --file=<path>      Locale file to include (can be repeated)
  --files=a,b        Comma-separated list of locale files
  --json             Output JSON instead of human-readable text
  -h, --help         Show this message
`);
}

function readJsonFromDisk(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function readJsonFromGit(ref: string, filePath: string): unknown {
  const result = spawnSync('git', ['show', `${ref}:${filePath}`], { encoding: 'utf8' });

  if (result.status !== 0 || !result.stdout) {
    return {};
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return {};
  }
}

function buildFileDiffs(baseRef: string, files: string[]): FileDiff[] {
  return files.map((filePath) => {
    const normalized = filePath.replace(/\\/g, '/');
    const head = readJsonFromDisk(normalized);
    const base = readJsonFromGit(baseRef, normalized);
    const entries = diffLocales(base, head);
    return { file: normalized, entries };
  });
}

function printHumanReadable(diffs: FileDiff[]): void {
  const totalChanges = diffs.reduce((counter, diff) => counter + diff.entries.length, 0);

  if (totalChanges === 0) {
    console.info('No translation changes detected.');
    return;
  }

  diffs.forEach((diff) => {
    if (!diff.entries.length) return;

    console.info(`\n${diff.file}`);
    const added = diff.entries.filter((entry) => entry.change === 'added');
    const removed = diff.entries.filter((entry) => entry.change === 'removed');
    const changed = diff.entries.filter((entry) => entry.change === 'changed');

    if (added.length) {
      console.info(`  Added (${added.length}):`);
      added.forEach((entry) => {
        console.info(`    • ${entry.key} = ${entry.after ?? ''}`);
      });
    }

    if (removed.length) {
      console.info(`  Removed (${removed.length}):`);
      removed.forEach((entry) => {
        console.info(`    • ${entry.key} (was ${entry.before ?? ''})`);
      });
    }

    if (changed.length) {
      console.info(`  Changed (${changed.length}):`);
      changed.forEach((entry) => {
        console.info(`    • ${entry.key}`);
        console.info(`        before: ${entry.before ?? ''}`);
        console.info(`        after:  ${entry.after ?? ''}`);
      });
    }
  });
}

/**
 * Entry point used by the CLI runner; accepts raw argv arguments.
 */
export async function runDiffCli(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const diffs = buildFileDiffs(options.baseRef, options.files);

  if (options.output === 'json') {
    console.info(JSON.stringify(diffs, null, 2));
  } else {
    printHumanReadable(diffs);
  }
}
