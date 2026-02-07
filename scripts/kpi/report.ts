import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateStreak,
  formatDelta,
  formatNumber,
  formatPercent,
  parsePiniaParityTable,
  renderMarkdownRow,
} from './helpers';

type OutputMode = 'json' | 'md';

type CliOptions = {
  output: OutputMode;
  root: string;
  ciPath?: string;
  parityPath: string;
  bundleBaseline: string;
  bundleCurrent: string;
};

type Metrics = {
  classComponents: number | null;
  piniaParity: number | null;
  compatBuildStreak: number | null;
  translationStreak: number | null;
  bundleDelta: number | null;
};

type Report = {
  timestamp: string;
  status: 'green' | 'yellow' | 'red';
  metrics: Metrics;
  notes: string[];
};

type CiStatusFile = {
  compatBuilds?: Array<string | { status: string }>;
  translationTests?: Array<string | { status: string }>;
};

const DEFAULT_PARITY_PATH = 'docs/plans/pinia-store-parity.md';
const DEFAULT_BUNDLE_BASELINE = 'dist/reports/build/stats.json';
const DEFAULT_BUNDLE_CURRENT = 'dist/reports/build-vue3/stats.json';
const TMP_REPORT_PATH = 'tmp/kpi-report.json';
const HISTORY_PATH = 'docs/status/kpi-history.md';

/**
 * Resolves a path relative to the repository root unless it is already absolute.
 */
const resolvePathFromRoot = (root: string, target: string): string =>
  path.isAbsolute(target) ? target : path.join(root, target);

/**
 * Resolves an optional path relative to the repository root.
 */
const resolveOptionalPathFromRoot = (root: string, target?: string): string | undefined =>
  target ? resolvePathFromRoot(root, target) : undefined;

/**
 * Parses CLI arguments for the KPI report script.
 */
const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    output: 'json',
    root: process.cwd(),
    parityPath: DEFAULT_PARITY_PATH,
    bundleBaseline: DEFAULT_BUNDLE_BASELINE,
    bundleCurrent: DEFAULT_BUNDLE_CURRENT,
  };

  for (const arg of argv) {
    if (arg.startsWith('--root=')) {
      options.root = arg.replace('--root=', '');
    } else if (arg.startsWith('--output=')) {
      const value = arg.replace('--output=', '');
      if (value === 'json' || value === 'md') {
        options.output = value;
      }
    } else if (arg.startsWith('--ci=')) {
      options.ciPath = arg.replace('--ci=', '');
    } else if (arg.startsWith('--parity=')) {
      options.parityPath = arg.replace('--parity=', '');
    } else if (arg.startsWith('--bundle-baseline=')) {
      options.bundleBaseline = arg.replace('--bundle-baseline=', '');
    } else if (arg.startsWith('--bundle-current=')) {
      options.bundleCurrent = arg.replace('--bundle-current=', '');
    } else if (arg === '--help' || arg === '-h') {
      console.info(`Usage: yarn kpi:report [options]

Options:
  --output=json|md          Choose JSON (default) or Markdown output
  --ci=<file>               Optional CI status JSON file
  --root=<path>             Repository root (default: current working directory)
  --parity=<file>           Path to Pinia parity checklist (default: ${DEFAULT_PARITY_PATH})
  --bundle-baseline=<file>  Bundle stats baseline path (default: ${DEFAULT_BUNDLE_BASELINE})
  --bundle-current=<file>   Bundle stats comparison path (default: ${DEFAULT_BUNDLE_CURRENT})
`);
      process.exit(0);
    }
  }

  return {
    ...options,
    root: path.resolve(options.root),
  };
};

const readFileSafe = async (filePath: string): Promise<string | null> => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch {
    return null;
  }
};

/**
 * Recursively collect Vue SFC paths beneath the provided root.
 */
const collectVueFiles = async (root: string): Promise<string[]> => {
  const stack: string[] = [root];
  const files: string[] = [];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    let entries: Awaited<ReturnType<typeof fs.readdir>>;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.vue')) {
        files.push(fullPath);
      }
    }
  }
  return files;
};

/**
 * Counts Vue SFCs that still rely on class-style components.
 */
const countClassComponents = async (root: string): Promise<number> => {
  const files = await collectVueFiles(path.join(root, 'src'));
  let total = 0;
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf8');
      if (content.includes('@Component')) total++;
    } catch {
      // ignore read errors
    }
  }
  return total;
};

/**
 * Loads CI status arrays from a JSON file exported by the pipeline.
 */
const loadCiStatuses = async (
  filePath?: string
): Promise<{
  compat?: Array<string | { status: string }>;
  translation?: Array<string | { status: string }>;
}> => {
  if (!filePath) return {};
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data) as CiStatusFile;
    return {
      compat: parsed.compatBuilds,
      translation: parsed.translationTests,
    };
  } catch {
    return {};
  }
};

const normalizeStreak = (values?: Array<string | { status: string }>): number | null =>
  Array.isArray(values) ? calculateStreak(values) : null;

/**
 * Reads the Pinia parity table and returns the completion ratio, noting failures.
 */
const readParityRatio = async (filePath: string, notes: string[]): Promise<number | null> => {
  const content = await readFileSafe(filePath);
  if (!content) {
    notes.push(`Parity checklist missing at ${filePath}`);
    return null;
  }
  const { ratio } = parsePiniaParityTable(content);
  if (ratio === null) {
    notes.push('Unable to compute Pinia parity ratio (no entries).');
  }
  return ratio;
};

