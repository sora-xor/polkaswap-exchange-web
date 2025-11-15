import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const DIST_DIR = join(process.cwd(), 'dist');
const PROD_ENV_CONFIG_FILENAME = 'env.json';
const TESTNET_ENV_CONFIG_FILENAME = 'env.dev.json';

interface WorkspaceRepository {
  name: string;
  path: string;
  vuePackageJsons: string[];
  allowMissingOutputs?: boolean;
}

const REPOSITORIES: WorkspaceRepository[] = [];

interface PackageJsonLike {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

type FsDeps = {
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
};

type SwapEnvFsDeps = {
  existsSync: typeof existsSync;
  readFileSync: typeof readFileSync;
  writeFileSync: typeof writeFileSync;
};

const FALLBACK_BUILD_ARGS = ['build'] as const;

const VUE3_BUILD_SCRIPT_CANDIDATES = [/^build(?::|-)vue3$/i, /^build.*vue3$/i];
const PERMISSION_DENIED_PATTERN = /(EPERM|EACCES|permission denied|Operation not permitted)/i;
const GLOB_PATTERN = /[*?[{\]]/;

type RunCommandOptions = Omit<SpawnSyncOptionsWithStringEncoding, 'encoding'> & {
  encoding?: SpawnSyncOptionsWithStringEncoding['encoding'];
  capture?: boolean;
  silent?: boolean;
};

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].join(' ').trim();
}

/**
 * Determines the appropriate build command for a repository, preferring Vue 3 specific scripts.
 */
export function resolveVue3BuildArgs(repoPath: string, fsDeps: FsDeps = { existsSync, readFileSync }): string[] {
  const packageJsonPath = join(repoPath, 'package.json');

  if (!fsDeps.existsSync(packageJsonPath)) {
    return [...FALLBACK_BUILD_ARGS];
  }

  try {
    const parsed = JSON.parse(fsDeps.readFileSync(packageJsonPath, 'utf-8')) as PackageJsonLike;
    const scripts = parsed.scripts ?? {};

    for (const [name] of Object.entries(scripts)) {
      if (VUE3_BUILD_SCRIPT_CANDIDATES[0].test(name)) {
        return [name];
      }
    }

    for (const [name] of Object.entries(scripts)) {
      if (VUE3_BUILD_SCRIPT_CANDIDATES[1].test(name)) {
        return [name];
      }
    }

    if (scripts.build) {
      return ['build'];
    }
  } catch (error) {
    console.warn(`Unable to parse package.json for ${repoPath}:`, error instanceof Error ? error.message : error);
  }

  return [...FALLBACK_BUILD_ARGS];
}

/**
 * Checks whether a package.json file declares Vue with the required major version.
 */
