import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process';
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_TORII_URL = 'https://taira.sora.org';
const DEFAULT_ENV_CONFIG_FILENAME = 'env.taira.json';
const DEFAULT_IDENTITY_TOKEN_ENV = 'SIGSTORE_ID_TOKEN';
const DEFAULT_IROHA_DIR = '../iroha';
const DEFAULT_CLIENT_CHAIN_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_TAIRA_CHAIN_ID = '809574f5-fee7-5e69-bfcf-52451e42d50f';
const DEFAULT_TAIRA_NETWORK_PREFIX = '369';
const DEFAULT_ACCOUNT_DOMAIN = 'wonderland.universal';
const DEFAULT_BASIC_AUTH_LOGIN = 'mad_hatter';
const DEFAULT_BASIC_AUTH_PASSWORD = 'ilovetea';
const DIST_DIR = join(process.cwd(), 'dist');
const PUBLIC_DIR = join(process.cwd(), 'public');
const ENV_OUTPUT_FILENAME = 'env.json';

type DeployCommand = 'package' | 'proposal' | 'publish' | 'probe';

type CommandResult = Pick<SpawnSyncReturns<string>, 'stdout' | 'stderr'>;

type RunCommandOptions = Omit<SpawnSyncOptionsWithStringEncoding, 'encoding'> & {
  capture?: boolean;
  encoding?: SpawnSyncOptionsWithStringEncoding['encoding'];
};

type EnvLike = Record<string, string | undefined>;
type JsonObject = Record<string, unknown>;

type ParsedCliArgs = {
  command: DeployCommand;
  options: Record<string, string | boolean>;
};

type BuildToolCommand = {
  command: string;
  args: string[];
  cwd: string;
};

type ArtifactPaths = {
  artifactDir: string;
  stageDir: string;
  carPath: string;
  planPath: string;
  carSummaryPath: string;
  manifestPath: string;
  manifestJsonPath: string;
  proofSummaryPath: string;
  proposalPath: string;
  bundlePath: string;
  signaturePath: string;
  signSummaryPath: string;
  submitSummaryPath: string;
  submitResponsePath: string;
  storagePinSummaryPath: string;
  storagePinResponsePath: string;
  routePlanPath: string;
  routeHeadersPath: string;
  siteBindingPath: string;
  packageSummaryPath: string;
  probeSummaryPath: string;
};

type PackageCommandContext = {
  sorafsCli: BuildToolCommand;
  paths: ArtifactPaths;
};

type PublishCommandContext = PackageCommandContext & {
  routePlanCli: BuildToolCommand;
  clientConfigPath: string;
  siteHostname?: string;
  authority: string;
  submittedEpoch: string;
  networkPrefix?: string;
  privateKey?: string;
  privateKeyFile?: string;
};

type DeployConfig = {
  command: DeployCommand;
  toriiUrl: string;
  hostname: string;
  chainId: string;
  networkPrefix?: string;
  siteHostname?: string;
  envConfig: string;
  artifactRoot: string;
  artifactDir: string;
  irohaDir: string;
  identityTokenEnv: string;
  authority?: string;
  privateKey?: string;
  privateKeyFile?: string;
  submittedEpoch?: string;
  siteBindingsFile?: string;
};

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].join(' ').trim();
}

function toUtcTimestamp(date = new Date()): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function sanitizeArtifactSegment(value: string): string {
  return value.replace(/[^a-z0-9.-]+/gi, '_');
}

/**
 * Returns the hostname that should be routed publicly for a Torii endpoint.
 */
export function deriveHostnameFromToriiUrl(toriiUrl: string): string {
  return new URL(toriiUrl).hostname;
}

/**
 * Builds the timestamped artifact directory for a publish target.
 */
export function createArtifactDirectory(artifactRoot: string, hostname: string, timestamp: string): string {
  return join(resolve(artifactRoot), 'artifacts', 'sorafs', sanitizeArtifactSegment(hostname), timestamp);
}

/**
 * Encodes bytes using lowercase RFC4648 base32 without padding.
 */
export function encodeBase32Lower(data: readonly number[]): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  if (data.length === 0) {
    return '';
  }

  let acc = 0;
  let bits = 0;
  let out = '';

  for (const byte of data) {
    acc = (acc << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      out += alphabet[(acc >> (bits - 5)) & 0x1f] ?? '';
      bits -= 5;
    }
  }

  if (bits > 0) {
    out += alphabet[(acc << (5 - bits)) & 0x1f] ?? '';
  }

  return out;
}

/**
 * Resolves the canonical multibase CID from a manifest JSON payload.
 */
export function resolveContentCidFromManifestValue(manifestValue: JsonObject): string {
  const rootCid = manifestValue.root_cid;

  if (!Array.isArray(rootCid) || rootCid.length === 0) {
    throw new Error('manifest JSON is missing `root_cid`.');
  }

  const bytes = rootCid.map((value) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('manifest JSON contains an invalid `root_cid` byte.');
    }

    return value;
  });

  return `b${encodeBase32Lower(bytes)}`;
}

/**
 * Returns the canonical CID gateway path for a published site bundle.
 */
export function createCidGatewayPath(contentCid: string): string {
  return `/sorafs/cid/${contentCid.trim()}/`;
}

/**
 * Returns the full CID gateway URL for a Torii origin.
 */
export function createCidGatewayUrl(toriiUrl: string, contentCid: string): string {
  return new URL(createCidGatewayPath(contentCid), new URL(toriiUrl).origin).toString();
}

function isDefaultTairaHostname(hostname: string): boolean {
  return hostname === deriveHostnameFromToriiUrl(DEFAULT_TORII_URL);
}

/**
 * Validates the staged runtime config so SoraFS publishes do not ship obviously dead node lists.
 */
