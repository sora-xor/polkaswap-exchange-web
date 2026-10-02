/** Source-bound gap-aware exposed-calibration acquisition with verified prior evidence reuse. No wallet or transaction authority. */
import { createHash } from 'node:crypto';
import { builtinModules, createRequire, registerHooks } from 'node:module';
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import type {
  IndexedPoolBoundaryEvidence,
  IndexedPoolHistoryWithEvidence,
  IndexedPoolHistoryRow,
} from '../../src/features/bot-trading/pool-history';
import type { BotDefinition, BotCandle } from '../../src/features/bot-trading/types';

import type { HistoricalGoalMarketReader } from './historical-goal-market-reader';
import type { readHistoricalExecutionQuote } from './historical-execution-reader';
import type { readHistoricalGoalBoundFee } from './historical-goal-bound-fee-reader';

import type {
  causalCalibrationCandidates,
  CausalCalibrationHour,
  CausalCalibrationInput,
  CausalCalibrationQuoteProvider,
} from './causal-goal-calibration-replay';
import type {
  replayCausalGapCalibration as replayCausalGoalCalibration,
  CausalGapCalibrationResult as CausalCalibrationResult,
} from './causal-goal-calibration-gap-replay';
import type { CausalGapReuseManifest, openCausalGapReuse } from './causal-gap-reuse';
const GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const KUSD = '0x02000c0000000000000000000000000000000000000000000000000000000000';
const XOR = '0x0200000000000000000000000000000000000000000000000000000000000000';