export function hasVueMajorVersion(
  packageJsonPath: string,
  expectedMajor: number,
  fsDeps: FsDeps = { existsSync, readFileSync }
): boolean {
  if (!fsDeps.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(fsDeps.readFileSync(packageJsonPath, 'utf-8')) as PackageJsonLike;
    const version = parsed.dependencies?.vue || parsed.peerDependencies?.vue || parsed.devDependencies?.vue;

    if (!version) {
      return false;
    }

    const match = version.match(/(\d+)/);
    if (!match) {
      return false;
    }

    const major = Number.parseInt(match[1] ?? '', 10);
    return Number.isInteger(major) && major >= expectedMajor;
  } catch (error) {
    console.warn(
      `Unable to parse Vue dependency version from ${packageJsonPath}:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Collects generated assets that must exist when re-using a pre-built dependency.
 */
export function collectMissingOutputs(
  packageJsonPath: string,
  fsDeps: FsDeps = { existsSync, readFileSync }
): string[] {
  if (!fsDeps.existsSync(packageJsonPath)) {
    return [];
  }

  try {
    const raw = fsDeps.readFileSync(packageJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as PackageJsonLike & {
      main?: string;
      module?: string;
      types?: string;
      typings?: string;
      files?: string[];
    };

    const directory = dirname(packageJsonPath);
    const expected = new Set<string>();
    const paths = [parsed.main, parsed.module, parsed.types, parsed.typings].filter(
      (value): value is string => typeof value === 'string' && value.length > 0
    );

    const maybeFiles = Array.isArray(parsed.files) ? parsed.files : [];
    for (const candidate of [...paths, ...maybeFiles]) {
      if (typeof candidate !== 'string' || candidate.length === 0) {
        continue;
      }

      // Skip checks for glob patterns to avoid false negatives.
      if (GLOB_PATTERN.test(candidate)) {
        continue;
      }

      expected.add(join(directory, candidate));
    }

    return [...expected].filter((target) => !fsDeps.existsSync(target));
  } catch (error) {
    console.warn(
      `Unable to inspect generated outputs for ${packageJsonPath}:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Determines whether an error was caused by filesystem permission issues.
 */
export function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (PERMISSION_DENIED_PATTERN.test(error.message)) {
    return true;
  }

  const { cause } = error as Error & { cause?: unknown };
  if (!cause) {
    return false;
  }

  if (typeof cause === 'string') {
    return PERMISSION_DENIED_PATTERN.test(cause);
  }

  if (cause instanceof Error) {
    return PERMISSION_DENIED_PATTERN.test(cause.message);
  }

  if (typeof cause === 'object') {
    const { stdout, stderr } = cause as Partial<SpawnSyncReturns<string>>;
    const combined = `${stdout ?? ''}\n${stderr ?? ''}`;
    if (PERMISSION_DENIED_PATTERN.test(combined)) {
      return true;
    }
  }

  return false;
}

/**
 * Spawns a child process and throws on failure.
 */
function runCommand(command: string, args: string[], options: RunCommandOptions = {}) {
  const { capture = false, silent = false, encoding = 'utf-8', ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    stdio: capture ? 'pipe' : 'inherit',
    shell: false,
    encoding,
    ...spawnOptions,
  });

  if (capture && !silent) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (result.error) {
    throw new Error(`Failed to spawn \`${formatCommand(command, args)}\``, { cause: result.error });
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`Command \`${formatCommand(command, args)}\` exited with code ${result.status}`, {
      cause: result,
    });
  }

  return result;
}

function ensureIpfsCli(): void {
  try {
    runCommand('ipfs', ['--version'], { capture: true });
  } catch (error) {
    throw new Error(
      'The `ipfs` CLI is required. Install it from https://docs.ipfs.tech/how-to/command-line-quick-start/ and ensure it is on your PATH.',
      { cause: error }
    );
  }
}

function ensureDistDirectory(): void {
  if (!existsSync(DIST_DIR)) {
    throw new Error('Missing `dist/` directory. The Vite build likely failed.');
  }
}

function buildLocalRepositories(): void {
  for (const repo of REPOSITORIES) {
    if (!existsSync(repo.path)) {
      console.log(`Skipping ${repo.name} (not found at ${repo.path}).`);
      continue;
    }

    console.log(`Building ${repo.name}...`);
    for (const relativePkg of repo.vuePackageJsons) {
      const packageJsonPath = join(repo.path, relativePkg);
      if (!hasVueMajorVersion(packageJsonPath, 3)) {
        throw new Error(`${repo.name} must declare Vue 3 in ${relativePkg} before publishing to IPFS.`);
      }
    }

    const buildArgs = resolveVue3BuildArgs(repo.path);

    try {
      runCommand('yarn', [], { cwd: repo.path, capture: true });
      console.log(`Running \`yarn ${buildArgs.join(' ')}\` in ${repo.name}.`);
      runCommand('yarn', buildArgs, { cwd: repo.path, capture: true });
    } catch (error) {
      if (isPermissionError(error)) {
        const missingOutputs = repo.vuePackageJsons.flatMap((relativePkg) =>
          collectMissingOutputs(join(repo.path, relativePkg))
        );

        if (missingOutputs.length > 0) {
          if (!repo.allowMissingOutputs) {
            throw new Error(
              [
                `${repo.name} could not be built due to filesystem restrictions and is missing generated assets:`,
                ...missingOutputs.map((target) => ` - ${target}`),
                `Build the repository manually (e.g., \`yarn build\` in ${repo.path}) before publishing.`,
              ].join('\n')
            );
          }

          console.warn(
            [
              `Skipping ${repo.name} build due to filesystem restrictions. Required build outputs are absent:`,
              ...missingOutputs.map((target) => ` - ${target}`),
              'Falling back to source files within the host workspace.',
            ].join('\n')
          );
          continue;
        }

        console.warn(
          `Skipping ${repo.name} build due to filesystem restrictions. Previously generated assets will be reused.`
        );
        continue;
      }

      throw error;
    }
  }
}