export function validateRuntimeEnvConfig(envConfigFilename: string, envConfigValue: JsonObject): void {
  const defaultNetworks = envConfigValue.DEFAULT_NETWORKS;

  if (!Array.isArray(defaultNetworks) || defaultNetworks.length === 0) {
    throw new Error(`Runtime config \`${envConfigFilename}\` is missing \`DEFAULT_NETWORKS\`.`);
  }

  const addresses = defaultNetworks
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '';
      return typeof (entry as Record<string, unknown>).address === 'string'
        ? String((entry as Record<string, unknown>).address).trim()
        : '';
    })
    .filter(Boolean);

  if (!addresses.length) {
    throw new Error(`Runtime config \`${envConfigFilename}\` does not define any node websocket addresses.`);
  }

  const invalidAddresses = addresses.filter((address) => !/^wss?:\/\//i.test(address));

  if (invalidAddresses.length) {
    throw new Error(
      `Runtime config \`${envConfigFilename}\` contains invalid node addresses: ${invalidAddresses.join(', ')}.`
    );
  }

  if (envConfigFilename !== DEFAULT_ENV_CONFIG_FILENAME) {
    return;
  }

  const networkType = typeof envConfigValue.NETWORK_TYPE === 'string' ? envConfigValue.NETWORK_TYPE.trim() : '';
  const chainGenesisHash =
    typeof envConfigValue.CHAIN_GENESIS_HASH === 'string' ? envConfigValue.CHAIN_GENESIS_HASH.trim() : '';
  const usesLegacyDevNodes = addresses.some((address) =>
    /(?:^|\.)(?:predev|dev)\.sora2\.soramitsu\.co\.jp/i.test(new URL(address).hostname)
  );

  if (usesLegacyDevNodes && networkType === 'Dev' && !chainGenesisHash) {
    throw new Error(
      '`public/env.taira.json` still points at legacy SORA dev websocket nodes. Point the Taira-hosted Polkaswap build at live Substrate websocket endpoints before publishing.'
    );
  }
}

/**
 * Resolves the SoraFS artifact paths for a single packaging run.
 */
export function createArtifactPaths(artifactDir: string): ArtifactPaths {
  return {
    artifactDir,
    stageDir: join(artifactDir, 'site'),
    carPath: join(artifactDir, 'site.car'),
    planPath: join(artifactDir, 'site.plan.json'),
    carSummaryPath: join(artifactDir, 'site.car.summary.json'),
    manifestPath: join(artifactDir, 'site.manifest.to'),
    manifestJsonPath: join(artifactDir, 'site.manifest.json'),
    proofSummaryPath: join(artifactDir, 'site.proof.summary.json'),
    proposalPath: join(artifactDir, 'site.pin.proposal.json'),
    bundlePath: join(artifactDir, 'site.manifest.bundle.json'),
    signaturePath: join(artifactDir, 'site.manifest.sig'),
    signSummaryPath: join(artifactDir, 'site.sign.summary.json'),
    submitSummaryPath: join(artifactDir, 'site.submit.summary.json'),
    submitResponsePath: join(artifactDir, 'site.submit.response.json'),
    storagePinSummaryPath: join(artifactDir, 'site.storage_pin.summary.json'),
    storagePinResponsePath: join(artifactDir, 'site.storage_pin.response.json'),
    routePlanPath: join(artifactDir, 'site.gateway.route_plan.json'),
    routeHeadersPath: join(artifactDir, 'site.gateway.headers.txt'),
    siteBindingPath: join(artifactDir, 'site.binding.json'),
    packageSummaryPath: join(artifactDir, 'package.summary.json'),
    probeSummaryPath: join(artifactDir, 'probe.summary.json'),
  };
}

/**
 * Validates and resolves the authority/private-key arguments for publishing.
 */
export function resolvePublishCredentials(
  options: Pick<DeployConfig, 'authority' | 'privateKey' | 'privateKeyFile'>,
  env: EnvLike
) {
  const authority = (options.authority ?? env.SORAFS_AUTHORITY)?.normalize('NFKC').trim();
  const privateKey = options.privateKey ?? (options.privateKeyFile ? undefined : env.SORAFS_PRIVATE_KEY);
  const privateKeyFile = options.privateKeyFile ?? (options.privateKey ? undefined : env.SORAFS_PRIVATE_KEY_FILE);

  if (!authority) {
    throw new Error('Missing publish authority. Set `SORAFS_AUTHORITY` or pass `--authority`.');
  }

  if (privateKey && privateKeyFile) {
    throw new Error('Use exactly one of `SORAFS_PRIVATE_KEY` or `SORAFS_PRIVATE_KEY_FILE`.');
  }

  if (!privateKey && !privateKeyFile) {
    throw new Error('Missing private key. Set `SORAFS_PRIVATE_KEY` or `SORAFS_PRIVATE_KEY_FILE`.');
  }

  return { authority, privateKey, privateKeyFile };
}

/**
 * Returns true when a Sigstore identity token is available for signing.
 */
export function shouldSignManifest(env: EnvLike, identityTokenEnv = DEFAULT_IDENTITY_TOKEN_ENV): boolean {
  return Boolean(env[identityTokenEnv]);
}

/**
 * Builds the package-step commands around the SoraFS CLI.
 */
export function buildPackageCommandSpecs(
  context: PackageCommandContext,
  signManifest: boolean,
  identityTokenEnv: string
) {
  const specs = [
    {
      ...context.sorafsCli,
      args: [
        ...context.sorafsCli.args,
        'car',
        'pack',
        `--input=${context.paths.stageDir}`,
        `--car-out=${context.paths.carPath}`,
        `--plan-out=${context.paths.planPath}`,
        `--summary-out=${context.paths.carSummaryPath}`,
      ],
    },
    {
      ...context.sorafsCli,
      args: [
        ...context.sorafsCli.args,
        'manifest',
        'build',
        `--summary=${context.paths.carSummaryPath}`,
        `--manifest-out=${context.paths.manifestPath}`,
        `--manifest-json-out=${context.paths.manifestJsonPath}`,
      ],
    },
    {
      ...context.sorafsCli,
      args: [
        ...context.sorafsCli.args,
        'proof',
        'verify',
        `--manifest=${context.paths.manifestPath}`,
        `--car=${context.paths.carPath}`,
        `--chunk-plan=${context.paths.planPath}`,
        `--summary-out=${context.paths.proofSummaryPath}`,
      ],
    },
  ];

  if (signManifest) {
    specs.push({
      ...context.sorafsCli,
      args: [
        ...context.sorafsCli.args,
        'manifest',
        'sign',
        `--manifest=${context.paths.manifestPath}`,
        `--chunk-plan=${context.paths.planPath}`,
        `--bundle-out=${context.paths.bundlePath}`,
        `--signature-out=${context.paths.signaturePath}`,
        `--identity-token-env=${identityTokenEnv}`,
      ],
    });
  }

  return specs;
}