const sumBundleSize = (data: any): number | null => {
  if (!data) return null;
  if (typeof data.totalSize === 'number') return data.totalSize;
  if (Array.isArray(data.assets)) {
    return data.assets.reduce((sum: number, asset: any) => sum + (typeof asset.size === 'number' ? asset.size : 0), 0);
  }
  return null;
};

const readJson = async (filePath: string): Promise<any | null> => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Computes bundle size delta given baseline and current stats files.
 */
const computeBundleDelta = async (
  baselinePath: string,
  currentPath: string,
  notes: string[]
): Promise<number | null> => {
  const [baselineData, currentData] = await Promise.all([readJson(baselinePath), readJson(currentPath)]);
  if (!baselineData || !currentData) {
    notes.push('Bundle stats missing; cannot compute delta.');
    return null;
  }
  const baselineSize = sumBundleSize(baselineData);
  const currentSize = sumBundleSize(currentData);
  if (baselineSize === null || currentSize === null || baselineSize === 0) {
    notes.push('Bundle stats incomplete; cannot compute delta.');
    return null;
  }
  return (currentSize - baselineSize) / baselineSize;
};

const deriveStatus = (metrics: Metrics): Report['status'] => {
  if (
    metrics.compatBuildStreak !== null &&
    metrics.translationStreak !== null &&
    metrics.compatBuildStreak >= 5 &&
    metrics.translationStreak >= 3
  ) {
    return 'green';
  }
  if (
    metrics.compatBuildStreak !== null &&
    metrics.translationStreak !== null &&
    (metrics.compatBuildStreak === 0 || metrics.translationStreak === 0)
  ) {
    return 'red';
  }
  return 'yellow';
};

const ensureHistoryHeader = async (filePath: string): Promise<void> => {
  try {
    await fs.access(filePath);
  } catch {
    const header = `# KPI History

| Date | Status | Class Components | Pinia Parity | Compat Streak | Translation Streak | Bundle Delta |
| ---- | ------ | ---------------- | ------------ | ------------- | ------------------ | ------------ |
`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, header, 'utf8');
  }
};

const writeHistory = async (report: Report, root: string): Promise<void> => {
  const historyPath = resolvePathFromRoot(root, HISTORY_PATH);
  await ensureHistoryHeader(historyPath);
  const row = renderMarkdownRow(report);
  await fs.appendFile(historyPath, `${row}\n`, 'utf8');
};

const writeJsonReport = async (report: Report, root: string): Promise<void> => {
  const reportPath = resolvePathFromRoot(root, TMP_REPORT_PATH);
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

/**
 * Collects KPI metrics from the repository and CI artefacts.
 */
const collectMetrics = async (options: CliOptions): Promise<Report> => {
  const notes: string[] = [];
  const classComponents = await countClassComponents(options.root);
  const parityPath = resolvePathFromRoot(options.root, options.parityPath);
  const piniaParity = await readParityRatio(parityPath, notes);

  const ciPath = resolveOptionalPathFromRoot(options.root, options.ciPath);
  const ciStatuses = await loadCiStatuses(ciPath);
  if (!ciPath) {
    notes.push('CI status file not provided; streaks set to null.');
  } else if (!ciStatuses.compat && !ciStatuses.translation) {
    notes.push(`CI status file missing or unreadable at ${ciPath}`);
  }
  const compatBuildStreak = normalizeStreak(ciStatuses.compat);
  const translationStreak = normalizeStreak(ciStatuses.translation);
  const bundleDelta = await computeBundleDelta(
    resolvePathFromRoot(options.root, options.bundleBaseline),
    resolvePathFromRoot(options.root, options.bundleCurrent),
    notes
  );

  const metrics: Metrics = {
    classComponents,
    piniaParity,
    compatBuildStreak,
    translationStreak,
    bundleDelta,
  };

  return {
    timestamp: new Date().toISOString(),
    status: deriveStatus(metrics),
    metrics,
    notes,
  };
};

/**
 * Builds a Markdown summary for the report.
 */
const renderMarkdown = (report: Report): string => {
  const lines = [
    `### KPI Report (${report.timestamp})`,
    ``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Class components remaining: ${report.metrics.classComponents ?? '-'}`,
    `- Pinia parity: ${formatPercent(report.metrics.piniaParity)}`,
    `- Compat build streak: ${report.metrics.compatBuildStreak ?? '-'}`,
    `- Translation streak: ${report.metrics.translationStreak ?? '-'}`,
    `- Bundle delta: ${formatDelta(report.metrics.bundleDelta)}`,
  ];
  if (report.notes.length) {
    lines.push('', '**Notes:**');
    for (const note of report.notes) {
      lines.push(`- ${note}`);
    }
  }
  return lines.join('\n');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const report = await collectMetrics(options);
  await writeJsonReport(report, options.root);
  await writeHistory(report, options.root);

  if (options.output === 'md') {
    console.info(renderMarkdown(report));
  } else {
    console.info(JSON.stringify(report, null, 2));
  }
};

const isCli = (() => {
  const modulePath = fileURLToPath(import.meta.url);
  const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return modulePath === invoked;
})();

if (isCli) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { renderMarkdown, collectMetrics };
export { renderMarkdownRow } from './helpers';
