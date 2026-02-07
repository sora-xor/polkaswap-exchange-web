import fs from 'node:fs/promises';
import path from 'node:path';

export type StoreAccessType = 'state' | 'getters' | 'commit' | 'dispatch';

export type StoreAccess = {
  file: string;
  domain: string;
  line: number;
  column: number;
  type: StoreAccessType;
  lineText: string;
};

export type StoreUsageReport = {
  generatedAt: string;
  totalAccesses: number;
  totalFiles: number;
  totalsByType: Record<StoreAccessType, number>;
  domains: DomainSummary[];
  files: FileSummary[];
  entries: StoreAccess[];
};

export type DomainSummary = {
  domain: string;
  files: number;
  total: number;
  byType: Record<StoreAccessType, number>;
};

export type FileSummary = {
  file: string;
  domain: string;
  total: number;
  counts: Record<StoreAccessType, number>;
};

export type StoreUsageCliOptions = {
  root: string;
  jsonPath?: string;
  markdownPath?: string;
};

const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.vue']);

const SKIP_DIRECTORIES = new Set([
  '.git',
  '.husky',
  '.idea',
  '.vscode',
  '.yarn',
  '.changeset',
  '.nyc_output',
  'coverage',
  'dist',
  'docs',
  'node_modules',
  'public',
  'vendor',
  'tmp',
  'cypress',
  'playwright-report',
  'test-results',
]);

const STORE_ACCESS_PATTERN = /store\??\.(state|getters|commit|dispatch)/g;

const INTERNAL_IGNORE = new Set(['scripts/analyze/store-usage.ts', 'tests/unit/scripts/analyze/store-usage.spec.ts']);

const DEFAULT_JSON_PATH = 'docs/reports/store-access-audit.json';
const DEFAULT_MARKDOWN_PATH = 'docs/reports/store-access-audit.md';

const HELP_TEXT = `Usage: tsx scripts/analyze/store-usage.ts [options]

Options:
  --root=<path>        Repository root to scan (defaults to current working directory)
  --json=<path>        Write JSON report to the provided path (default: ${DEFAULT_JSON_PATH})
  --markdown=<path>    Write Markdown summary to the provided path (default: ${DEFAULT_MARKDOWN_PATH})
  --help               Show this message
`;

const cloneTotals = (): Record<StoreAccessType, number> => ({
  state: 0,
  getters: 0,
  commit: 0,
  dispatch: 0,
});

const normalizePath = (root: string, outputPath?: string): string | undefined => {
  if (!outputPath) return undefined;
  const target = outputPath.startsWith('.') ? path.join(root, outputPath) : outputPath;
  return path.resolve(target);
};

export const parseStoreUsageArgs = (argv: string[]): StoreUsageCliOptions => {
  let root = process.cwd();
  let jsonPath: string | undefined = DEFAULT_JSON_PATH;
  let markdownPath: string | undefined = DEFAULT_MARKDOWN_PATH;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.info(HELP_TEXT);
      process.exit(0);
    } else if (arg.startsWith('--root=')) {
      const [, value] = arg.split('=');
      if (!value) throw new Error('Missing value for --root');
      root = path.resolve(process.cwd(), value);
    } else if (arg.startsWith('--json=')) {
      const [, value] = arg.split('=');
      if (!value) throw new Error('Missing value for --json');
      jsonPath = value;
    } else if (arg.startsWith('--markdown=')) {
      const [, value] = arg.split('=');
      if (!value) throw new Error('Missing value for --markdown');
      markdownPath = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  const resolvedRoot = path.resolve(root);

  return {
    root: resolvedRoot,
    jsonPath: normalizePath(resolvedRoot, jsonPath),
    markdownPath: normalizePath(resolvedRoot, markdownPath),
  };
};

const toPosixRelative = (absolutePath: string, root: string): string => {
  const relative = path.relative(root, absolutePath);
  return relative.split(path.sep).join('/');
};