const HOUR = 3_600_000;
const START = Date.parse('2026-06-30T19:00:00.000Z');
const END = Date.parse('2026-07-28T19:00:00.000Z');
const DENOMINATOR = '100000000000000000000000000000000000000';
const CALIBRATION = 'output/go-history/tc1-seven-day-calibration-20260925/calibration-observations.json';
const DATA_SHA = '2180d4381ebacd0ea14d22adcb9e81e76924928baf273eb7049adbeac1274653';
const PROTOCOL = 'output/go-history/tc1-causal-gap-calibration-20260926/protocol.md';
const CAPABILITY = 'output/go-history/tc1-causal-calibration-capability-20260925/verification.json';
const CAPABILITY_RECEIPT = 'output/go-history/tc1-causal-calibration-capability-20260925/rpc-04.json';
const RUNNER = 'scripts/bots/run-causal-gap-calibration.ts';
const REPLAY = 'scripts/bots/causal-goal-calibration-gap-replay.ts';
const PRIOR_RUN = 'output/go-history/tc1-causal-calibration-run-20260926';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INDEXER = 'https://pi.soramitsu.io/graphql';
const ARCHIVE = 'https://mof2.sora.org/';
const RPC_METHODS = new Set([
  'chain_getBlockHash',
  'chain_getFinalizedHead',
  'chain_getHeader',
  'state_getRuntimeVersion',
  'state_getMetadata',
  'state_getStorage',
  'state_getStorageHash',
  'state_queryStorageAt',
  'liquidityProxy_quote',
  'state_call',
]);
const BUILTINS = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));
const requireHere = createRequire(import.meta.url);
const LOCAL_PACKAGE_PATHS: Record<string, string> = Object.fromEntries(
  ['math', 'sdk', 'liquidity-proxy', 'api', 'connection', 'types', 'type-definitions'].map((name) => [
    `@sora-substrate/${name}`,
    `src/lib/substrate/${name}`,
  ])
);
/** Match the existing source aliases before loading research modules outside Vite. */
function localModule(specifier: string, root: string): string | undefined {
  if (specifier.startsWith('@/')) return resolve(root, 'src', specifier.slice(2));
  for (const [prefix, directory] of Object.entries(LOCAL_PACKAGE_PATHS)) {
    if (specifier === prefix || specifier === `${prefix}/build`) return resolve(root, directory, 'index.ts');
    if (specifier.startsWith(`${prefix}/`))
      return resolve(root, directory, specifier.slice(prefix.length + 1).replace(/^build\//, ''));
  }
}
let dependencies:
  | Promise<{
      parser: typeof import('../../src/features/bot-trading/pool-history');
      history: typeof import('./goal-qualification-history-reader');
      market: typeof import('./historical-goal-market-reader');
      execution: typeof import('./historical-execution-reader');
      fee: typeof import('./historical-goal-bound-fee-reader');
      join: typeof import('./historical-goal-quote');
      replay: {
        causalCalibrationCandidates: typeof causalCalibrationCandidates;
        replayCausalGoalCalibration: typeof replayCausalGoalCalibration;
      };
      reuse: typeof import('./causal-gap-reuse');
    }>
  | undefined;
/** The scoped resolver adds no endpoint or global wallet configuration. */
function loadDependencies() {
  return (dependencies ??= (async () => {
    const hooks = registerHooks({
      resolve(specifier, context, next) {
        const local = localModule(specifier, ROOT);
        return next(local ? pathToFileURL(local).href : specifier, context);
      },
    });
    try {
      const [parser, history, market, execution, fee, joiner, candidates, replay, reuse] = await Promise.all([
        import('../../src/features/bot-trading/pool-history'),
        import('./goal-qualification-history-reader'),
        import('./historical-goal-market-reader'),
        import('./historical-execution-reader'),
        import('./historical-goal-bound-fee-reader'),
        import('./historical-goal-quote'),
        import('./causal-goal-calibration-replay'),
        import('./causal-goal-calibration-gap-replay'),
        import('./causal-gap-reuse'),
      ]);
      return {
        parser,
        history,
        market,
        execution,
        fee,
        join: joiner,
        reuse,
        replay: {
          causalCalibrationCandidates: candidates.causalCalibrationCandidates,
          replayCausalGoalCalibration: replay.replayCausalGapCalibration,
        },
      };
    } finally {
      hooks.deregister();
    }
  })());
}

const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const canonical = (value: unknown): string =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`)
          .join(',')}}`
      : JSON.stringify(value);
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new Error(`causal-gap-acquisition:${reason}`);
}
function inside(root: string, path: string): string {
  const name = relative(root, path);
  check(name && !name.startsWith('..') && !isAbsolute(name), 'path-outside-root');
  return name;
}

export interface CausalSourceBinding {
  path: string;
  sha256: string;
  bytes: number;
}
export interface CausalDependencyBinding {
  specifier: string;
  packageName: string;
  version: string;
  packagePath: string;
  packageSha256: string;
  entryPath: string;
  entrySha256: string;
}
export interface CausalSourceClosure {
  local: CausalSourceBinding[];
  dependencies: CausalDependencyBinding[];
  builtins: string[];
}

/** Resolve every static local dependency without importing or executing inspected modules. */
export async function collectCausalSourceClosure(
  root: string,
  entries: readonly string[]
): Promise<CausalSourceClosure> {
  root = await realpath(root);
  const local = new Map<string, CausalSourceBinding>(),
    dependencies = new Map<string, CausalDependencyBinding>(),
    builtins = new Set<string>();
  const pending = [...entries].map((name) => resolve(root, name));
  const options: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Node10,
    baseUrl: root,
    paths: { '@/*': ['src/*'], '@tests/*': ['tests/*'], '@stubs/*': ['tests/stubs/*'] },
    allowJs: true,
    resolveJsonModule: true,
  };
  while (pending.length) {
    const path = pending.pop()!;
    const name = inside(root, path);
    if (local.has(name)) continue;
    check((await realpath(path)) === path && (await stat(path)).isFile(), 'source-symlink-or-not-file');
    const bytes = await readFile(path);
    check(bytes.length <= 16 * 1024 * 1024, 'source-size');
    local.set(name, { path: name, sha256: sha(bytes), bytes: bytes.length });
    if (!/\.(?:[cm]?[jt]sx?)$/.test(path)) continue;
    const tree = ts.createSourceFile(path, bytes.toString('utf8'), ts.ScriptTarget.Latest, true);
    const imports: string[] = [];
    const visit = (node: ts.Node): void => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        check(ts.isStringLiteralLike(node.moduleSpecifier), 'nonliteral-module');
        imports.push(node.moduleSpecifier.text);
      } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
        check(
          node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression),
          'nonliteral-module'
        );
        imports.push(node.moduleReference.expression.text);
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        check(node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0]), 'nonliteral-module');
        imports.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
    for (const specifier of imports) {
      const builtin = specifier.replace(/^node:/, '');
      if (BUILTINS.has(builtin)) {
        builtins.add(`node:${builtin}`);
        continue;
      }
      const mapped = localModule(specifier, root);
      const isLocal =
        mapped !== undefined ||
        specifier.startsWith('.') ||
        specifier.startsWith('@/') ||
        specifier.startsWith('@tests/') ||
        specifier.startsWith('@stubs/');
      const found = ts.resolveModuleName(mapped ?? specifier, path, options, ts.sys).resolvedModule?.resolvedFileName;
      if (isLocal) {
        check(found, 'unresolved-local-import');
        pending.push(resolve(found));
        continue;
      }
      check(!isAbsolute(specifier) && !specifier.includes('://'), 'unsupported-module');
      let entry: string;
      try {
        entry = requireHere.resolve(specifier, { paths: [dirname(path)] });
      } catch {
        check(found, 'unresolved-package');
        entry = found;
      }
      entry = await realpath(entry);
      let directory = dirname(entry),
        manifest: Buffer | undefined,
        manifestPath = '',
        pkg: { name?: unknown; version?: unknown } = {};
      while (directory !== dirname(directory)) {
        try {
          manifestPath = join(directory, 'package.json');
          const bytes = await readFile(manifestPath);
          const candidate = JSON.parse(bytes.toString('utf8')) as typeof pkg;
          if (typeof candidate.name === 'string' && typeof candidate.version === 'string') {
            manifest = bytes;
            pkg = candidate;
            break;
          }
        } catch {
          /* Package subdirectories may omit their own manifest. */
        }
        directory = dirname(directory);
      }
      check(manifest, 'package-manifest');
      check(typeof pkg.name === 'string' && typeof pkg.version === 'string', 'package-version');
      const key = `${specifier}:${entry}`;
      dependencies.set(key, {
        specifier,
        packageName: pkg.name,
        version: pkg.version,
        packagePath: manifestPath,
        packageSha256: sha(manifest),
        entryPath: entry,
        entrySha256: sha(await readFile(entry)),
      });
    }
  }
  return {
    local: [...local.values()].sort((a, b) => a.path.localeCompare(b.path)),
    dependencies: [...dependencies.values()].sort((a, b) =>
      `${a.specifier}:${a.entryPath}`.localeCompare(`${b.specifier}:${b.entryPath}`)
    ),
    builtins: [...builtins].sort(),
  };
}

