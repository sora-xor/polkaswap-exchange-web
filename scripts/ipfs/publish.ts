import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const DIST_DIR = join(process.cwd(), 'dist');
const PROD_ENV_CONFIG_FILENAME = 'env.json';
const TESTNET_ENV_CONFIG_FILENAME = 'env.dev.json';
const DEFAULT_LOCAL_GATEWAY_BASE_URL = 'http://127.0.0.1:8080';

export const STATIC_SITE_CACHE_HEADERS = [
  { path: '/', header: 'Cache-Control: no-store' },
  { path: '/index.html', header: 'Cache-Control: no-store' },
  { path: '/env*.json', header: 'Cache-Control: no-cache, must-revalidate' },
  { path: '/marketing.json', header: 'Cache-Control: no-cache, must-revalidate' },
  { path: '/whitelist.json', header: 'Cache-Control: no-cache, must-revalidate' },
  { path: '/blacklist.json', header: 'Cache-Control: no-cache, must-revalidate' },
  { path: '/assets/*', header: 'Cache-Control: public, max-age=31536000, immutable' },
] as const;

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
const NO_SPACE_LEFT_PATTERN = /(ENOSPC|no space left on device|disk full)/i;
const GLOB_PATTERN = /[*?[{\]]/;

type RunCommandOptions = Omit<SpawnSyncOptionsWithStringEncoding, 'encoding'> & {
  encoding?: SpawnSyncOptionsWithStringEncoding['encoding'];
  capture?: boolean;
  silent?: boolean;
};

type CommandResult = Pick<SpawnSyncReturns<string>, 'stdout' | 'stderr'>;
type RunCommandLike = (command: string, args: string[], options?: RunCommandOptions) => CommandResult;

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
 * Determines whether an error matches a known filesystem/process error pattern.
 */
function matchesErrorPattern(error: unknown, pattern: RegExp): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  if (pattern.test(error.message)) {
    return true;
  }

  const { cause } = error as Error & { cause?: unknown };
  if (!cause) {
    return false;
  }

  if (typeof cause === 'string') {
    return pattern.test(cause);
  }

  if (cause instanceof Error) {
    return pattern.test(cause.message);
  }

  if (typeof cause === 'object') {
    const { stdout, stderr } = cause as Partial<SpawnSyncReturns<string>>;
    const combined = `${stdout ?? ''}\n${stderr ?? ''}`;
    if (pattern.test(combined)) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether an error was caused by filesystem permission issues.
 */
export function isPermissionError(error: unknown): boolean {
  return matchesErrorPattern(error, PERMISSION_DENIED_PATTERN);
}

/**
 * Determines whether an error was caused by disk or datastore exhaustion.
 */
export function isNoSpaceLeftError(error: unknown): boolean {
  return matchesErrorPattern(error, NO_SPACE_LEFT_PATTERN);
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

/**
 * Replaces the production environment configuration in a built asset directory
 * with the canonical root-level production config file.
 */
export function swapEnvConfigForProduction(
  distPath: string,
  sourceConfigPath: string = join(process.cwd(), PROD_ENV_CONFIG_FILENAME),
  fsDeps: SwapEnvFsDeps = { existsSync, readFileSync, writeFileSync }
): void {
  const prodConfigPath = join(distPath, PROD_ENV_CONFIG_FILENAME);

  if (!fsDeps.existsSync(sourceConfigPath)) {
    throw new Error(`Missing production environment configuration at ${sourceConfigPath}`);
  }

  const prodConfig = fsDeps.readFileSync(sourceConfigPath, 'utf-8');
  fsDeps.writeFileSync(prodConfigPath, prodConfig);
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

function resolveIpfsRepoPath(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [
    env.IPFS_PATH,
    env.HOME ? join(env.HOME, '.ipfs') : null,
    env.USERPROFILE ? join(env.USERPROFILE, '.ipfs') : null,
  ];

  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates.find((candidate): candidate is string => Boolean(candidate)) ?? null;
}

function extractCid(result: CommandResult, directory: string): string {
  const cid = result.stdout.trim();

  if (!cid) {
    throw new Error(`IPFS did not return a CID for ${directory}. Check the command output above for details.`);
  }

  return cid;
}

/**
 * Pins a root CID recursively after importing the directory into the local repo.
 */
export function pinIpfsCidRecursively(cid: string, runCommandLike: RunCommandLike = runCommand): void {
  runCommandLike('ipfs', ['pin', 'add', '--recursive=true', cid], {
    capture: true,
  });
}

/**
 * Ensures the returned root CID is recorded as a recursive local pin.
 */
export function verifyRecursiveIpfsPin(cid: string, runCommandLike: RunCommandLike = runCommand): void {
  let result: CommandResult;

  try {
    result = runCommandLike('ipfs', ['pin', 'ls', '--type=recursive', '--quiet', cid], {
      capture: true,
      silent: true,
    });
  } catch (error) {
    throw new Error(`IPFS CID ${cid} was added, but it is not recorded as a recursive local pin.`, {
      cause: error,
    });
  }

  const pinnedCids = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!pinnedCids.includes(cid)) {
    throw new Error(`IPFS CID ${cid} was added, but it is not recorded as a recursive local pin.`);
  }
}

/**
 * Announces a published DAG to IPFS routing so public gateways can discover this node as a provider.
 */
export function announceIpfsCidRecursively(cid: string, runCommandLike: RunCommandLike = runCommand): void {
  try {
    runCommandLike('ipfs', ['routing', 'provide', '--recursive', cid], {
      capture: true,
    });
  } catch (error) {
    throw new Error(
      [
        `IPFS CID ${cid} was pinned locally, but the provider announcement failed.`,
        'Make sure `ipfs daemon` is running with network access, then rerun `yarn ipfs:publish`.',
      ].join('\n'),
      { cause: error }
    );
  }
}

function createNoSpaceRecoveryMessage(directory: string, repoPath: string | null, attemptedGc: boolean): string {
  const retryMessage = attemptedGc
    ? 'The script ran `ipfs repo gc` and retried `ipfs add -Qr` once, but the publish still failed.'
    : 'Automatic recovery via `ipfs repo gc` failed before the publish could be retried.';

  return [
    `Local IPFS repository ran out of space while publishing ${directory}.`,
    retryMessage,
    repoPath ? `Repository: ${repoPath}` : null,
    'Free disk space or prune unused IPFS data, then rerun `yarn ipfs:publish`.',
    'Helpful checks: `ipfs repo gc`, `du -sh ~/.ipfs`, `df -h ~/.ipfs`.',
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function addPinVerifyAndAnnounceDirectory(directory: string, run: RunCommandLike): string {
  const cid = extractCid(run('ipfs', ['add', '-Qr', '--pin=false', directory], { capture: true }), directory);
  pinIpfsCidRecursively(cid, run);
  verifyRecursiveIpfsPin(cid, run);
  announceIpfsCidRecursively(cid, run);
  return cid;
}

/**
 * Publishes a directory to the local IPFS repository, retrying once after
 * garbage collection when the datastore runs out of space, then announces the
 * recursive DAG to IPFS routing for public gateway discovery.
 */
export function publishDirectoryToIpfs(
  directory: string,
  deps: {
    runCommand?: RunCommandLike;
    resolveRepoPath?: () => string | null;
  } = {}
): string {
  const run = deps.runCommand ?? runCommand;
  const repoPath = deps.resolveRepoPath?.() ?? resolveIpfsRepoPath();

  try {
    return addPinVerifyAndAnnounceDirectory(directory, run);
  } catch (error) {
    if (!isNoSpaceLeftError(error)) {
      throw error;
    }

    console.warn(
      [
        `IPFS reported no space left on device while publishing ${directory}.`,
        'Running `ipfs repo gc` and retrying `ipfs add -Qr` once...',
        repoPath ? `Repository: ${repoPath}` : null,
      ]
        .filter((line): line is string => Boolean(line))
        .join('\n')
    );

    try {
      run('ipfs', ['repo', 'gc'], { capture: true, silent: true });
    } catch (gcError) {
      throw new Error(createNoSpaceRecoveryMessage(directory, repoPath, false), { cause: gcError });
    }

    try {
      const cid = addPinVerifyAndAnnounceDirectory(directory, run);
      console.warn('IPFS publish recovered after `ipfs repo gc`.');
      return cid;
    } catch (retryError) {
      throw new Error(createNoSpaceRecoveryMessage(directory, repoPath, true), { cause: retryError });
    }
  }
}

/**
 * Converts an IPFS multiaddr into an HTTP gateway base URL.
 */
export function multiaddrToGatewayBaseUrl(multiaddr: string): string | null {
  if (!multiaddr) {
    return null;
  }

  const parts = multiaddr.split('/').filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  let host: string | null = null;
  let isIpv6 = false;

  for (let index = 0; index < parts.length - 1; index++) {
    const segment = parts[index];
    const value = parts[index + 1];
    if (!value) {
      continue;
    }

    if (segment === 'ip4' || segment === 'dns' || segment === 'dns4' || segment === 'dns6') {
      host = value;
      isIpv6 = false;
      break;
    }

    if (segment === 'ip6') {
      host = value;
      isIpv6 = true;
      break;
    }
  }

  const tcpIndex = parts.indexOf('tcp');
  const port = tcpIndex !== -1 ? parts[tcpIndex + 1] : null;
  if (!host || !port || port === '0') {
    return null;
  }

  const normalizedHost = isIpv6 ? `[${host}]` : host;
  return `http://${normalizedHost}:${port}`;
}

/**
 * Normalizes raw gateway values (URL or multiaddr) to an HTTP base URL.
 */
export function normalizeGatewayBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/')) {
    return multiaddrToGatewayBaseUrl(trimmed);
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${parsed.host}${path}`;
  } catch {
    return null;
  }
}

/**
 * Reads an active gateway endpoint from an IPFS repository path when available.
 */
export function resolveGatewayBaseUrlFromRepo(
  repoPath: string,
  fsDeps: FsDeps = { existsSync, readFileSync }
): string | null {
  const gatewayPath = join(repoPath, 'gateway');
  if (!fsDeps.existsSync(gatewayPath)) {
    return null;
  }

  try {
    const gatewayValue = fsDeps.readFileSync(gatewayPath, 'utf-8');
    return normalizeGatewayBaseUrl(gatewayValue);
  } catch {
    return null;
  }
}

function readGatewayMultiaddrFromConfig(): string | null {
  try {
    const { stdout } = runCommand('ipfs', ['config', 'Addresses.Gateway'], { capture: true, silent: true });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

type ResolveLocalGatewayOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  fsDeps?: FsDeps;
  readGatewayAddress?: () => string | null;
};

/**
 * Resolves the local IPFS gateway base URL from runtime state/config.
 */
export function resolveLocalGatewayBaseUrl(options: ResolveLocalGatewayOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const fsDeps = options.fsDeps ?? { existsSync, readFileSync };

  const candidates = Array.from(
    new Set(
      [
        env.IPFS_PATH,
        join(cwd, '.ipfs-workspace'),
        env.HOME ? join(env.HOME, '.ipfs') : null,
        env.USERPROFILE ? join(env.USERPROFILE, '.ipfs') : null,
      ].filter((value): value is string => Boolean(value))
    )
  );

  for (const repoPath of candidates) {
    const gatewayBaseUrl = resolveGatewayBaseUrlFromRepo(repoPath, fsDeps);
    if (gatewayBaseUrl) {
      return gatewayBaseUrl;
    }
  }

  const rawAddress = options.readGatewayAddress ? options.readGatewayAddress() : readGatewayMultiaddrFromConfig();
  const configuredGateway = rawAddress ? normalizeGatewayBaseUrl(rawAddress) : null;
  if (configuredGateway) {
    return configuredGateway;
  }

  return DEFAULT_LOCAL_GATEWAY_BASE_URL;
}

/**
 * Creates a public dweb.link URL for a published IPFS CID.
 */
export function createDwebGatewayUrl(cid: string): string {
  return `https://dweb.link/ipfs/${cid}/index.html`;
}

/**
 * Creates the IPFS directory URL to use as a Bunny pull-zone origin.
 */
export function createBunnyOriginUrl(cid: string, gatewayBaseUrl: string = 'https://ipfs.io'): string {
  return `${gatewayBaseUrl.replace(/\/+$/, '')}/ipfs/${cid}`;
}

/**
 * Creates a local gateway URL for a published IPFS CID.
 */
export function createLocalGatewayUrl(cid: string, baseUrl: string = DEFAULT_LOCAL_GATEWAY_BASE_URL): string {
  return `${baseUrl.replace(/\/+$/, '')}/ipfs/${cid}/index.html`;
}

/**
 * Formats the edge headers required for stale-cache-safe static hosting.
 */
export function formatStaticSiteCacheHeaderRecommendations(): string {
  return [
    'Recommended stable-host cache headers:',
    ...STATIC_SITE_CACHE_HEADERS.map(({ path, header }) => `  ${path} -> ${header}`),
  ].join('\n');
}

function logGatewayUrls(cid: string, label: string, localGatewayBaseUrl: string): void {
  const url = `https://ipfs.io/ipfs/${cid}/index.html`;
  console.log(`\n${label} CID:`, cid);
  console.log(`${label} gateway (ipfs.io):`, url);
  if (label === 'Production') {
    console.log('Production dweb link:', createDwebGatewayUrl(cid));
  }
  console.log(`${label} Bunny origin URL:`, createBunnyOriginUrl(cid));
  console.log(`${label} local gateway:`, createLocalGatewayUrl(cid, localGatewayBaseUrl));
}

function main(): void {
  console.log('Checking IPFS CLI availability...');
  ensureIpfsCli();

  console.log('Ensuring local workspaces are built...');
  buildLocalRepositories();

  console.log('Building production assets (IPFS-friendly base path)...');
  runCommand('yarn', ['build', '--base', './']);

  ensureDistDirectory();
  swapEnvConfigForProduction(DIST_DIR);

  console.log('Publishing production `dist/` to IPFS...');
  const productionCid = publishDirectoryToIpfs(DIST_DIR);
  logGatewayUrls(productionCid, 'Production', resolveLocalGatewayBaseUrl());
  console.log(`\n${formatStaticSiteCacheHeaderRecommendations()}`);

  console.log('Preparing testnet assets from the build output...');
  const { distPath: testnetDistPath, cleanup } = createTestnetDistClone();
  try {
    console.log('Publishing testnet build to IPFS...');
    const testnetCid = publishDirectoryToIpfs(testnetDistPath);
    logGatewayUrls(testnetCid, 'Testnet', resolveLocalGatewayBaseUrl());
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
