/** Fixed Node-only v3 raw study replay. Pinned evidence and runtime bytes; no wallet or replaceable verifier. */
import {
  createGoalStudyBundleReader,
  type GoalStudyBundleReaderInput,
} from '../../src/features/bot-trading/goal-study-bundle-reader';
import {
  createGoalBundleStudyV3,
  type GoalBundleStudyEpisodeContext,
} from '../../src/features/bot-trading/goal-bundle-study';
import {
  verifyGoalBundleMetadata,
  verifyGoalBundleCatalogMetadata,
  verifyGoalBundleCatalogValidationMetadata,
  verifyGoalBundleValidationMetadata,
  type GoalBundleMetadataBinding,
  type GoalBundleAnyMetadataVerification,
} from '../../src/features/bot-trading/goal-bundle-metadata';
import {
  type GoalBundleEpisodeInput,
  type GoalBundleValidationAdmission,
} from '../../src/features/bot-trading/goal-bundle-episode';
import {
  evaluateGoalTargetBundleTrainingEpisode,
  evaluateGoalTargetBundleValidationEpisode,
} from './goal-target-bundle-episode';
import { snapshotGoalArchiveTargetBinary } from './goal-qualification-archive-reader';
import {
  readGoalTargetExecutionModel,
  isGoalCatalogTargetExecutionModel,
} from '../../src/features/bot-trading/goal-target-model';
import { createGoalStudyBundleCatalog } from './goal-study-bundle-catalog';
import { goalQualificationDigest } from '../../src/features/bot-trading/goal-qualification';

export interface GoalTargetStudyBundleVerifierDependencies {
  /** Static evidence transport only. The composition never calls an RPC, indexer or wallet endpoint. */
  fetch: typeof fetch;
  signal?: AbortSignal;
  /** Pinned public target131 runtime, detached before the first evidence read. */
  compressedBytes: Uint8Array;
}
function fail(reason: string): never {
  throw Error(`goal-target-bundle-verifier:${reason}`);
}

/** Snapshot trusted executable inputs without invoking accessors or accepting replacement replay dependencies. */
function own(raw: unknown, required: readonly string[], optional: readonly string[]): Record<string, unknown> {
  if (!raw || Object.getPrototypeOf(raw) !== Object.prototype) fail('dependencies');
  const descriptors = Object.getOwnPropertyDescriptors(raw);
  if (
    !required.every((name) => Object.hasOwn(descriptors, name)) ||
    !Reflect.ownKeys(descriptors).every(
      (name) =>
        typeof name === 'string' &&
        [...required, ...optional].includes(name) &&
        descriptors[name].enumerable &&
        'value' in descriptors[name]
    )
  )
    fail('dependencies');
  return Object.fromEntries(Object.entries(descriptors).map(([name, d]) => [name, d.value]));
}

/**
 * Replay every original episode from raw evidence, recompute selection, and reverify the complete certificate.
 * The locator must come from trusted application configuration. No caller can replace the causal evaluator,
 * metadata verifier, continuation verifier or qualification boundary through this entrypoint.
 * Keep dispose with the returned verification: disposal revokes authority and aborts outstanding evidence reads.
 */