const ENTRIES = [
  RUNNER,
  REPLAY,
  'tests/unit/scripts/bots/run-causal-gap-calibration.spec.ts',
  'tests/unit/scripts/bots/causal-goal-calibration-gap-replay.spec.ts',
  'scripts/bots/causal-gap-reuse.ts',
  'tests/unit/scripts/bots/causal-gap-reuse.spec.ts',
  'scripts/bots/report-causal-goal-calibration.ts',
  'tests/unit/scripts/bots/report-causal-goal-calibration.spec.ts',
];
const EXTRA = [
  'vite.config.mjs',
  PROTOCOL,
  CAPABILITY,
  CAPABILITY_RECEIPT,
  'package.json',
  'yarn.lock',
  'tsconfig.json',
  '.yarnrc.yml',
  '.yarn/releases/yarn-4.10.3.cjs',
];
export const CAUSAL_ACQUISITION_LIMITS = Object.freeze({
  warmupRequests: 2,
  marketShards: 32,
  quotes: 1932,
  boundFees: 1932,
  rpcRequests: 60000,
  concurrentRequests: 2,
});
export interface CausalRegistrationBody {
  kind: 'causal-gap-calibration-registration-v1';
  registeredAt: string;
  protocolPath: string;
  source: CausalSourceClosure;
  extra: CausalSourceBinding[];
  node: { version: string; execPath: string; binarySha256: string };
  calibration: { path: string; sha256: string };
  priorEvidence: { path: string; manifest: CausalGapReuseManifest };
  reusePolicy: {
    incompleteMarkIdentityRechecks: 'genuine-bounded-reader-separately-counted';
    cachedInvalid: 'fatal';
    absent: 'bounded-fresh-read-once';
  };
  candidates: ReturnType<typeof causalCalibrationCandidates>;
  sourceAnchor: {
    finalizedSource: { hash: string; height: number; receiptSha256: string };
    schemaAnchor: { hash: string; height: number };
  };
  scope: {
    startAtMs: number;
    endAtMs: number;
    episodes: 28;
    hours: 24;
    warmupStartAtMs: number;
    warmupEndAtMs: number;
  };
  limits: typeof CAUSAL_ACQUISITION_LIMITS;
  access: { calibrationOnly: true; untouchedValidation: false; financialActions: false; retries: 0; fallback: false };
  dependencyLimitation: string;
}
export interface CausalRegistration {
  body: CausalRegistrationBody;
  sha256: string;
}

/** Verify bound bytes before invoking any caller's acquisition, and again before accepting its result. */
export async function withVerifiedCausalSources<T>(
  root: string,
  bindings: readonly CausalSourceBinding[],
  run: () => Promise<T>
): Promise<T> {
  root = await realpath(root);
  const verify = async () => {
    for (const binding of bindings) {
      const path = resolve(root, binding.path);
      inside(root, path);
      check((await realpath(path)) === path, 'changed-source-path');
      const bytes = await readFile(path);
      check(bytes.length === binding.bytes && sha(bytes) === binding.sha256, 'changed-source');
    }
  };
  await verify();
  const result = await run();
  await verify();
  return result;
}

async function registrationBody(root: string, registeredAt: string): Promise<CausalRegistrationBody> {
  check(new Date(registeredAt).toISOString() === registeredAt, 'registration-time');
  check((await realpath(root)) === (await realpath(ROOT)), 'execution-source-root');
  const {
    replay: { causalCalibrationCandidates },
    reuse: { registerCausalGapReuse },
  } = await loadDependencies();
  const source = await collectCausalSourceClosure(root, ENTRIES);
  const extra: CausalSourceBinding[] = [];
  for (const path of EXTRA) {
    const bytes = await readFile(join(root, path));
    extra.push({ path, bytes: bytes.length, sha256: sha(bytes) });
  }
  check(sha(await readFile(join(root, CALIBRATION))) === DATA_SHA, 'calibration-hash');
  const capability = JSON.parse(await readFile(join(root, CAPABILITY), 'utf8'));
  check(
    capability.marketDataRead === false &&
      capability.allBoundaryProfilesSupported === true &&
      capability.anchors?.[0]?.specVersion === 130,
    'capability'
  );
  const sourceAnchor = {
    finalizedSource: capability.finalizedSource,
    schemaAnchor: { hash: capability.anchors[0].blockHash, height: capability.anchors[0].blockHeight },
  };
  check(
    sourceAnchor.finalizedSource.receiptSha256 === sha(await readFile(join(root, CAPABILITY_RECEIPT))),
    'source-receipt-hash'
  );
  return {
    kind: 'causal-gap-calibration-registration-v1',
    registeredAt,
    protocolPath: PROTOCOL,
    source,
    extra,
    node: { version: process.version, execPath: process.execPath, binarySha256: sha(await readFile(process.execPath)) },
    calibration: { path: CALIBRATION, sha256: DATA_SHA },
    priorEvidence: { path: PRIOR_RUN, manifest: await registerCausalGapReuse(join(root, PRIOR_RUN)) },
    reusePolicy: {
      incompleteMarkIdentityRechecks: 'genuine-bounded-reader-separately-counted',
      cachedInvalid: 'fatal',
      absent: 'bounded-fresh-read-once',
    },
    candidates: causalCalibrationCandidates(),
    sourceAnchor,
    scope: {
      startAtMs: START,
      endAtMs: END,
      episodes: 28,
      hours: 24,
      warmupStartAtMs: START - 13 * HOUR,
      warmupEndAtMs: START - HOUR,
    },
    limits: CAUSAL_ACQUISITION_LIMITS,
    access: { calibrationOnly: true, untouchedValidation: false, financialActions: false, retries: 0, fallback: false },
    dependencyLimitation:
      'Repository reader/evaluator/driver bytes are bound. Yarn lock binds third-party versions/checksums; installed directly imported package manifests and resolution entries are sampled. This is not complete authentication of installed third-party package bytes. Retained public RPC receipts are unkeyed observations: digest and codec verification bind provenance and internal consistency, not independent node signatures or consensus proofs.',
  };
}

/** Immutable artifact publication; existing files are never overwritten or treated as permission to restart. */
export async function writeCausalArtifact(directory: string, name: string, value: unknown): Promise<string> {
  const path = resolve(directory, name);
  inside(directory, path);
  const bytes = `${canonical(value)}\n`;
  check(Buffer.byteLength(bytes) <= 32 * 1024 * 1024, 'artifact-size');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
  return sha(bytes);
}

