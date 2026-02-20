import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Compat alias usage detected in the source tree.
 */
export type CompatUsage = {
  file: string;
  module: string;
  line: number;
  lineText: string;
};

/**
 * Allow-list entry describing which files can still import compat shims.
 */
export type AllowListEntry = {
  pattern: string;
  modules?: string[];
  note?: string;
};

type AllowMatcher = (usage: CompatUsage) => boolean;

const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue']);

const SKIP_DIRECTORIES = new Set([
  '.git',
  '.husky',
  '.idea',
  '.vscode',
  '.yarn',
  '.changeset',
  'dist',
  'docs',
  'node_modules',
  'public',
  'vendor',
  'tmp',
  'coverage',
  'cypress',
  'playwright-report',
  '.nyc_output',
]);

const COMPAT_IMPORT_PATTERN = /['"](@vue\/compat|@\/compat(?:\/[^'"]*)?)['"]/g;

const DEFAULT_ALLOW_LIST: AllowListEntry[] = [
  { pattern: 'tests/unit/compat/polkadot.spec.ts', modules: ['@/compat/polkadot'] },
  { pattern: 'src/main.ts', modules: ['@/compat/runtime-helpers'] },
  { pattern: 'src/lib/soraneo-wallet/src/core.ts', modules: ['@/compat/runtime-helpers'] },
  { pattern: 'src/lib/soraneo-wallet/src/index.ts', modules: ['@/compat/runtime-helpers'] },
  {
    pattern: 'tests/unit/lib/soramitsu-ui/components/Notifications/SNotificationBodyTimeline.spec.ts',
    modules: ['@/compat/runtime-helpers'],
  },
  {
    pattern: 'tests/unit/lib/soramitsu-ui/components/Table/STable.spec.ts',
    modules: ['@/compat/runtime-helpers'],
  },
];

const INTERNAL_IGNORE = new Set(['scripts/analyze/compat-alias.ts', 'tests/unit/scripts/analyze/compat-alias.spec.ts']);