/**
 * Replaces the production environment configuration with the testnet settings
 * inside a built asset directory.
 */
export function swapEnvConfigForTestnet(
  distPath: string,
  fsDeps: SwapEnvFsDeps = { existsSync, readFileSync, writeFileSync }
): void {
  const testnetConfigPath = join(distPath, TESTNET_ENV_CONFIG_FILENAME);
  const prodConfigPath = join(distPath, PROD_ENV_CONFIG_FILENAME);

  if (!fsDeps.existsSync(testnetConfigPath)) {
    throw new Error(`Missing testnet environment configuration at ${testnetConfigPath}`);
  }

  const testnetConfig = fsDeps.readFileSync(testnetConfigPath, 'utf-8');
  fsDeps.writeFileSync(prodConfigPath, testnetConfig);
}

function createTestnetDistClone(): { distPath: string; cleanup: () => void } {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'polkaswap-ipfs-testnet-'));
  const targetDist = join(tmpRoot, 'dist');

  try {
    cpSync(DIST_DIR, targetDist, { recursive: true });
    swapEnvConfigForTestnet(targetDist);
  } catch (error) {
    rmSync(tmpRoot, { recursive: true, force: true });
    throw error;
  }

  return {
    distPath: targetDist,
    cleanup: () => {
      rmSync(tmpRoot, { recursive: true, force: true });
    },
  };
}

function publishDirectoryToIpfs(directory: string): string {
  const { stdout } = runCommand('ipfs', ['add', '-Qr', directory], { capture: true });
  const cid = stdout.trim();

  if (!cid) {
    throw new Error(`IPFS did not return a CID for ${directory}. Check the command output above for details.`);
  }

  return cid;
}

function logGatewayUrls(cid: string, label: string): void {
  const url = `https://ipfs.io/ipfs/${cid}/index.html`;
  console.log(`\n${label} CID:`, cid);
  console.log(`${label} gateway (ipfs.io):`, url);
  console.log(`${label} local gateway:`, `http://127.0.0.1:8080/ipfs/${cid}/index.html`);
}

function main(): void {
  console.log('Checking IPFS CLI availability...');
  ensureIpfsCli();

  console.log('Ensuring local workspaces are built...');
  buildLocalRepositories();

  console.log('Building production assets (IPFS-friendly base path)...');
  runCommand('yarn', ['build', '--base', './']);

  ensureDistDirectory();

  console.log('Publishing production `dist/` to IPFS...');
  const productionCid = publishDirectoryToIpfs(DIST_DIR);
  logGatewayUrls(productionCid, 'Production');

  console.log('Preparing testnet assets from the build output...');
  const { distPath: testnetDistPath, cleanup } = createTestnetDistClone();
  try {
    console.log('Publishing testnet build to IPFS...');
    const testnetCid = publishDirectoryToIpfs(testnetDistPath);
    logGatewayUrls(testnetCid, 'Testnet');
  } finally {
    cleanup();
  }
}

if (process.env.VITEST !== 'true') {
  try {
    main();
  } catch (error) {
    console.error('\nFailed to publish build to IPFS.');
    if (error instanceof Error) {
      console.error(error.message);
      if (error.cause) {
        console.error('Caused by:', error.cause);
      }
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}