/** Prepare source snapshots and registration only. This mode has no HTTP operation. */
export async function prepareCausalGapCalibration(directory: string, root = ROOT): Promise<CausalRegistration> {
  const body = await registrationBody(root, new Date().toISOString());
  const registration = { body, sha256: sha(canonical(body)) };
  await mkdir(directory, { recursive: false, mode: 0o700 });
  for (const item of new Map([...body.source.local, ...body.extra].map((item) => [item.path, item])).values()) {
    const path = join(directory, 'source', item.path);
    await mkdir(dirname(path), { recursive: true });
    const bytes = await readFile(join(root, item.path));
    check(sha(bytes) === item.sha256, 'source-changed-during-prepare');
    await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
  }
  await copyCausalGapPriorEvidence(join(root, PRIOR_RUN), join(directory, 'reuse/prior'), body.priorEvidence.manifest);
  const {
    reuse: { openCausalGapReuse },
  } = await loadDependencies();
  await openCausalGapReuse(join(directory, 'reuse/prior'), body.priorEvidence.manifest);
  await writeCausalArtifact(directory, 'registration.json', registration);
  return registration;
}

/** Validate the fixed prior study entirely offline before sealing; return file bindings, never market values. */
export async function verifyCausalGapPriorEvidence(root = ROOT): Promise<CausalGapReuseManifest> {
  check((await realpath(root)) === (await realpath(ROOT)), 'execution-source-root');
  const {
    reuse: { registerCausalGapReuse, openCausalGapReuse },
  } = await loadDependencies();
  const directory = join(root, PRIOR_RUN),
    manifest = await registerCausalGapReuse(directory);
  await openCausalGapReuse(directory, manifest);
  return manifest;
}

/** Copy only manifest-bound bytes, preserving original receipts and never synthesizing an HTTP response. */
export async function copyCausalGapPriorEvidence(
  priorDirectory: string,
  destination: string,
  manifest: CausalGapReuseManifest
): Promise<void> {
  priorDirectory = await realpath(priorDirectory);
  await mkdir(destination, { recursive: true });
  destination = await realpath(destination);
  for (const item of manifest.files) {
    const source = resolve(priorDirectory, item.path),
      target = resolve(destination, item.path);
    inside(priorDirectory, source);
    inside(destination, target);
    check((await realpath(source)) === source && (await stat(source)).isFile(), 'prior-evidence-path');
    const bytes = await readFile(source);
    check(bytes.length === item.bytes && sha(bytes) === item.sha256, 'prior-evidence-changed');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'wx', mode: 0o600 });
  }
}

type PriorCache = Awaited<ReturnType<typeof openCausalGapReuse>>;
type ReuseKind = 'warmup' | 'blocks' | 'markets' | 'quotes' | 'boundFees';
/** Publish each reused identity once; all counts here are separate from fresh transport requests. */
export function createCausalGapReuseJournal(directory: string, manifest: CausalGapReuseManifest) {
  const seen = new Set<string>(),
    counts = { warmup: 0, blocks: 0, markets: 0, quotes: 0, boundFees: 0, hits: 0 };
  const rechecks = new Set<number>();
  const byPath = new Map(manifest.files.map((item) => [item.path, item]));
  return {
    counts: () => ({ ...counts }),
    identityRechecks: () => ({ blockIdentities: rechecks.size, heights: [...rechecks].sort((a, b) => a - b) }),
    async identityRecheck(height: number, files: readonly string[]): Promise<void> {
      check(Number.isSafeInteger(height) && height > 0, 'identity-recheck-height');
      if (rechecks.has(height)) return;
      const bindings = files.map((path) => {
        const binding = byPath.get(path);
        check(binding, 'unregistered-reuse-file');
        return binding;
      });
      check(bindings.length > 0, 'missing-reuse-provenance');
      await writeCausalArtifact(directory, `reuse/identity-rechecks/${height}.json`, {
        height,
        reason: 'prior-block-present-pool-mark-absent',
        priorManifestSha256: manifest.sha256,
        files: bindings,
        method: 'genuine-bounded-market-reader',
        status: 'completed-matching-prior-block',
        actualRequestsCountedByTransport: true,
      });
      rechecks.add(height);
    },
    async record<T>(kind: ReuseKind, key: string, hit: { value: T; files: readonly string[] }): Promise<T> {
      check(/^[a-z0-9-]+$/.test(key), 'reuse-key');
      const files = hit.files.map((path) => {
        const binding = byPath.get(path);
        check(binding, 'unregistered-reuse-file');
        return binding;
      });
      check(files.length > 0, 'missing-reuse-provenance');
      counts.hits++;
      const identity = `${kind}-${key}`;
      if (!seen.has(identity)) {
        await writeCausalArtifact(directory, `reuse/inventory/${identity}.json`, {
          kind,
          key,
          priorRegistrationSha256: manifest.priorRegistrationSha256,
          priorManifestSha256: manifest.sha256,
          files,
          freshNetworkRequests: 0,
        });
        seen.add(identity);
        counts[kind]++;
      }
      return hit.value;
    },
  };
}