/**
 * Builds the governance proposal command for a packaged SoraFS site.
 */
export function buildProposalCommandSpec(context: PackageCommandContext, submittedEpoch: string) {
  return {
    ...context.sorafsCli,
    args: [
      ...context.sorafsCli.args,
      'manifest',
      'proposal',
      `--manifest=${context.paths.manifestPath}`,
      `--chunk-plan=${context.paths.planPath}`,
      `--submitted-epoch=${submittedEpoch}`,
      `--proposal-out=${context.paths.proposalPath}`,
    ],
  };
}

/**
 * Builds the publish-step commands for manifest submission and route planning.
 */
export function buildPublishCommandSpecs(context: PublishCommandContext) {
  const proposalSpec = buildProposalCommandSpec(context, context.submittedEpoch);
  const submitArgs = [
    ...context.sorafsCli.args,
    'manifest',
    'submit',
    `--manifest=${context.paths.manifestPath}`,
    `--torii-url=${context.toriiUrl}`,
    `--chunk-plan=${context.paths.planPath}`,
    `--authority=${context.authority}`,
    `--submitted-epoch=${context.submittedEpoch}`,
    `--summary-out=${context.paths.submitSummaryPath}`,
    `--response-out=${context.paths.submitResponsePath}`,
  ];

  if (context.privateKey) {
    submitArgs.push(`--private-key=${context.privateKey}`);
  }

  if (context.privateKeyFile) {
    submitArgs.push(`--private-key-file=${context.privateKeyFile}`);
  }

  if (context.networkPrefix?.trim()) {
    submitArgs.push(`--network-prefix=${context.networkPrefix.trim()}`);
  }

  const specs = [
    proposalSpec,
    {
      ...context.sorafsCli,
      args: submitArgs,
    },
    {
      ...context.routePlanCli,
      args: [
        ...context.routePlanCli.args,
        '--machine',
        `--config=${context.clientConfigPath}`,
        'app',
        'sorafs',
        'storage',
        'pin',
        `--manifest=${context.paths.manifestPath}`,
        `--payload=${context.paths.stageDir}`,
      ],
    },
  ];

  if (context.siteHostname) {
    specs.push({
      ...context.routePlanCli,
      args: [
        ...context.routePlanCli.args,
        '--machine',
        'app',
        'sorafs',
        'gateway',
        'route-plan',
        `--manifest-json=${context.paths.manifestJsonPath}`,
        `--hostname=${context.siteHostname}`,
        `--route-label=static-site`,
        `--release-tag=${sanitizeArtifactSegment(context.siteHostname)}-${toUtcTimestamp()}`,
        `--headers-out=${context.paths.routeHeadersPath}`,
        `--out=${context.paths.routePlanPath}`,
      ],
    });
  }

  return specs;
}

function parseCliArgs(argv: string[]): ParsedCliArgs {
  const [commandValue, ...rest] = argv;

  if (!commandValue || !['package', 'proposal', 'publish', 'probe'].includes(commandValue)) {
    throw new Error('Usage: tsx ./scripts/sorafs/deploy.ts <package|proposal|publish|probe> [--flag value]');
  }

  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const entry = rest[index];
    if (!entry?.startsWith('--')) {
      throw new Error(`Unexpected argument \`${entry}\`.`);
    }

    const [flag, inlineValue] = entry.split('=', 2);
    const key = flag.slice(2);

    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { command: commandValue as DeployCommand, options };
}

function resolveCompiledBinaryPath(irohaDir: string, binaryName: 'sorafs_cli' | 'iroha') {
  const candidates: string[] = [];
  const cargoTargetDir = process.env.CARGO_TARGET_DIR?.trim();
  const resolvedIrohaDir = resolve(irohaDir);
  const binaryAliases = binaryName === 'iroha' ? ['iroha', 'iroha3', 'iroha_cli'] : [binaryName];

  if (cargoTargetDir) {
    const resolvedTargetDir = resolve(cargoTargetDir);
    for (const alias of binaryAliases) {
      candidates.push(join(resolvedTargetDir, 'debug', alias), join(resolvedTargetDir, 'release', alias));
    }
  }

  for (const alias of binaryAliases) {
    candidates.push(join(resolvedIrohaDir, 'target', 'debug', alias), join(resolvedIrohaDir, 'target', 'release', alias));
  }

  return candidates.find((candidate) => existsSync(candidate));
}

export function resolveBuildToolCommand(irohaDir: string, binaryName: 'sorafs_cli' | 'iroha'): BuildToolCommand {
  const resolvedIrohaDir = resolve(irohaDir);
  const binaryPath = resolveCompiledBinaryPath(resolvedIrohaDir, binaryName);

  if (binaryPath) {
    return { command: binaryPath, args: [], cwd: resolvedIrohaDir };
  }

  if (binaryName === 'sorafs_cli') {
    return {
      command: 'cargo',
      args: ['run', '-p', 'sorafs_orchestrator', '--bin', 'sorafs_cli', '--'],
      cwd: resolvedIrohaDir,
    };
  }

  return {
    command: 'cargo',
    args: ['run', '-p', 'iroha_cli', '--bin', 'iroha3', '--'],
    cwd: resolvedIrohaDir,
  };
}