const shouldSkipDir = (dirPath: string): boolean => {
  const parts = dirPath.split(path.sep);
  return parts.some((part) => SKIP_DIRECTORIES.has(part));
};

async function collectFiles(root: string, current: string, results: string[]): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      const relative = path.relative(root, fullPath);
      if (shouldSkipDir(relative)) continue;
      await collectFiles(root, fullPath, results);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (!DEFAULT_EXTENSIONS.has(ext)) continue;
    results.push(fullPath);
  }
}

export const inferStoreUsageDomain = (relativePath: string): string => {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized.startsWith('src/')) {
    const [head] = normalized.split('/');
    return head || normalized;
  }

  const [, ...segments] = normalized.split('/');
  if (!segments.length) return 'src';

  const [first, second, third] = segments;

  if (first === 'components' && second === 'pages' && third) {
    return `pages/${third}`;
  }

  if (first === 'components' && second) {
    return `components/${second}`;
  }

  if (first === 'modules' && second) {
    return `modules/${second}`;
  }

  if (first === 'views' && second) {
    if (third) {
      return `views/${second}`;
    }
    const sanitized = second.replace(/\.[^.]+$/, '');
    return `views/${sanitized}`;
  }

  if (first === 'composables') {
    return 'composables';
  }

  if (first === 'store') {
    return 'legacy-store';
  }

  if (first === 'stores' && second) {
    return `pinia/${second}`;
  }

  if (first === 'lib' && second) {
    return `lib/${second}`;
  }

  return first;
};

export const extractStoreAccesses = (content: string): Array<Omit<StoreAccess, 'file' | 'domain'>> => {
  const matches: Array<Omit<StoreAccess, 'file' | 'domain'>> = [];
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineMatches = line.matchAll(/store\??\.(state|getters|commit|dispatch)/g);
    for (const match of lineMatches) {
      const type = match[1] as StoreAccessType;
      const column = (match.index ?? 0) + 1;
      matches.push({
        line: index + 1,
        column,
        type,
        lineText: line.trim(),
      });
    }
  });

  return matches;
};

export const findStoreAccesses = async (root: string): Promise<StoreAccess[]> => {
  const files: string[] = [];
  await collectFiles(root, root, files);

  const usages: StoreAccess[] = [];

  await Promise.all(
    files.map(async (file) => {
      const relativePath = toPosixRelative(file, root);
      if (INTERNAL_IGNORE.has(relativePath)) return;

      const raw = await fs.readFile(file, 'utf8');

      const occurrences = extractStoreAccesses(raw);
      if (!occurrences.length) return;

      const domain = inferStoreUsageDomain(relativePath);
      occurrences.forEach((occurrence) => {
        usages.push({
          file: relativePath,
          domain,
          ...occurrence,
        });
      });
    })
  );

  usages.sort((a, b) => {
    if (a.domain === b.domain) {
      if (a.file === b.file) {
        return a.line - b.line;
      }
      return a.file.localeCompare(b.file);
    }
    return a.domain.localeCompare(b.domain);
  });

  return usages;
};

