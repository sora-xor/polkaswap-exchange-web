/** Production composition for immutable study replay. A trusted index pin is required; no wallet surface is accepted. */
import { createGoalStudyBundleReader, type GoalStudyBundleReaderInput } from './goal-study-bundle-reader';
import { createGoalBundleStudy, type GoalBundleStudyEpisodeContext } from './goal-bundle-study';
import { createGoalBundleAcquisition, createGoalBundleContinuation } from './goal-bundle-continuation';
import {
  verifyGoalBundleMetadata,
  verifyGoalBundleValidationMetadata,
  type GoalBundleMetadataBinding,
  type GoalBundleMetadataVerification,
} from './goal-bundle-metadata';
import {
  evaluateGoalBundleTrainingEpisode,
  evaluateGoalBundleValidationEpisode,
  type GoalBundleEpisodeInput,
  type GoalBundleValidationAdmission,
} from './goal-bundle-episode';
import { goalQualificationDigest } from './goal-qualification';

export interface GoalBundleVerifierDependencies {
  /** Static evidence transport only. The composition never calls an RPC, indexer or wallet endpoint. */
  fetch: typeof fetch;
  signal?: AbortSignal;
}
const fail = (reason: string): never => {
  throw Error(`goal-bundle-verifier:${reason}`);
};

/**
 * Replay every original episode from raw evidence, recompute selection, and reverify the complete certificate.
 * The locator must come from trusted application configuration. No caller can replace the causal evaluator,
 * metadata verifier, continuation verifier or qualification boundary through this entrypoint.
 * Keep dispose with the returned verification: disposal revokes authority and aborts outstanding evidence reads.
 */
export async function reverifyGoalStudyBundle(
  input: GoalStudyBundleReaderInput,
  dependencies: GoalBundleVerifierDependencies
) {
  const lifetime = new AbortController();
  const parent = dependencies.signal;
  const abort = () => lifetime.abort();
  parent?.addEventListener('abort', abort, { once: true });
  if (parent?.aborted) abort();
  let reader: Awaited<ReturnType<typeof createGoalStudyBundleReader>> | undefined;
  let study: Awaited<ReturnType<typeof createGoalBundleStudy>> | undefined;
  let closed = false;
  const metadata = new Map<'training' | 'validation', GoalBundleMetadataVerification>();
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
    parent?.removeEventListener('abort', abort);
  };
  // Abort also revokes an already returned qualification; it is not merely a fetch cancellation.
  lifetime.signal.addEventListener('abort', dispose, { once: true });
  try {
    active();
    reader = await createGoalStudyBundleReader(input, {
      fetch: dependencies.fetch,
      signal: lifetime.signal,
    });
    active();
    const evidence = reader;
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
        verifiedMetadata =
          phase === 'training'
            ? await verifyGoalBundleMetadata(metadataBinding, metadataDependencies)
            : await verifyGoalBundleValidationMetadata(metadataBinding, metadataDependencies, admission!);
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
          ? await evaluateGoalBundleTrainingEpisode(episode, episodeDependencies)
          : await evaluateGoalBundleValidationEpisode(episode, episodeDependencies, admission!);
      active();
      return trace;
    };
    study = await createGoalBundleStudy({
      reader: evidence,
      evaluateEpisode,
      continuation: createGoalBundleContinuation(),
      acquisition: createGoalBundleAcquisition(),
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