function runCommand(command: string, args: string[], options: RunCommandOptions = {}): CommandResult {
  const { capture = false, encoding = 'utf-8', ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    stdio: capture ? 'pipe' : 'inherit',
    shell: false,
    encoding,
    ...spawnOptions,
  });

  if (result.error) {
    throw new Error(`Failed to spawn \`${formatCommand(command, args)}\``, { cause: result.error });
  }

  if (capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`Command \`${formatCommand(command, args)}\` exited with code ${result.status}`, {
      cause: result,
    });
  }

  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function ensureFileExists(path: string, message: string) {
  if (!existsSync(path)) {
    throw new Error(message);
  }
}

function stageDistBundle(stageDir: string, envConfigFilename: string) {
  const envSourcePath = join(PUBLIC_DIR, envConfigFilename);
  const envTargetPath = join(stageDir, ENV_OUTPUT_FILENAME);

  ensureFileExists(DIST_DIR, `Missing \`${DIST_DIR}\`. Run the build before packaging.`);
  ensureFileExists(envSourcePath, `Missing runtime config \`${envSourcePath}\`.`);

  const envConfigValue = readJsonFile<JsonObject>(envSourcePath);
  validateRuntimeEnvConfig(envConfigFilename, envConfigValue);

  cpSync(DIST_DIR, stageDir, { recursive: true });
  writeFileSync(envTargetPath, `${JSON.stringify(envConfigValue, null, 2)}\n`);
}

function writeJson(path: string, value: unknown) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function createStoragePinSummary(config: DeployConfig, paths: ArtifactPaths) {
  const response = readJsonFile<Record<string, unknown>>(paths.storagePinResponsePath);

  return {
    torii_url: config.toriiUrl,
    torii_hostname: config.hostname,
    site_hostname: config.siteHostname ?? null,
    manifest: paths.manifestPath,
    payload: paths.stageDir,
    response,
  };
}

export function createSiteBindingDocument(hostname: string, manifestDigestHex: string) {
  return {
    version: 1,
    sites: [
      {
        hostname,
        manifest_digest_hex: manifestDigestHex,
        index_document: 'index.html',
        spa_fallback: true,
      },
    ],
  };
}

export function upsertSiteBindingsFile(path: string, hostname: string, manifestDigestHex: string) {
  const current = existsSync(path)
    ? (readJsonFile<{ version?: number; sites?: Array<Record<string, unknown>> }>(path) ?? {})
    : {};
  const sites = Array.isArray(current.sites) ? current.sites.filter((entry) => entry.hostname !== hostname) : [];
  sites.push({
    hostname,
    manifest_digest_hex: manifestDigestHex,
    index_document: 'index.html',
    spa_fallback: true,
  });
  mkdirSync(dirname(path), { recursive: true });
  writeJson(path, {
    version: current.version ?? 1,
    sites,
  });
}

/**
 * Resolves the submitted epoch from a Torii `/status` payload.
 */
export function resolveSubmittedEpochFromStatusValue(statusValue: JsonObject): number {
  const directEpochPaths = [
    ['sumeragi', 'epoch'],
    ['sumeragi', 'current_epoch'],
    ['sumeragi', 'membership', 'epoch'],
    ['current_epoch'],
    ['epoch'],
  ];

  for (const path of directEpochPaths) {
    const value = findNestedValue(statusValue, path);
    const parsedEpoch = parseStatusEpochValue(value);
    if (parsedEpoch !== undefined) {
      return parsedEpoch;
    }
  }

  const blocks = statusValue.blocks;
  if (typeof blocks !== 'number' || !Number.isInteger(blocks) || blocks < 0) {
    throw new Error('status JSON is missing `blocks`.');
  }

  const nestedEpochLengthBlocks = findNestedValue(statusValue, ['sumeragi', 'epoch_length_blocks']);
  const epochLengthBlocks =
    typeof nestedEpochLengthBlocks === 'number'
      ? nestedEpochLengthBlocks
      : typeof statusValue.epoch_length_blocks === 'number'
        ? statusValue.epoch_length_blocks
        : undefined;

  if (epochLengthBlocks === undefined || !Number.isInteger(epochLengthBlocks) || epochLengthBlocks <= 0) {
    throw new Error('status JSON is missing `sumeragi.epoch_length_blocks`.');
  }

  return Math.floor(Math.max(blocks - 1, 0) / epochLengthBlocks);
}

function findNestedValue(value: JsonObject, path: readonly string[]): unknown {
  let current: unknown = value;

  for (const segment of path) {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function parseStatusEpochValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    for (const key of ['height', 'index', 'epoch']) {
      const nested = record[key];
      if (typeof nested === 'number' && Number.isInteger(nested) && nested >= 0) {
        return nested;
      }
    }
  }

  return undefined;
}

async function resolveSubmittedEpoch(toriiUrl: string): Promise<string> {
  const statusUrl = new URL('/status', toriiUrl).toString();
  const response = await fetch(statusUrl, {
    headers: { accept: 'application/json' },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Torii status endpoint \`${statusUrl}\` returned HTTP ${response.status}: ${body}`);
  }

  let statusValue: JsonObject;

  try {
    statusValue = JSON.parse(body) as JsonObject;
  } catch (error) {
    throw new Error(`Torii status endpoint \`${statusUrl}\` did not return JSON.`, { cause: error });
  }

  return String(resolveSubmittedEpochFromStatusValue(statusValue));
}