export const summarizeStoreAccesses = (accesses: StoreAccess[]): StoreUsageReport => {
  const totalByType = cloneTotals();
  const filesMap = new Map<string, FileSummary>();
  const domainsMap = new Map<
    string,
    {
      domain: string;
      total: number;
      byType: Record<StoreAccessType, number>;
      filesSet: Set<string>;
    }
  >();

  accesses.forEach((access) => {
    totalByType[access.type] += 1;

    const fileEntry =
      filesMap.get(access.file) ??
      (() => {
        const next: FileSummary = {
          file: access.file,
          domain: access.domain,
          total: 0,
          counts: cloneTotals(),
        };
        filesMap.set(access.file, next);
        return next;
      })();

    fileEntry.total += 1;
    fileEntry.counts[access.type] += 1;

    const domainEntry =
      domainsMap.get(access.domain) ??
      (() => {
        const next = {
          domain: access.domain,
          total: 0,
          byType: cloneTotals(),
          filesSet: new Set<string>(),
        };
        domainsMap.set(access.domain, next);
        return next;
      })();

    domainEntry.total += 1;
    domainEntry.byType[access.type] += 1;
    domainEntry.filesSet.add(access.file);
  });

  const files = Array.from(filesMap.values()).sort((a, b) => {
    if (a.domain === b.domain) {
      if (a.total === b.total) return a.file.localeCompare(b.file);
      return b.total - a.total;
    }
    return a.domain.localeCompare(b.domain);
  });

  const domains = Array.from(domainsMap.values()).map((entry) => ({
    domain: entry.domain,
    files: entry.filesSet.size,
    total: entry.total,
    byType: entry.byType,
  }));

  domains.sort((a, b) => {
    if (a.total === b.total) return a.domain.localeCompare(b.domain);
    return b.total - a.total;
  });

  return {
    generatedAt: new Date().toISOString(),
    totalAccesses: accesses.length,
    totalFiles: files.length,
    totalsByType: totalByType,
    domains,
    files,
    entries: accesses,
  };
};

const toTableRow = (values: Array<string | number>): string => `| ${values.join(' | ')} |`;

export const formatMarkdownReport = (report: StoreUsageReport): string => {
  const header = `# Legacy Store Usage Audit

Generated on ${report.generatedAt} via \`yarn analyze:store\`.

## Summary

- Files with direct Vuex store access: ${report.totalFiles}
- Total \`store.state/getters/commit/dispatch\` references: ${report.totalAccesses}
- Access by type: state ${report.totalsByType.state}, getters ${report.totalsByType.getters}, commit ${report.totalsByType.commit}, dispatch ${report.totalsByType.dispatch}

Domains reflect the first meaningful segment within \`src/**\` paths (e.g. \`pages/OrderBook\`, \`modules/pool\`).

## Domain Breakdown

| Domain | Files | Total | state | getters | commit | dispatch |
| ------ | ----- | ----- | ----- | ------- | ------ | -------- |
${report.domains
  .map((domain) =>
    toTableRow([
      domain.domain,
      domain.files,
      domain.total,
      domain.byType.state,
      domain.byType.getters,
      domain.byType.commit,
      domain.byType.dispatch,
    ])
  )
  .join('\n')}

## File Breakdown

| Domain | File | Total | state | getters | commit | dispatch |
| ------ | ---- | ----- | ----- | ------- | ------ | -------- |
${report.files
  .map((file) =>
    toTableRow([
      file.domain,
      file.file,
      file.total,
      file.counts.state,
      file.counts.getters,
      file.counts.commit,
      file.counts.dispatch,
    ])
  )
  .join('\n')}
`;

  return header;
};

const writeFileSafe = async (targetPath: string | undefined, contents: string): Promise<void> => {
  if (!targetPath) return;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents, 'utf8');
};

const toFileUrl = (filePath: string): string => {
  const resolved = path.resolve(filePath);
  const normalized = resolved.replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

export const runStoreUsageAudit = async (options: StoreUsageCliOptions): Promise<StoreUsageReport> => {
  const accesses = await findStoreAccesses(options.root);
  const report = summarizeStoreAccesses(accesses);

  await writeFileSafe(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFileSafe(options.markdownPath, `${formatMarkdownReport(report)}\n`);

  return report;
};

const main = async (): Promise<void> => {
  const options = parseStoreUsageArgs(process.argv.slice(2));
  const report = await runStoreUsageAudit(options);
  console.info(
    `[store-usage] Found ${report.totalAccesses} legacy store references across ${report.totalFiles} files. JSON: ${
      options.jsonPath ?? 'n/a'
    }, Markdown: ${options.markdownPath ?? 'n/a'}`
  );
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