const HELP_TEXT = `Usage: tsx scripts/analyze/compat-alias.ts [options]

Options:
  --root=<path>     Root directory to scan (defaults to current working directory)
  --json=<path>     Write JSON report to the provided file path
  --quiet           Only print failures
  --help            Show this message
`;

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const globToRegExp = (pattern: string): RegExp => {
  const normalized = pattern.replace(/\\/g, '/');
  const tokens = normalized.split('**');
  const escaped = tokens.map((token) => escapeRegExp(token));
  const rebuilt = escaped.join('::DOUBLE_STAR::');
  const singleStarHandled = rebuilt.replace(/\\\*/g, '[^/]*');
  const doubleStarHandled = singleStarHandled.replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${doubleStarHandled}$`);
};

/**
 * Build a matcher function backed by the provided allow-list entries.
 */
export const createAllowMatcher = (entries: AllowListEntry[]): AllowMatcher => {
  const patterns = entries.map((entry) => ({
    regex: globToRegExp(entry.pattern.startsWith('.') ? entry.pattern.slice(1) : entry.pattern),
    entry,
    moduleRegexes: (entry.modules ?? ['*']).map((modulePattern) => {
      if (modulePattern === '*') return { regex: /^.*$/, raw: '*' };
      const normalized = modulePattern.replace(/\\/g, '/');
      const regex = globToRegExp(normalized);
      return { regex, raw: modulePattern };
    }),
  }));

  return (usage) => {
    for (const { regex, moduleRegexes } of patterns) {
      if (!regex.test(usage.file)) continue;
      for (const moduleRegex of moduleRegexes) {
        if (moduleRegex.regex.test(usage.module)) {
          return true;
        }
      }
    }
    return false;
  };
};

const defaultMatcher = createAllowMatcher(DEFAULT_ALLOW_LIST);

const toPosixRelative = (absolutePath: string, root: string): string => {
  const relative = path.relative(root, absolutePath);
  return relative.split(path.sep).join('/');
};

const shouldSkipDir = (dirPath: string): boolean => {
  const parts = dirPath.split(path.sep);
  return parts.some((part) => SKIP_DIRECTORIES.has(part));
};

/**
 * Recursively collect files under the provided directory that should be scanned.
 */
async function collectFiles(root: string, current: string, results: string[]): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(path.relative(root, fullPath))) continue;
      await collectFiles(root, fullPath, results);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!DEFAULT_EXTENSIONS.has(ext)) continue;
    results.push(fullPath);
  }
}

/**
 * Scan the provided root directory for compat shim usage.
 */
export const findCompatUsage = async (root: string): Promise<CompatUsage[]> => {
  const files: string[] = [];
  await collectFiles(root, root, files);
  const matches: CompatUsage[] = [];

  await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(file, 'utf8');
      const lines = raw.split(/\r?\n/);
      const relativePath = toPosixRelative(file, root);
      if (INTERNAL_IGNORE.has(relativePath)) return;

      lines.forEach((line, index) => {
        const localMatches = line.matchAll(COMPAT_IMPORT_PATTERN);
        for (const match of localMatches) {
          const moduleName = match[1];
          matches.push({
            file: relativePath,
            module: moduleName,
            line: index + 1,
            lineText: line.trim(),
          });
        }
      });
    })
  );

  matches.sort((a, b) => {
    if (a.file === b.file) return a.line - b.line;
    return a.file.localeCompare(b.file);
  });

  return matches;
};

/**
 * Partition compat usage into allowed entries and violations.
 */
export const partitionCompatUsage = (
  usages: CompatUsage[],
  matcher: AllowMatcher = defaultMatcher
): { allowed: CompatUsage[]; violations: CompatUsage[] } => {
  const allowed: CompatUsage[] = [];
  const violations: CompatUsage[] = [];

  for (const usage of usages) {
    if (matcher(usage)) {
      allowed.push(usage);
    } else {
      violations.push(usage);
    }
  }

  return { allowed, violations };
};

type CliOptions = {
  root: string;
  jsonPath?: string;
  quiet: boolean;
};

/**
 * Parse CLI arguments into structured options.
 */
const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    root: process.cwd(),
    quiet: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.info(HELP_TEXT);
      process.exit(0);
    } else if (arg === '--quiet') {
      options.quiet = true;
    } else if (arg.startsWith('--root=')) {
      const [, value] = arg.split('=');
      options.root = path.resolve(process.cwd(), value ?? '.');
    } else if (arg.startsWith('--json=')) {
      const [, value] = arg.split('=');
      if (!value) {
        throw new Error('Missing value for --json option');
      }
      options.jsonPath = path.resolve(process.cwd(), value);
    }
  }

  return options;
};

/**
 * Format a compat usage record for CLI output.
 */
const formatUsage = (usage: CompatUsage): string =>
  `- ${usage.file}:${usage.line} imports ${usage.module} (${usage.lineText})`;

/**
 * Write the JSON report to disk, creating parent directories when needed.
 */
const writeJsonReport = async (filePath: string, data: unknown): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
};

/**
 * CLI entry point for compat alias analysis.
 */
export const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  const usages = await findCompatUsage(options.root);
  const { allowed, violations } = partitionCompatUsage(usages);

  if (options.jsonPath) {
    await writeJsonReport(options.jsonPath, { total: usages.length, allowed, violations });
  }

  if (!options.quiet) {
    if (usages.length === 0) {
      console.info('No compat shim usage found.');
    } else {
      console.info(`Compat shim usage detected (${usages.length} matches):`);
      allowed.forEach((usage) => {
        console.info(formatUsage(usage));
      });
    }
  }

  if (violations.length > 0) {
    console.error('Compat usage outside the allow-list:');
    violations.forEach((usage) => {
      console.error(formatUsage(usage));
    });
    process.exitCode = 1;
  }
};

/**
 * Convert a filesystem path to a file:// URL in a cross-platform manner.
 */
const toFileUrl = (filePath: string): string => {
  const resolved = path.resolve(filePath);
  const normalized = resolved.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

if (process.argv[1]) {
  const entryUrl = toFileUrl(process.argv[1]);
  if (import.meta.url === entryUrl) {
    void main().catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
  }
}