function createPackageSummary(config: DeployConfig, paths: ArtifactPaths, signManifest: boolean) {
  const carSummary = readJsonFile<Record<string, unknown>>(paths.carSummaryPath);
  const proofSummary = readJsonFile<Record<string, unknown>>(paths.proofSummaryPath);
  const manifestJson = readJsonFile<JsonObject>(paths.manifestJsonPath);
  const contentCid = resolveContentCidFromManifestValue(manifestJson);

  return {
    command: config.command,
    torii_url: config.toriiUrl,
    torii_hostname: config.hostname,
    site_hostname: config.siteHostname ?? null,
    env_config: config.envConfig,
    artifact_dir: paths.artifactDir,
    stage_dir: paths.stageDir,
    outputs: {
      car: paths.carPath,
      chunk_plan: paths.planPath,
      car_summary: paths.carSummaryPath,
      manifest: paths.manifestPath,
      manifest_json: paths.manifestJsonPath,
      proof_summary: paths.proofSummaryPath,
      bundle: signManifest ? paths.bundlePath : null,
      signature: signManifest ? paths.signaturePath : null,
      sign_summary: signManifest ? paths.signSummaryPath : null,
    },
    digests: {
      manifest_digest_hex: proofSummary.manifest_digest_hex ?? null,
      chunk_digest_sha3_hex: proofSummary.chunk_digest_sha3_hex ?? null,
      payload_digest_hex: proofSummary.payload_digest_hex ?? null,
      car_archive_digest_hex: proofSummary.car_digest_hex ?? carSummary.car_archive_digest_hex ?? null,
    },
    gateway: {
      content_cid: contentCid,
      cid_gateway_path: createCidGatewayPath(contentCid),
      cid_gateway_url: createCidGatewayUrl(config.toriiUrl, contentCid),
    },
  };
}

function maybeWriteCapturedStdout(path: string, stdout: string) {
  if (!stdout.trim()) {
    return;
  }
  writeFileSync(path, stdout.endsWith('\n') ? stdout : `${stdout}\n`);
}