export interface CausalAcquisitionCounts {
  warmupRequests: number;
  marketShards: number;
  quotes: number;
  boundFees: number;
  rpcRequests: number;
  peakConcurrentRequests: number;
}
/** Single authority for actual requests and logical reader invocations, with no automatic retries. */
export function createCausalAcquisitionTransport(fetcher: typeof fetch = globalThis.fetch) {
  const counts: CausalAcquisitionCounts = {
    warmupRequests: 0,
    marketShards: 0,
    quotes: 0,
    boundFees: 0,
    rpcRequests: 0,
    peakConcurrentRequests: 0,
  };
  let concurrent = 0,
    stopped = false;
  const claim = (kind: 'marketShards' | 'quotes' | 'boundFees') => {
    check(!stopped && counts[kind] < CAUSAL_ACQUISITION_LIMITS[kind], `limit-${kind}`);
    counts[kind]++;
  };
  const bounded: typeof fetch = async (input, init) => {
    check(!stopped, 'transport-stopped');
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    check(
      [INDEXER, ARCHIVE].includes(url) &&
        init?.method === 'POST' &&
        init.redirect === 'error' &&
        init.credentials === 'omit',
      'transport-authority'
    );
    const headers = new Headers(init.headers);
    check(
      [...headers.keys()].every((key) => ['content-type', 'cache-control', 'accept'].includes(key)),
      'transport-headers'
    );
    check(typeof init.body === 'string' && init.body.length < 4 * 1024 * 1024, 'transport-body');
    const body = JSON.parse(init.body);
    if (url === INDEXER) {
      const filter = body.variables?.filter;
      check(
        typeof body.query === 'string' &&
          body.query.includes('assetSnapshots') &&
          [KUSD, XOR].includes(filter?.assetId?.equalTo) &&
          filter?.type?.equalTo === 'HOUR' &&
          filter?.timestamp?.greaterThanOrEqualTo === (START - 13 * HOUR) / 1000 &&
          filter?.timestamp?.lessThan === (START - HOUR) / 1000,
        'warmup-scope'
      );
      check(counts.warmupRequests < 2, 'limit-warmup');
    } else {
      check(body.jsonrpc === '2.0' && RPC_METHODS.has(body.method) && Array.isArray(body.params), 'rpc-method');
      if (body.method === 'state_call')
        check(
          ['TransactionPaymentApi_query_info', 'TransactionPaymentApi_query_fee_details'].includes(body.params[0]),
          'rpc-call'
        );
      check(counts.rpcRequests < 60000, 'limit-rpc');
    }
    check(concurrent < 2, 'limit-concurrency');
    concurrent++;
    counts.peakConcurrentRequests = Math.max(counts.peakConcurrentRequests, concurrent);
    let released = false;
    const release = () => {
      if (!released) {
        released = true;
        concurrent--;
      }
    };
    try {
      if (url === INDEXER) counts.warmupRequests++;
      else counts.rpcRequests++;
      const response = await fetcher(input, init);
      check(!response.redirected && (!response.url || response.url === url), 'transport-redirect');
      if (!response.body) {
        release();
        return response;
      }
      const reader = response.body.getReader();
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await reader.read();
            if (next.done) {
              release();
              reader.releaseLock();
              controller.close();
            } else controller.enqueue(next.value);
          } catch (error) {
            release();
            stopped = true;
            controller.error(error);
          }
        },
        async cancel(reason) {
          try {
            await reader.cancel(reason);
          } finally {
            release();
            reader.releaseLock();
          }
        },
      });
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      release();
      stopped = true;
      throw error;
    }
  };
  return {
    fetch: bounded,
    claim,
    counts: () => ({ ...counts }),
    stop: () => {
      stopped = true;
    },
  };
}

/** Parser-only carrier: these fields cannot fund a wallet or authorize a trade. */
function parserBot(): BotDefinition {
  return {
    assetIn: { address: KUSD, symbol: 'KUSD', decimals: 18 },
    assetOut: { address: XOR, symbol: 'XOR', decimals: 18 },
    policy: { feeAsset: { address: XOR, symbol: 'XOR', decimals: 18 } },
  } as BotDefinition;
}
interface CalibrationRows {
  assets: { KUSD: { rows: IndexedPoolHistoryRow[] }; XOR: { rows: IndexedPoolHistoryRow[] } };
}
/** Decode the immutable exposed artifact without outputting market observations. */
export async function decodeCausalCalibration(bytes: Uint8Array): Promise<IndexedPoolHistoryWithEvidence> {
  check(sha(bytes) === DATA_SHA, 'calibration-hash');
  const {
    parser: { parseIndexedPoolHistoryWithEvidence },
  } = await loadDependencies();
  const rows = JSON.parse(Buffer.from(bytes).toString('utf8')) as CalibrationRows;
  check(rows.assets.KUSD.rows.length === 673 && rows.assets.XOR.rows.length === 673, 'calibration-count');
  const result = parseIndexedPoolHistoryWithEvidence(
    new Map([
      [KUSD, rows.assets.KUSD.rows],
      [XOR, rows.assets.XOR.rows],
    ]),
    parserBot(),
    { startAt: START - HOUR, endAt: END, genesisHash: GENESIS, denominator: DENOMINATOR }
  );
  check(
    result.history.missing === 0 && result.history.candles.length === 673 && result.boundaries.length === 673,
    'calibration-incomplete'
  );
  return result;
}

type MarketMark = Awaited<ReturnType<HistoricalGoalMarketReader['readMark']>>;
export interface CausalMarketAccess {
  readMark(height: number): Promise<MarketMark>;
  readBlock(height: number): ReturnType<HistoricalGoalMarketReader['readBlock']>;
}
/** Authenticate both indexed boundary projections against exact archived block times and ancestry. */
function assertIndexedBoundary(
  boundary: IndexedPoolBoundaryEvidence,
  closing: MarketMark['block'],
  successor: MarketMark['block']
): void {
  check(
    closing.hash === boundary.closing.hash &&
      closing.height === boundary.closing.height &&
      Math.floor(closing.timestampMs / 1000) === boundary.closing.timestampSeconds,
    'closing-index-mismatch'
  );
  check(
    successor.hash === boundary.successor.hash &&
      successor.height === boundary.successor.height &&
      Math.floor(successor.timestampMs / 1000) === boundary.successor.timestampSeconds &&
      successor.parentHash === closing.hash &&
      successor.height === closing.height + 1,
    'successor-index-mismatch'
  );
}
/** Check indexed signal prices against their archived direct pool while keeping raw values in local receipts. */
async function assertIndexedPrice(
  candle: BotCandle,
  mark: MarketMark,
  boundary: IndexedPoolBoundaryEvidence
): Promise<void> {
  const {
    parser: { parseIndexedPoolHistoryWithEvidence },
  } = await loadDependencies();
  check(mark.mark && mark.poolEvidence.status === 'present', 'required-pool-unavailable');
  // The shared parser determines the exact rounding convention used for indicator values.
  const proof = {
    kind: 'finalized-hour-close',
    genesisHash: GENESIS,
    completedAt: boundary.completedAtMs / 1000,
    timestamp: boundary.closing.timestampSeconds,
    blockHeight: boundary.closing.height,
    blockHash: boundary.closing.hash,
    nextBlockHeight: boundary.successor.height,
    nextBlockHash: boundary.successor.hash,
    nextTimestamp: boundary.successor.timestampSeconds,
    decimals: 18,
  };
  const row = (symbol: string) => ({
    timestamp: boundary.closing.timestampSeconds,
    denominator: DENOMINATOR,
    closeEvidence: {
      ...proof,
      symbol,
      requestedSymbol: symbol,
      xorPool:
        symbol === 'XOR'
          ? null
          : {
              baseAssetId: XOR,
              targetAssetId: KUSD,
              baseDecimals: 18,
              targetDecimals: 18,
              baseAssetReserves: mark.mark!.xorReserveCodec,
              targetAssetReserves: mark.mark!.kusdReserveCodec,
            },
    },
  });
  const parsed = parseIndexedPoolHistoryWithEvidence(
    new Map([
      [KUSD, [row('KUSD')]],
      [XOR, [row('XOR')]],
    ]),
    parserBot(),
    {
      startAt: boundary.completedAtMs - HOUR,
      endAt: boundary.completedAtMs,
      genesisHash: GENESIS,
      denominator: DENOMINATOR,
    }
  );
  check(
    parsed.history.missing === 0 && parsed.history.candles[0].close === candle.close,
    'indexed-pool-price-mismatch'
  );
}

