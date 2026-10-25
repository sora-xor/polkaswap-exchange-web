import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { findCompatUsage, partitionCompatUsage } from './compat-alias';

export type CompatSmokeOptions = {
  root: string;
  aliasReportPath: string;
  testPattern: string;
  skipTests: boolean;
  skipBundleReport: boolean;
};

export type CompatSmokeCliOptions = CompatSmokeOptions;

const DEFAULT_ALIAS_REPORT = 'dist/reports/compat-alias-report.json';
const DEFAULT_TEST_PATTERN = 'Smoke';

type CommandSpec = {
  command: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
};

const HELP_TEXT = `Usage: yarn compat:smoke [options]

Options:
  --root=<path>             Override the working directory (defaults to repository root)
  --alias-report=<path>     Path for the compat alias JSON report (default: ${DEFAULT_ALIAS_REPORT})
  --test-pattern=<pattern>  Vitest --namePattern used for smoke subset (default: ${DEFAULT_TEST_PATTERN})
  --skip-tests              Skip running the smoke test subset
  --skip-bundle-report      Skip generating the bundle size report via scripts/analyze/bundle.ts
  --help                    Show this message
`;

const normalizePath = (root: string, targetPath: string): string => {
  if (!targetPath) {
    return root;
  }
  if (path.isAbsolute(targetPath)) {
    return path.normalize(targetPath);
  }
  return path.normalize(path.join(root, targetPath));
};

const toFileUrl = (filePath: string): string => {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return `file:///${normalized}`;
  }
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

/**
 * Parse CLI arguments for the compat smoke runner.
 */
export const parseCompatSmokeArgs = (argv: string[]): CompatSmokeCliOptions => {
  let root = process.cwd();
  let aliasReport = DEFAULT_ALIAS_REPORT;
  let testPattern = DEFAULT_TEST_PATTERN;
  let skipTests = false;
  let skipBundleReport = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      console.info(HELP_TEXT);
      process.exit(0);
    } else if (arg === '--skip-tests') {
      skipTests = true;
    } else if (arg === '--skip-bundle-report') {
      skipBundleReport = true;
    } else if (arg.startsWith('--root=')) {
      const [, value] = arg.split('=');
      if (!value) {
        throw new Error('Missing value for --root option');
      }
      root = path.resolve(process.cwd(), value);
    } else if (arg.startsWith('--alias-report=')) {
      const [, value] = arg.split('=');
      if (!value) {
        throw new Error('Missing value for --alias-report option');
      }
      aliasReport = value;
    } else if (arg.startsWith('--test-pattern=')) {
      const [, value] = arg.split('=');
      if (!value) {
        throw new Error('Missing value for --test-pattern option');
      }
      testPattern = value;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  const resolvedRoot = path.resolve(root);
  const resolvedAliasReport = normalizePath(resolvedRoot, aliasReport);

  return {
    root: resolvedRoot,
    aliasReportPath: resolvedAliasReport,
    testPattern,
    skipTests,
    skipBundleReport,
  };
};

const runCommand = ({ command, args, env }: CommandSpec, cwd: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        const reason = typeof code === 'number' ? `exit code ${code}` : `signal ${signal ?? 'unknown signal'}`;
        reject(new Error(`${command} ${args.join(' ')} failed with ${reason}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });

export const createBuildCommand = (): CommandSpec => ({
  command: 'yarn',
  args: ['build:vue3'],
});

export const createVitestCommand = (pattern: string): CommandSpec => {
  const args = [
    'vitest',
    'run',
    '--project',
    'unit',
    '--no-file-parallelism',
    '--maxWorkers',
    '1',
    '--passWithNoTests',
  ];
  if (pattern) {
    args.push('--testNamePattern', pattern);
  }
  return {
    command: 'yarn',
    args,
    env: {},
  };
};

export const createBundleReportCommand = (): CommandSpec => ({
  command: 'yarn',
  args: ['tsx', 'scripts/analyze/bundle.ts'],
});

const writeAliasReport = async (root: string, outputPath: string): Promise<{ allowed: number; violations: number }> => {
  const usages = await findCompatUsage(root);
  const { allowed, violations } = partitionCompatUsage(usages);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        root,
        aliasReportPath: path.relative(root, outputPath),
        totals: {
          matches: usages.length,
          allowed: allowed.length,
          violations: violations.length,
        },
        allowed,
        violations,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  if (violations.length > 0) {
    const violationSummary = violations
      .map((violation) => `${violation.file}:${violation.line} -> ${violation.module}`)
      .join('\n');
    throw new Error(
      `Compat usage outside the allow-list detected:\n${violationSummary}\n` + `See ${outputPath} for details.`
    );
  }

  return { allowed: allowed.length, violations: 0 };
};

/**
 * Execute the compat smoke workflow: build, optional smoke tests, bundle report, alias report.
 */
export const runCompatSmoke = async (options: CompatSmokeOptions): Promise<void> => {
  console.info('Running native Vue 3 smoke build...');
  await runCommand(createBuildCommand(), options.root);

  if (!options.skipTests) {
    console.info('Executing smoke test subset...');
    await runCommand(createVitestCommand(options.testPattern), options.root);
  }

  if (!options.skipBundleReport) {
    console.info('Generating bundle report...');
    await runCommand(createBundleReportCommand(), options.root);
  }

  console.info('Producing compat alias report...');
  const { allowed } = await writeAliasReport(options.root, options.aliasReportPath);

  console.info(
    `Compat smoke completed: build ok, ${
      options.skipTests ? 'tests skipped' : 'smoke tests passed'
    }, ${allowed} allowed compat references recorded.`
  );
};

const main = async (): Promise<void> => {
  const options = parseCompatSmokeArgs(process.argv.slice(2));
  await runCompatSmoke(options);
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