function escapeTomlString(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Creates a minimal iroha client config for unauthenticated Torii helper calls.
 */
export function createIrohaClientConfig(
  toriiUrl: string,
  publicKey: string,
  privateKey: string,
  chainId = DEFAULT_CLIENT_CHAIN_ID,
  accountDomain = DEFAULT_ACCOUNT_DOMAIN
) {
  const normalizedToriiUrl = toriiUrl.endsWith('/') ? toriiUrl : `${toriiUrl}/`;
  return [
    `chain = ${escapeTomlString(chainId)}`,
    `torii_url = ${escapeTomlString(normalizedToriiUrl)}`,
    '',
    '[basic_auth]',
    `web_login = ${escapeTomlString(DEFAULT_BASIC_AUTH_LOGIN)}`,
    `password = ${escapeTomlString(DEFAULT_BASIC_AUTH_PASSWORD)}`,
    '',
    '[account]',
    `domain = ${escapeTomlString(accountDomain)}`,
    `public_key = ${escapeTomlString(publicKey)}`,
    `private_key = ${escapeTomlString(privateKey)}`,
    '',
  ].join('\n');
}

/**
 * Converts canonical account-address hex (`0x02000120...`) into the client public-key format.
 */
export function derivePublicKeyFromCanonicalAccountHex(accountHex: string) {
  const normalized = accountHex.trim().replace(/^0x/i, '').toUpperCase();

  if (/^(ED0120|EA0130)[0-9A-F]+$/.test(normalized)) {
    return `${normalized.slice(0, 6).toLowerCase()}${normalized.slice(6)}`;
  }

  if (normalized.startsWith('02000120') && normalized.length > '02000120'.length) {
    return `ed0120${normalized.slice('02000120'.length)}`;
  }

  throw new Error(`Unsupported canonical account-address hex \`${accountHex}\`.`);
}

/**
 * Derives an Ed25519 public key from the multihash private-key payload used by Iroha config files.
 */
export function derivePublicKeyFromPrivateKeyHex(privateKey: string) {
  const normalized = privateKey.trim().replace(/^0x/i, '').toUpperCase();

  if (!/^802620[0-9A-F]{64}$/.test(normalized)) {
    throw new Error(`Unsupported Iroha private key format \`${privateKey}\`.`);
  }

  const seed = Buffer.from(normalized.slice('802620'.length), 'hex');
  const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
  const spkiPrefix = '302A300506032B6570032100';
  const privateKeyObject = createPrivateKey({
    key: Buffer.concat([pkcs8Prefix, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const publicKeyDer = createPublicKey(privateKeyObject).export({
    format: 'der',
    type: 'spki',
  });
  const publicKeyHex = Buffer.from(publicKeyDer).toString('hex').toUpperCase();

  if (!publicKeyHex.startsWith(spkiPrefix)) {
    throw new Error(`Failed to derive an Ed25519 public key from private key \`${privateKey}\`.`);
  }

  return `ed0120${publicKeyHex.slice(spkiPrefix.length)}`;
}

function resolvePrivateKeyValue(credentials: { privateKey?: string; privateKeyFile?: string }) {
  if (credentials.privateKey) {
    return credentials.privateKey.trim();
  }

  if (!credentials.privateKeyFile) {
    throw new Error('Missing private key. Set `SORAFS_PRIVATE_KEY` or `SORAFS_PRIVATE_KEY_FILE`.');
  }

  return readFileSync(credentials.privateKeyFile, 'utf8').trim();
}

export function buildAuthorityConvertArgs(authority: string, networkPrefix?: string) {
  const args = ['tools', 'address', 'convert', '--format', 'canonical-hex'];

  if (networkPrefix?.trim()) {
    args.push('--network-prefix', networkPrefix.trim());
  }

  args.push(authority);
  return args;
}

function resolveAuthorityPublicKey(irohaCli: BuildToolCommand, authority: string, networkPrefix?: string) {
  const result = runCommand(
    irohaCli.command,
    [...irohaCli.args, ...buildAuthorityConvertArgs(authority, networkPrefix)],
    {
      cwd: irohaCli.cwd,
      capture: true,
    }
  );
  const combinedOutput = `${result.stdout}\n${result.stderr}`;
  const canonicalAccountHexMatches = combinedOutput.match(/0x[0-9a-fA-F]+/g) ?? [];
  const canonicalAccountHex = canonicalAccountHexMatches.at(-1) ?? '';

  if (!canonicalAccountHex) {
    throw new Error(`Failed to derive a canonical public key from authority \`${authority}\`.`);
  }

  return derivePublicKeyFromCanonicalAccountHex(canonicalAccountHex);
}

function resolveSignerPublicKey(
  irohaCli: BuildToolCommand,
  authority: string,
  privateKeyValue: string,
  networkPrefix?: string
) {
  try {
    return derivePublicKeyFromPrivateKeyHex(privateKeyValue);
  } catch {
    return resolveAuthorityPublicKey(irohaCli, authority, networkPrefix);
  }
}

export function buildFundingHint(error: Error): Error {
  const cause = error.cause as Partial<SpawnSyncReturns<string>> | undefined;
  const combined = `${cause?.stdout ?? ''}\n${cause?.stderr ?? ''}\n${error.message}`;
  if (/(insufficient|not enough|balance|funds|xor)/i.test(combined)) {
    return new Error(`${error.message}\nFund the authority account on the target network, then retry.`, {
      cause: error.cause,
    });
  }
  return error;
}

export function buildPermissionHint(error: Error, proposalPath: string): Error {
  const cause = error.cause as Partial<SpawnSyncReturns<string>> | undefined;
  const combined = `${cause?.stdout ?? ''}\n${cause?.stderr ?? ''}\n${error.message}`;
  if (/(CanRegisterSorafsPin|permission .*RegisterSorafsPin|permission required.*SoraFS)/i.test(combined)) {
    const permissionReason = /permission CanRegisterSorafsPin required for SoraFS operation/i.test(combined)
      ? 'permission CanRegisterSorafsPin required for SoraFS operation'
      : 'permission CanRegisterSorafsPin required';

    return new Error(
      `${error.message}\nThe target network rejected direct SoraFS pin registration: ${permissionReason}.\nUse the generated proposal artifact at \`${proposalPath}\` with the Taira governance or privileged publish flow.`,
      {
        cause: error.cause,
      }
    );
  }
  return error;
}

export function buildStorageUploadHint(error: Error): Error {
  const cause = error.cause as Partial<SpawnSyncReturns<string>> | undefined;
  const combined = `${cause?.stdout ?? ''}\n${cause?.stderr ?? ''}\n${error.message}`;

  if (/(length limit exceeded|Failed to buffer the request body)/i.test(combined)) {
    return new Error(
      `${error.message}\nThe SoraFS storage-pin API sends the full staged site as one JSON body. Torii is rejecting that body before the handler runs. Increase \`torii.max_content_len\` on the serving node; Taira should use \`64_000_000\`.`,
      {
        cause: error.cause,
      }
    );
  }

  if (/(502 Bad Gateway)/i.test(combined)) {
    return new Error(
      `${error.message}\nThe SoraFS storage upload is dying behind the public edge. Verify both the reverse-proxy upload budget and Torii's \`max_content_len\`; oversized JSON bodies can surface as \`502 Bad Gateway\` once the upstream closes the request.`,
      {
        cause: error.cause,
      }
    );
  }

  if (/(413 Payload Too Large|413 Request Entity Too Large|status 413\b)/i.test(combined)) {
    return new Error(
      `${error.message}\nThe SoraFS storage-pin API uploads the full staged site in one request. Increase the reverse-proxy body-size limit in front of Torii, keep \`proxy_request_buffering off\`, then retry the publish.`,
      {
        cause: error.cause,
      }
    );
  }

  return error;
}

export function isAlreadyRegisteredSubmitError(error: Error): boolean {
  const cause = error.cause as Partial<SpawnSyncReturns<string>> | undefined;
  const combined = `${cause?.stdout ?? ''}\n${cause?.stderr ?? ''}\n${error.message}`;
  return /manifest [0-9a-f]{64} already registered|already registered/i.test(combined);
}

function resolveConfig(parsed: ParsedCliArgs, env: EnvLike): DeployConfig {
  const toriiUrl = String(parsed.options['torii-url'] ?? env.SORAFS_TORII_URL ?? DEFAULT_TORII_URL);
  const hostname = String(parsed.options.hostname ?? deriveHostnameFromToriiUrl(toriiUrl));
  const defaultChainId = isDefaultTairaHostname(hostname) ? DEFAULT_TAIRA_CHAIN_ID : DEFAULT_CLIENT_CHAIN_ID;
  const defaultNetworkPrefix = isDefaultTairaHostname(hostname) ? DEFAULT_TAIRA_NETWORK_PREFIX : undefined;
  const artifactRoot = String(parsed.options['artifact-root'] ?? process.cwd());
  const timestamp = toUtcTimestamp();
  const artifactDir = createArtifactDirectory(artifactRoot, hostname, timestamp);
  const siteHostname =
    typeof parsed.options['site-hostname'] === 'string' ? parsed.options['site-hostname'] : env.SORAFS_SITE_HOSTNAME;

  if (
    (typeof parsed.options['site-bindings-file'] === 'string' || Boolean(env.SORAFS_SITE_BINDINGS_FILE)) &&
    !siteHostname
  ) {
    throw new Error('`--site-bindings-file` requires `--site-hostname` or `SORAFS_SITE_HOSTNAME`.');
  }

  return {
    command: parsed.command,
    toriiUrl,
    hostname,
    chainId: String(parsed.options['chain-id'] ?? env.SORAFS_CHAIN_ID ?? defaultChainId),
    networkPrefix:
      typeof parsed.options['network-prefix'] === 'string'
        ? parsed.options['network-prefix']
        : (env.SORAFS_NETWORK_PREFIX ?? defaultNetworkPrefix),
    siteHostname,
    envConfig: String(parsed.options['env-config'] ?? DEFAULT_ENV_CONFIG_FILENAME),
    artifactRoot,
    artifactDir,
    irohaDir: String(parsed.options['iroha-dir'] ?? DEFAULT_IROHA_DIR),
    identityTokenEnv: String(parsed.options['identity-token-env'] ?? DEFAULT_IDENTITY_TOKEN_ENV),
    authority: typeof parsed.options.authority === 'string' ? parsed.options.authority : undefined,
    privateKey: typeof parsed.options['private-key'] === 'string' ? parsed.options['private-key'] : undefined,
    privateKeyFile:
      typeof parsed.options['private-key-file'] === 'string' ? parsed.options['private-key-file'] : undefined,
    submittedEpoch:
      typeof parsed.options['submitted-epoch'] === 'string'
        ? parsed.options['submitted-epoch']
        : env.SORAFS_SUBMITTED_EPOCH,
    siteBindingsFile:
      typeof parsed.options['site-bindings-file'] === 'string'
        ? resolve(parsed.options['site-bindings-file'])
        : env.SORAFS_SITE_BINDINGS_FILE
          ? resolve(env.SORAFS_SITE_BINDINGS_FILE)
          : undefined,
  };
}

function runBuild() {
  runCommand('yarn', ['build', '--base', './'], { cwd: process.cwd() });
}

function performPackaging(config: DeployConfig) {
  const paths = createArtifactPaths(config.artifactDir);
  const signManifest = shouldSignManifest(process.env, config.identityTokenEnv);
  mkdirSync(paths.artifactDir, { recursive: true });

  runBuild();
  stageDistBundle(paths.stageDir, config.envConfig);

  const sorafsCli = resolveBuildToolCommand(config.irohaDir, 'sorafs_cli');
  const commandSpecs = buildPackageCommandSpecs({ sorafsCli, paths }, signManifest, config.identityTokenEnv);

  for (const spec of commandSpecs) {
    const shouldCapture = spec.args.includes('sign');
    const result = runCommand(spec.command, spec.args, { cwd: spec.cwd, capture: shouldCapture });
    if (shouldCapture) {
      maybeWriteCapturedStdout(paths.signSummaryPath, result.stdout);
    }
  }

  const summary = createPackageSummary(config, paths, signManifest);
  writeJson(paths.packageSummaryPath, summary);

  console.log(`SoraFS package created in ${paths.artifactDir}`);
  return { paths, signManifest };
}

function extractContentCidFromPackageSummary(summary: Record<string, unknown>): string | null {
  const gateway = summary.gateway;
  if (gateway && typeof gateway === 'object' && !Array.isArray(gateway)) {
    const contentCid = (gateway as Record<string, unknown>).content_cid;
    if (typeof contentCid === 'string' && contentCid.trim()) {
      return contentCid.trim();
    }
  }

  const outputs = summary.outputs;
  if (outputs && typeof outputs === 'object' && !Array.isArray(outputs)) {
    const manifestJsonPath = (outputs as Record<string, unknown>).manifest_json;
    if (typeof manifestJsonPath === 'string' && existsSync(manifestJsonPath)) {
      return resolveContentCidFromManifestValue(readJsonFile<JsonObject>(manifestJsonPath));
    }
  }

  return null;
}

function resolveLatestContentCid(artifactRoot: string, hostname: string): string {
  const hostArtifactRoot = join(resolve(artifactRoot), 'artifacts', 'sorafs', sanitizeArtifactSegment(hostname));
  if (!existsSync(hostArtifactRoot)) {
    throw new Error(
      `Missing artifact directory \`${hostArtifactRoot}\`. Pass \`--cid\` explicitly or run a package/publish command first.`
    );
  }

  const latestArtifactDir = readdirSync(hostArtifactRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .at(-1);

  if (!latestArtifactDir) {
    throw new Error(`No SoraFS artifacts found under \`${hostArtifactRoot}\`.`);
  }

  const summaryPath = createArtifactPaths(join(hostArtifactRoot, latestArtifactDir)).packageSummaryPath;
  const summary = readJsonFile<Record<string, unknown>>(summaryPath);
  const contentCid = extractContentCidFromPackageSummary(summary);

  if (!contentCid) {
    throw new Error(`Missing content CID in \`${summaryPath}\`.`);
  }

  return contentCid;
}

async function probeDeployment(config: DeployConfig, outPath?: string, explicitCid?: string) {
  const origin = new URL(config.toriiUrl).origin;
  const contentCid = explicitCid?.trim() || resolveLatestContentCid(config.artifactRoot, config.hostname);
  const cidGatewayPath = createCidGatewayPath(contentCid);
  const checks = [
    { name: 'cid_root', url: new URL(cidGatewayPath, origin).toString(), kind: 'html' as const },
    { name: 'cid_lookup', url: new URL(`/v1/sorafs/cid/${contentCid}`, origin).toString(), kind: 'json' as const },
    { name: 'status', url: new URL('/status', origin).toString(), kind: 'json' as const },
    { name: 'sumeragi_status', url: new URL('/v1/sumeragi/status', origin).toString(), kind: 'json' as const },
  ];

  const results = [];

  for (const check of checks) {
    const response = await fetch(check.url, {
      headers: check.kind === 'json' ? { accept: 'application/json' } : undefined,
    });
    const body = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      throw new Error(`Probe failed for ${check.url}: received HTTP ${response.status}.`);
    }

    if (check.kind === 'html') {
      const looksLikeHtml = /html/i.test(contentType) || /<!doctype html|<html/i.test(body);
      if (!looksLikeHtml) {
        throw new Error(`Probe failed for ${check.url}: expected HTML content.`);
      }
    }

    if (check.kind === 'json') {
      try {
        JSON.parse(body);
      } catch (error) {
        throw new Error(`Probe failed for ${check.url}: expected JSON content.`, { cause: error });
      }
    }

    results.push({
      name: check.name,
      url: check.url,
      status: response.status,
      content_type: contentType,
    });
  }

  const summary = {
    torii_url: config.toriiUrl,
    torii_hostname: config.hostname,
    origin,
    gateway: {
      content_cid: contentCid,
      cid_gateway_path: cidGatewayPath,
      cid_gateway_url: new URL(cidGatewayPath, origin).toString(),
    },
    checks: results,
  };

  if (outPath) {
    writeJson(outPath, summary);
  }

  console.log(JSON.stringify(summary, null, 2));
}

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  const config = resolveConfig(parsed, process.env);

  if (config.command === 'probe') {
    const probeOut =
      typeof parsed.options.out === 'string'
        ? resolve(parsed.options.out)
        : createArtifactPaths(config.artifactDir).probeSummaryPath;
    mkdirSync(dirname(probeOut), { recursive: true });
    await probeDeployment(config, probeOut, typeof parsed.options.cid === 'string' ? parsed.options.cid : undefined);
    return;
  }

  const { paths } = performPackaging(config);

  if (config.command === 'package') {
    return;
  }

  const sorafsCli = resolveBuildToolCommand(config.irohaDir, 'sorafs_cli');
  const effectiveSubmittedEpoch = config.submittedEpoch ?? (await resolveSubmittedEpoch(config.toriiUrl));
  const proposalSpec = buildProposalCommandSpec({ sorafsCli, paths }, effectiveSubmittedEpoch);
  runCommand(proposalSpec.command, proposalSpec.args, { cwd: proposalSpec.cwd });

  const packageSummaryWithProposal = {
    ...(readJsonFile<Record<string, unknown>>(paths.packageSummaryPath) as Record<string, unknown>),
    proposal: {
      submitted_epoch: effectiveSubmittedEpoch,
      proposal: paths.proposalPath,
    },
  };
  writeJson(paths.packageSummaryPath, packageSummaryWithProposal);

  if (config.command === 'proposal') {
    console.log(`SoraFS proposal created in ${paths.proposalPath}`);
    return;
  }

  const credentials = resolvePublishCredentials(config, process.env);
  const routePlanCli = resolveBuildToolCommand(config.irohaDir, 'iroha');
  const privateKeyValue = resolvePrivateKeyValue(credentials);
  const authorityPublicKey = resolveSignerPublicKey(
    routePlanCli,
    credentials.authority,
    privateKeyValue,
    config.networkPrefix
  );
  const clientConfigDir = mkdtempSync(join(tmpdir(), 'polkaswap-sorafs-client-'));
  const clientConfigPath = join(clientConfigDir, 'client.toml');
  writeFileSync(
    clientConfigPath,
    createIrohaClientConfig(config.toriiUrl, authorityPublicKey, privateKeyValue, config.chainId)
  );
  const publishSpecs = buildPublishCommandSpecs({
    sorafsCli,
    routePlanCli,
    clientConfigPath,
    paths,
    toriiUrl: config.toriiUrl,
    hostname: config.hostname,
    siteHostname: config.siteHostname,
    authority: credentials.authority,
    submittedEpoch: effectiveSubmittedEpoch,
    networkPrefix: config.networkPrefix,
    privateKey: credentials.privateKey,
    privateKeyFile: credentials.privateKeyFile,
  });

  try {
    try {
      for (const spec of publishSpecs.slice(1)) {
        const isSubmit = spec.args.includes('submit');
        const isStorage = spec.args.includes('storage');
        const shouldCapture = isSubmit || isStorage;

        try {
          const result = runCommand(spec.command, spec.args, { cwd: spec.cwd, capture: shouldCapture });
          if (isStorage) {
            maybeWriteCapturedStdout(paths.storagePinResponsePath, result.stdout);
            writeJson(paths.storagePinSummaryPath, createStoragePinSummary(config, paths));
          }
        } catch (error) {
          if (isStorage) {
            const cause = (error as Error).cause as Partial<SpawnSyncReturns<string>> | undefined;
            writeJson(paths.storagePinResponsePath, {
              error: {
                message: (error as Error).message,
                exit_code: typeof cause?.status === 'number' ? cause.status : null,
                stdout: cause?.stdout ?? '',
                stderr: cause?.stderr ?? '',
              },
            });
            writeJson(paths.storagePinSummaryPath, createStoragePinSummary(config, paths));
          }
          if (isSubmit && isAlreadyRegisteredSubmitError(error as Error)) {
            continue;
          }
          throw error;
        }
      }
    } finally {
      rmSync(clientConfigDir, { recursive: true, force: true });
    }
  } catch (error) {
    throw buildStorageUploadHint(buildPermissionHint(buildFundingHint(error as Error), paths.proposalPath));
  }

  const packageSummary = readJsonFile<Record<string, unknown>>(paths.packageSummaryPath) as Record<string, unknown>;
  const manifestDigestHex =
    typeof (packageSummary.digests as Record<string, unknown> | undefined)?.manifest_digest_hex === 'string'
      ? ((packageSummary.digests as Record<string, unknown>).manifest_digest_hex as string)
      : null;
  if (!manifestDigestHex) {
    throw new Error(`Missing manifest digest in \`${paths.packageSummaryPath}\`.`);
  }

  if (config.siteHostname) {
    const siteBindingDocument = createSiteBindingDocument(config.siteHostname, manifestDigestHex);
    writeJson(paths.siteBindingPath, siteBindingDocument);
    if (config.siteBindingsFile) {
      upsertSiteBindingsFile(config.siteBindingsFile, config.siteHostname, manifestDigestHex);
    }
  }

  const publishSummary = {
    ...packageSummary,
    publish: {
      submitted_epoch: effectiveSubmittedEpoch,
      proposal: paths.proposalPath,
      submit_summary: paths.submitSummaryPath,
      submit_response: paths.submitResponsePath,
      storage_pin_summary: paths.storagePinSummaryPath,
      storage_pin_response: paths.storagePinResponsePath,
      route_plan: config.siteHostname ? paths.routePlanPath : null,
      route_headers: config.siteHostname ? paths.routeHeadersPath : null,
      site_binding: config.siteHostname ? paths.siteBindingPath : null,
      site_bindings_file: config.siteBindingsFile ?? null,
    },
  };
  writeJson(paths.packageSummaryPath, publishSummary);
  console.log(`SoraFS manifest published via ${config.toriiUrl}`);
}

const entrypoint = process.argv[1] ? resolve(process.argv[1]) : '';
if (fileURLToPath(import.meta.url) === entrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