/** Assemble one complete fixed episode; no subsequent episode is read to repair a missing datum. */
export async function collectCausalCalibrationEpisode(
  ordinal: number,
  calibration: IndexedPoolHistoryWithEvidence,
  preceding: readonly BotCandle[],
  market: CausalMarketAccess
): Promise<Omit<CausalCalibrationInput, 'candidate'>> {
  check(Number.isInteger(ordinal) && ordinal >= 0 && ordinal < 28, 'episode-ordinal');
  const offset = ordinal * 24,
    startedAtMs = START + offset * HOUR;
  const warmup = [...preceding, ...calibration.history.candles.slice(0, offset)]
    .slice(-12)
    .map(({ timestamp, close }) => ({ timestamp, close }));
  check(
    warmup.length === 12 && warmup.every((c, i) => c.timestamp === startedAtMs + (i - 12) * HOUR),
    'warmup-coverage'
  );
  const hours: CausalCalibrationHour[] = [];
  for (let i = 0; i <= 24; i++) {
    const boundary = calibration.boundaries[offset + i],
      candle = calibration.history.candles[offset + i];
    check(
      boundary &&
        candle &&
        boundary.completedAtMs === startedAtMs + i * HOUR &&
        candle.timestamp === boundary.completedAtMs,
      'episode-hour'
    );
    const closing = await market.readMark(boundary.closing.height);
    const successor =
      i < 24
        ? await market.readMark(boundary.successor.height)
        : { block: await market.readBlock(boundary.successor.height) };
    assertIndexedBoundary(boundary, closing.block, successor.block);
    await assertIndexedPrice(candle, closing, boundary);
    hours.push({
      completedAtMs: boundary.completedAtMs,
      closing: closing.block,
      successor: successor.block,
      closingPoolEvidence: closing.poolEvidence,
      ...(i < 24 ? { riskPoolEvidence: (successor as MarketMark).poolEvidence } : {}),
    });
  }
  return { startedAtMs, expectedDenominator: DENOMINATOR, warmup, hours };
}

/** Prefer authenticated exact prior observations; only absent identities reach the real bounded reader. */
export function createCausalGapMarketAccess(
  registration: CausalRegistration,
  directory: string,
  transport: ReturnType<typeof createCausalAcquisitionTransport>,
  signal: AbortSignal,
  prior: PriorCache,
  reuse: ReturnType<typeof createCausalGapReuseJournal>
) {
  type Shard = {
    reader: HistoricalGoalMarketReader;
    id: number;
    heights: Set<number>;
    blockReceipts: number;
    storageReceipts: number;
  };
  const shards: Shard[] = [],
    owners = new Map<number, Shard>(),
    marks = new Map<number, MarketMark>();
  let failed = false;
  const terminal = async <T>(operation: () => Promise<T>): Promise<T> => {
    check(!failed, 'market-access-terminal');
    try {
      return await operation();
    } catch (error) {
      failed = true;
      throw error;
    }
  };
  const flush = async (shard: Shard) => {
    const evidence = shard.reader.evidence();
    while (shard.blockReceipts < evidence.blockEvidence.length) {
      const i = shard.blockReceipts++;
      await writeCausalArtifact(directory, `raw/market-${shard.id}/block-${i}.json`, evidence.blockEvidence[i]);
    }
    while (shard.storageReceipts < evidence.storageEvidence.length) {
      const i = shard.storageReceipts++;
      await writeCausalArtifact(directory, `raw/market-${shard.id}/storage-${i}.json`, evidence.storageEvidence[i]);
    }
  };
  const owner = async (height: number): Promise<Shard> => {
    const known = owners.get(height);
    if (known) return known;
    let shard = shards.at(-1);
    if (!shard || shard.heights.size >= 64) {
      transport.claim('marketShards');
      const {
        market: { createHistoricalGoalMarketReader },
      } = await loadDependencies();
      const reader = await createHistoricalGoalMarketReader(
        { source: registration.body.sourceAnchor, expectedDenominator: DENOMINATOR },
        { fetch: transport.fetch, signal }
      );
      shard = { reader, id: shards.length, heights: new Set(), blockReceipts: 0, storageReceipts: 0 };
      shards.push(shard);
      await writeCausalArtifact(directory, `raw/market-${shard.id}/context.json`, reader.context);
      await flush(shard);
    }
    shard.heights.add(height);
    owners.set(height, shard);
    return shard;
  };
  const access: CausalMarketAccess = {
    async readBlock(height) {
      return terminal(async () => {
        const cached = prior.block(height);
        if (cached) return reuse.record('blocks', String(height), cached);
        const shard = await owner(height);
        try {
          return await shard.reader.readBlock(height);
        } finally {
          await flush(shard);
        }
      });
    },
    async readMark(height) {
      return terminal(async () => {
        const known = marks.get(height);
        if (known) return known;
        const cached = prior.market(height);
        if (cached) {
          const result = await reuse.record('markets', String(height), cached);
          marks.set(height, result);
          return result;
        }
        const cachedBlock = prior.block(height);
        const shard = await owner(height);
        try {
          const result = await shard.reader.readMark(height);
          if (cachedBlock) {
            check(canonical(result.block) === canonical(cachedBlock.value), 'prior-block-contradiction');
            await reuse.identityRecheck(height, cachedBlock.files);
          }
          await writeCausalArtifact(directory, `market/${height}.json`, result);
          marks.set(height, result);
          return result;
        } finally {
          await flush(shard);
        }
      });
    },
  };
  return access;
}

