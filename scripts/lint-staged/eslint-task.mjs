import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Quotes a file path for safe shell usage in lint-staged commands.
 *
 * @param {string} value
 * @returns {string}
 */
export const quoteShellArgument = (value) => `'${value.replaceAll("'", "'\\''")}'`;

/**
 * Returns the subset of paths that still exist on disk and are not ignored by Git.
 *
 * @param {string[]} files
 * @param {{ fileExists?: (file: string) => boolean; ignoredFiles?: ReadonlySet<string> }} [options]
 * @returns {string[]}
 */
export const selectLintStagedFiles = (files, { fileExists = existsSync, ignoredFiles = new Set() } = {}) =>
  files.filter((file) => fileExists(file) && !ignoredFiles.has(file));

/**
 * Resolves Git-ignored files from a staged file list in a single subprocess.
 *
 * @param {string[]} files
 * @param {{ cwd?: string; execFileSyncImpl?: typeof execFileSync }} [options]
 * @returns {Set<string>}
 */
export const getGitIgnoredFiles = (
  files,
  { cwd = process.cwd(), execFileSyncImpl = execFileSync } = {}
) => {
  if (!files.length) {
    return new Set();
  }

  try {
    const output = execFileSyncImpl('git', ['check-ignore', '--no-index', '--stdin', '-z'], {
      cwd,
      encoding: 'utf8',
      input: `${files.join('\0')}\0`,
      stdio: ['pipe', 'pipe', 'ignore'],
    });

    return new Set(output.split('\0').filter(Boolean));
  } catch (error) {
    if (error?.status === 1) {
      return new Set();
    }

    throw error;
  }
};

/**
 * Creates the ESLint task for lint-staged after removing deleted and git-ignored paths.
 *
 * @param {string[]} files
 * @param {{ cwd?: string; fileExists?: (file: string) => boolean; execFileSyncImpl?: typeof execFileSync }} [options]
 * @returns {string | string[]}
 */
export const createEslintFixCommand = (
  files,
  { cwd = process.cwd(), fileExists = existsSync, execFileSyncImpl = execFileSync } = {}
) => {
  const ignoredFiles = getGitIgnoredFiles(files, { cwd, execFileSyncImpl });
  const lintableFiles = selectLintStagedFiles(files, { fileExists, ignoredFiles });

  if (!lintableFiles.length) {
    return [];
  }

  return `eslint --fix --no-warn-ignored ${lintableFiles.map(quoteShellArgument).join(' ')}`;
};