export async function reverifyGoalStudyBundleV3(
  input: GoalStudyBundleReaderInput,
  dependencies: GoalTargetStudyBundleVerifierDependencies
) {
  const locator = own(input, ['rootUrl', 'indexSha256'], []);
  if (typeof locator.rootUrl !== 'string' || typeof locator.indexSha256 !== 'string') fail('locator');
  const bundle = Object.freeze({ rootUrl: locator.rootUrl, indexSha256: locator.indexSha256 });
  const raw = own(dependencies, ['fetch', 'compressedBytes'], ['signal']);
  if (typeof raw.fetch !== 'function' || (raw.signal !== undefined && !(raw.signal instanceof AbortSignal)))
    fail('dependencies');
  const compressedBytes = snapshotGoalArchiveTargetBinary(raw.compressedBytes);
  const fetcher = raw.fetch as typeof fetch;
  const parent = raw.signal as AbortSignal | undefined;
  const lifetime = new AbortController();
  const abort = () => lifetime.abort();
  parent?.addEventListener('abort', abort, { once: true });
  if (parent?.aborted) abort();
  let reader: Awaited<ReturnType<typeof createGoalStudyBundleReader>> | undefined;
  let study: Awaited<ReturnType<typeof createGoalBundleStudyV3>> | undefined;
  let closed = false;
  const metadata = new Map<'training' | 'validation', GoalBundleAnyMetadataVerification>();
  let catalog: Awaited<ReturnType<typeof createGoalStudyBundleCatalog>> | undefined;
  const active = () => {
    if (closed || lifetime.signal.aborted) fail('closed');
  };
  const dispose = () => {
    if (closed) return;
    closed = true;
    lifetime.abort();
    study?.dispose();
    reader?.dispose();
    metadata.clear();
    catalog = undefined;
    parent?.removeEventListener('abort', abort);
  };
  // Abort also revokes an already returned qualification; it is not merely a fetch cancellation.
  lifetime.signal.addEventListener('abort', dispose, { once: true });
  try {
    active();
    reader = await createGoalStudyBundleReader(bundle, {
      fetch: fetcher,
      signal: lifetime.signal,
    });
    active();
    const evidence = reader;
    if (evidence.index.parent !== null) fail('continuation-unsupported');
    if (!evidence.index.metadata) fail('metadata-required');
    const metadataIndex = evidence.index.metadata!;
    const bindingFor = (phase: 'training' | 'validation'): GoalBundleMetadataBinding => {
      const binding = metadataIndex.bindings[phase];
      const file = metadataIndex.artifacts.find((entry) => entry.name === `blocks-${phase}`);
      if (!file) fail('metadata-blocks');
      return {
        partition: phase,
        manifestSha256: binding.manifestSha256,
        verificationSha256: binding.verificationSha256,
        rawManifestSha256: binding.rawManifestSha256,
        blocksFileSha256: file!.sha256,
        blocksSha256: binding.blocksSha256,
      };
    };
    const evaluateEpisode = async (context: Readonly<GoalBundleStudyEpisodeContext>) => {
      active();
      const phase = context.request.phase;
      const model = readGoalTargetExecutionModel(context.plan.executionModel);
      const catalogMode = isGoalCatalogTargetExecutionModel(model);
      const policy = catalogMode
        ? 'verified-canonical-catalog-metadata-cache-v2'
        : 'verified-canonical-metadata-cache-v1';
      if (metadataIndex.bindings.training.policy !== policy || metadataIndex.bindings.validation.policy !== policy)
        fail('metadata-policy');
      const metadataBinding = bindingFor(phase);
      let admission: GoalBundleValidationAdmission | undefined;
      if (phase === 'validation') {
        if (!context.selection) fail('selection-required');
        admission = {
          selection: context.selection!,
          binding: {
            indexSha256: evidence.indexSha256,
            planSha256: context.request.planSha256,
            sourceSha256: evidence.index.sourceSha256,
            candidateSha256: context.request.candidateSha256,
            requestSha256: goalQualificationDigest(context.request),
          },
        };
      }
      let verifiedMetadata = metadata.get(phase);
      if (!verifiedMetadata) {
        const metadataDependencies = {
          signal: lifetime.signal,
          readArtifact: async (name: string, signal: AbortSignal) => {
            active();
            if (signal.aborted) fail('aborted');
            const bytes = await evidence.readMetadata(name);
            active();
            if (signal.aborted) fail('aborted');
            return bytes;
          },
        };
        if (catalogMode) {
          if (!catalog) {
            if (phase !== 'training') fail('catalog-training-required');
            catalog = await createGoalStudyBundleCatalog(metadataBinding, { ...metadataDependencies, compressedBytes });
            active();
            if (catalog.catalogSha256 !== model.catalogSha256) fail('catalog-model');
          }
          verifiedMetadata =
            phase === 'training'
              ? await verifyGoalBundleCatalogMetadata(metadataBinding, { ...metadataDependencies, catalog })
              : await verifyGoalBundleCatalogValidationMetadata(
                  metadataBinding,
                  { ...metadataDependencies, catalog },
                  admission!
                );
        } else {
          verifiedMetadata =
            phase === 'training'
              ? await verifyGoalBundleMetadata(metadataBinding, metadataDependencies)
              : await verifyGoalBundleValidationMetadata(metadataBinding, metadataDependencies, admission!);
        }
        active();
        metadata.set(phase, verifiedMetadata);
      }
      const episode: GoalBundleEpisodeInput = {
        plan: context.plan,
        manifest: context.manifest,
        registration: context.registration,
        request: context.request,
        receipts: context.receipts,
        metadataBinding,
        metadata: verifiedMetadata,
      };
      const episodeDependencies = {
        compressedBytes,
        signal: context.signal,
        readArtifact: async (name: string, signal: AbortSignal) => {
          active();
          if (signal.aborted) fail('aborted');
          const bytes = await context.reader.read(name);
          active();
          if (signal.aborted) fail('aborted');
          return bytes;
        },
      };
      const trace =
        phase === 'training'
          ? await evaluateGoalTargetBundleTrainingEpisode(episode, episodeDependencies)
          : await evaluateGoalTargetBundleValidationEpisode(episode, episodeDependencies, admission!);
      active();
      return trace;
    };
    study = await createGoalBundleStudyV3({
      reader: evidence,
      evaluateEpisode,
      signal: lifetime.signal,
    });
    active();
    const result = await study.reverify();
    active();
    return Object.freeze({ ...result, dispose });
  } catch (error) {
    // A dependency can finish just after abort, after the first dispose saw an unassigned handle.
    study?.dispose();
    reader?.dispose();
    dispose();
    throw error;
  }
}