/** Reuse only an exact amount/state quote identity, with independent verified bound-fee provenance. */
export function createCausalGapQuoteProvider(
  registration: CausalRegistration,
  directory: string,
  transport: ReturnType<typeof createCausalAcquisitionTransport>,
  signal: AbortSignal,
  prior: PriorCache,
  reuse: ReturnType<typeof createCausalGapReuseJournal>
): CausalCalibrationQuoteProvider {
  const cache = new Map<string, Awaited<ReturnType<CausalCalibrationQuoteProvider>>>();
  return async (pending, hour) => {
    const {
      execution: { readHistoricalExecutionQuote },
      fee: { readHistoricalGoalBoundFee },
      join: { prepareHistoricalGoalFill },
    } = await loadDependencies();
    const input = {
      block: { hash: hour.successor.hash, height: hour.successor.height },
      finalizedSource: registration.body.sourceAnchor.finalizedSource,
      expectedDenominator: DENOMINATOR,
      assetIn: pending.assetIn,
      assetOut: pending.assetOut,
      amountInCodec: pending.amountInCodec,
    };
    const key = sha(canonical(input));
    const previous = cache.get(key);
    if (previous) return previous;
    check(cache.size < CAUSAL_ACQUISITION_LIMITS.quotes, 'limit-all-quotes');
    let quote: Awaited<ReturnType<typeof readHistoricalExecutionQuote>>;
    const cachedQuote = prior.quote(key);
    if (cachedQuote) quote = await reuse.record('quotes', key, cachedQuote);
    else {
      transport.claim('quotes');
      try {
        quote = await readHistoricalExecutionQuote(input, { fetch: transport.fetch, signal });
      } catch (error) {
        await writeCausalArtifact(
          directory,
          `raw/quotes/${key}-failed.json`,
          error && typeof error === 'object' && 'diagnostic' in error
            ? error.diagnostic
            : { failure: 'quote-reader-failed' }
        );
        throw error;
      }
      await writeCausalArtifact(directory, `raw/quotes/${key}.json`, quote);
    }
    const joined = prepareHistoricalGoalFill(
      {
        assetIn: pending.assetIn,
        assetOut: pending.assetOut,
        amountInCodec: pending.amountInCodec,
        expectedDenominator: DENOMINATOR,
      },
      pending.plan,
      hour.closing,
      hour.successor,
      quote,
      hour.riskPoolEvidence
    );
    let result: Awaited<ReturnType<CausalCalibrationQuoteProvider>> = { quoteEvidence: quote };
    if (joined.kind === 'ready') {
      check(quote.kind === 'hypothetical-historical-execution-estimate', 'ready-quote-kind');
      const metadata = quote.rpcEvidence.filter(
        (row) => row.method === 'state_getMetadata' && canonical(row.params) === canonical([hour.successor.hash])
      );
      check(metadata.length === 1 && metadata[0].responseBody, 'quote-metadata');
      const source = {
        identity: {
          genesisHash: GENESIS,
          blockHash: hour.successor.hash,
          metadataHex: JSON.parse(metadata[0].responseBody).result as string,
          runtimeVersion: quote.context.codecBinding.runtimeVersion,
        },
        blockNumber: hour.successor.height,
        request: {
          assetIn: pending.assetIn,
          assetOut: pending.assetOut,
          amountInCodec: pending.amountInCodec,
          quotedAmountOutCodec: quote.quote.amountOutCodec,
        },
        quoteEvidence: quote,
      };
      let fee: Awaited<ReturnType<typeof readHistoricalGoalBoundFee>>;
      const cachedFee = prior.boundFee(key);
      if (cachedFee) fee = await reuse.record('boundFees', key, cachedFee);
      else {
        transport.claim('boundFees');
        try {
          fee = await readHistoricalGoalBoundFee(source, { fetch: transport.fetch, signal });
        } catch (error) {
          await writeCausalArtifact(
            directory,
            `raw/fees/${key}-failed.json`,
            error && typeof error === 'object' && 'diagnostic' in error
              ? error.diagnostic
              : { failure: 'fee-reader-failed' }
          );
          throw error;
        }
        await writeCausalArtifact(directory, `raw/fees/${key}.json`, fee);
      }
      result = { quoteEvidence: quote, boundFee: { source, receipt: fee.receipt } };
    }
    cache.set(key, result);
    return result;
  };
}

/** Execute all candidates for episode zero before accessing the remaining 27 unchanged episodes. */
export async function runCausalEpisodeSequence(deps: {
  collect(ordinal: number): Promise<Omit<CausalCalibrationInput, 'candidate'>>;
  quote: CausalCalibrationQuoteProvider;
  retain(name: string, value: unknown): Promise<unknown>;
  replay?: typeof replayCausalGoalCalibration;
}): Promise<CausalCalibrationResult[][]> {
  const {
    replay: { causalCalibrationCandidates, replayCausalGoalCalibration },
  } = await loadDependencies();
  const results: CausalCalibrationResult[][] = [];
  for (let ordinal = 0; ordinal < 28; ordinal++) {
    const input = await deps.collect(ordinal),
      row: CausalCalibrationResult[] = [];
    for (const candidate of Object.keys(causalCalibrationCandidates()) as (keyof ReturnType<
      typeof causalCalibrationCandidates
    >)[]) {
      const result = await (deps.replay ?? replayCausalGoalCalibration)({ ...input, candidate }, deps.quote);
      await deps.retain(`episodes/${ordinal}/${candidate}.json`, result);
      check(result.status === 'complete', 'episode-incomplete');
      row.push(result);
    }
    results.push(row);
    if (ordinal === 0)
      await deps.retain('first-episode-complete.json', {
        ordinal: 0,
        candidates: row.map((result) => result.candidate),
        resultsSha256: sha(canonical(row)),
      });
  }
  return results;
}

/** Run exactly once; an interrupted or failed run remains terminal evidence and cannot silently restart. */
export async function runRegisteredCausalGapCalibration(directory: string, root = ROOT): Promise<void> {
  check((await realpath(root)) === (await realpath(ROOT)), 'execution-source-root');
  const registration = JSON.parse(await readFile(join(directory, 'registration.json'), 'utf8')) as CausalRegistration;
  check(registration.sha256 === sha(canonical(registration.body)), 'registration-digest');
  check(
    canonical(await registrationBody(root, registration.body.registeredAt)) === canonical(registration.body),
    'registration-source-or-plan-changed'
  );
  const transport = createCausalAcquisitionTransport(),
    controller = new AbortController();
  const {
    reuse: { openCausalGapReuse },
  } = await loadDependencies();
  const prior = await openCausalGapReuse(join(directory, 'reuse/prior'), registration.body.priorEvidence.manifest);
  const reuse = createCausalGapReuseJournal(directory, registration.body.priorEvidence.manifest);
  await writeCausalArtifact(directory, 'acquisition-started.json', {
    registrationSha256: registration.sha256,
    startedAt: new Date().toISOString(),
    restartAllowed: false,
  });
  try {
    const results = await withVerifiedCausalSources(
      root,
      [...registration.body.source.local, ...registration.body.extra],
      async () => {
        const calibration = await decodeCausalCalibration(await readFile(join(root, CALIBRATION)));
        const warmup = await reuse.record('warmup', 'fixed', prior.warmup());
        const market = createCausalGapMarketAccess(registration, directory, transport, controller.signal, prior, reuse);
        for (let i = 0; i < 12; i++) {
          const b = warmup.history.boundaries[i],
            m = await market.readMark(b.closing.height),
            s = await market.readBlock(b.successor.height);
          assertIndexedBoundary(b, m.block, s);
          await assertIndexedPrice(warmup.history.history.candles[i], m, b);
        }
        return runCausalEpisodeSequence({
          collect: (ordinal) =>
            collectCausalCalibrationEpisode(ordinal, calibration, warmup.history.history.candles, market),
          quote: createCausalGapQuoteProvider(registration, directory, transport, controller.signal, prior, reuse),
          retain: (name, value) => writeCausalArtifact(directory, name, value),
        });
      }
    );
    check(
      canonical(await registrationBody(root, registration.body.registeredAt)) === canonical(registration.body),
      'source-changed-after-acquisition'
    );
    await openCausalGapReuse(join(directory, 'reuse/prior'), registration.body.priorEvidence.manifest);
    const {
      replay: { causalCalibrationCandidates },
    } = await loadDependencies();
    await writeCausalArtifact(directory, 'complete.json', {
      registrationSha256: registration.sha256,
      completedAt: new Date().toISOString(),
      counts: transport.counts(),
      reuseCounts: reuse.counts(),
      identityRechecks: reuse.identityRechecks(),
      episodes: results.length,
      candidates: Object.keys(causalCalibrationCandidates()),
      resultsSha256: sha(canonical(results)),
      observedFill: false,
      qualificationAuthority: false,
      transactionSubmitted: false,
    });
  } catch (error) {
    controller.abort();
    transport.stop();
    const diagnostic = error && typeof error === 'object' && 'diagnostic' in error ? error.diagnostic : undefined;
    await writeCausalArtifact(directory, 'failed.json', {
      registrationSha256: registration.sha256,
      failedAt: new Date().toISOString(),
      counts: transport.counts(),
      reuseCounts: reuse.counts(),
      identityRechecks: reuse.identityRechecks(),
      reason: error instanceof Error ? error.message : 'failed',
      ...(diagnostic ? { diagnostic } : {}),
      observedFill: false,
      transactionSubmitted: false,
    });
    throw error;
  }
}

/** Explicit prepare/run CLI; importing the module never prepares or acquires anything. */
async function main(): Promise<void> {
  check(
    process.argv.length === 4 && ['prepare', 'run'].includes(process.argv[2]),
    'Usage: tsx scripts/bots/run-causal-gap-calibration.ts prepare|run NEW_OUTPUT_DIRECTORY'
  );
  const directory = resolve(process.argv[3]);
  check(directory !== ROOT, 'output-directory');
  if (process.argv[2] === 'prepare') {
    const registration = await prepareCausalGapCalibration(directory);
    process.stdout.write(
      `${JSON.stringify({ mode: 'prepare', registrationSha256: registration.sha256, directory, networkRequests: 0 })}\n`
    );
  } else {
    await runRegisteredCausalGapCalibration(directory);
    process.stdout.write(
      `${JSON.stringify({ mode: 'run', directory, status: 'complete', observedFill: false, qualificationAuthority: false })}\n`
    );
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  void main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'causal-gap-acquisition:failed'}\n`);
    process.exitCode = 1;
  });
