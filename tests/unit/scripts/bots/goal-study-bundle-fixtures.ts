/** Invented journal fixtures only; these raw values are deliberately not chain evidence. */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createGoalQualificationBoundaryV2,
  createGoalQualificationBoundaryV3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_QUALIFICATION_POLICY_CATALOG_V3,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  goalQualificationDigest as digest,
  type GoalQualificationPlan,
  type GoalQualificationEvaluationRequest,
} from '@/features/bot-trading/goal-qualification';
import {
  GOAL_QUALIFICATION_CLOCK_V2,
  type GoalQualificationClockEventV2,
} from '@/features/bot-trading/goal-qualification-clock-v2';
import {
  syntheticQualificationEpisode,
  syntheticQualificationPlan,
} from '../../features/bot-trading/goal-qualification-fixtures';
import {
  openGoalQualificationStudyStoreV2,
  openGoalQualificationStudyStoreV3,
} from '../../../../scripts/bots/goal-qualification-study-store';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  isGoalCatalogTargetExecutionModel,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
import type { GoalQualificationArchiveManifest } from '../../../../scripts/bots/goal-qualification-archive-reader';

export const bundleSha = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export function bundleCanonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(bundleCanonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${bundleCanonical((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function bundleEpisode(request: GoalQualificationEvaluationRequest, plan: GoalQualificationPlan) {
  const evidence = syntheticQualificationEpisode(request, plan);
  const events: GoalQualificationClockEventV2[] = [
    ...evidence.clock.events.filter((event) => event.kind === 'callback'),
    ...Array.from({ length: 1439 }, (_, i) => ({
      kind: 'complete' as const,
      checkId: i + 1,
      atMs: request.startAtMs + (i + 1) * 60000,
    })),
  ];
  events.sort(
    (a, b) =>
      ('arrivedAtMs' in a ? a.arrivedAtMs : a.atMs) - ('arrivedAtMs' in b ? b.arrivedAtMs : b.atMs) ||
      (a.kind === 'complete' ? -1 : 1)
  );
  events.push(
    { kind: 'deadline-cancel', checkId: 1440, atMs: request.endAtMs },
    { kind: 'deadline', atMs: request.endAtMs }
  );
  evidence.protocol =
    plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
      ? 'finalized-xyk-execution-validation-v3'
      : 'finalized-xyk-execution-validation-v2';
  if (plan.executionModel) {
    const model = plan.executionModel;
    for (const event of evidence.events) {
      if (event.kind !== 'minimum-output-fill') {
        if (isGoalCatalogTargetExecutionModel(model))
          event.runtimeProfileSha256 = digest(model.sourceRuntimeProfiles[0]);
        continue;
      }
      event.feeCodec = model.costPolicy.maximumLiveFeeCodec;
      event.sourceRuntimeProfileSha256 = digest(
        isGoalCatalogTargetExecutionModel(model) ? model.sourceRuntimeProfiles[0] : model.sourceRuntimeProfile
      );
      event.runtimeProfileSha256 = digest(model.targetRuntimeProfile);
      event.executionModelSha256 = digest(model);
    }
  }
  evidence.deadlineCancellation = null;
  evidence.clock = { protocol: GOAL_QUALIFICATION_CLOCK_V2, events };
  return evidence;
}
/** Prepare files only. Callers may supply a distinct source for an acquisition continuation. */
export async function bundleFixtureFiles(
  base: string,
  sourceText = 'synthetic source\n',
  studyRoot = join(base, 'study'),
  version: 2 | 3 = 2,
  catalogMode = false
) {
  const runDirectory = join(base, 'run'),
    outputDirectory = join(base, 'export');
  await mkdir(runDirectory, { recursive: true });
  await mkdir(studyRoot, { recursive: true });
  await writeFile(join(runDirectory, 'fixture.ts'), sourceText);
  const sources = { 'fixture.ts': bundleSha(sourceText) };
  const plan = syntheticQualificationPlan();
  plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
  plan.policy = GOAL_QUALIFICATION_POLICY_V2;
  if (version === 3) {
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
    plan.policy = catalogMode ? GOAL_QUALIFICATION_POLICY_CATALOG_V3 : GOAL_QUALIFICATION_POLICY_V3;
    plan.executionModel = readGoalTargetExecutionModel({
      protocol: catalogMode ? GOAL_CATALOG_TARGET_MODEL_PROTOCOL : GOAL_TARGET_MODEL_PROTOCOL,
      ...(catalogMode
        ? {
            sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
            catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
          }
        : { sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source }),
      targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
      targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
      implementation: {
        hostSha256: 'a'.repeat(64),
        stateCodecSha256: 'b'.repeat(64),
        quoteCodecSha256: 'c'.repeat(64),
        ...(catalogMode ? { catalogCodecSha256: 'd'.repeat(64) } : {}),
      },
      stateModel: catalogMode
        ? 'catalog-source-exact-storage-complete-xst-v1'
        : 'source130-exact-storage-complete-xst-v1',
      fillModel: 'minimum-output-hypothetical-no-market-feedback',
      costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
    });
    plan.runtimeProfiles = isGoalCatalogTargetExecutionModel(plan.executionModel)
      ? [...plan.executionModel.sourceRuntimeProfiles]
      : [plan.executionModel.sourceRuntimeProfile];
  }
  if (plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
  plan.arrivalModel.checkDurationMs = 60000;
  plan.source.evaluatorSha256 = bundleSha(bundleCanonical(sources));
  const blocks = [{ height: 1, hash: '0x' + '1'.repeat(64), parentHash: '0x' + '0'.repeat(64), timestampMs: 1 }];
  const blocksBytes = JSON.stringify(blocks),
    blocksSha256 = bundleSha(blocksBytes);
  const source = {
    finalizedSource: { hash: blocks[0].hash, height: 1, receiptSha256: 'a'.repeat(64) },
    ...(catalogMode
      ? {
          kind: 'catalog-source-v1' as const,
          schemaAnchors: [128, 129, 130].map((specVersion, index) => ({
            specVersion: specVersion as 128 | 129 | 130,
            hash: `0x${String(index + 1).repeat(64)}`,
            height: index + 1,
          })),
        }
      : { schemaAnchor: { hash: blocks[0].hash, height: 1 } }),
  };
  const manifest: GoalQualificationArchiveManifest = {
    protocol: version === 3 ? 'goal-qualification-archive-source-v3' : 'goal-qualification-archive-source-v2',
    sourceId: plan.source.sourceId,
    genesisHash: plan.candidates[0].genesisHash,
    denominator: '1',
    warmupHours: 200,
    captureModel: {
      kind: 'fixed-pinned-capture-delays-v1',
      historyReadMs: 1000,
      indexerPublicationDelayMs: 1000,
      markReadMs: 1000,
      quoteAndFeeReadMs: 4000,
    },
    partitions: {
      training: { identitySha256: plan.training.identitySha256, blocksSha256, receiptSha256: 'b'.repeat(64), source },
      validation: {
        identitySha256: plan.validation.identitySha256,
        blocksSha256,
        receiptSha256: 'b'.repeat(64),
        source,
      },
    },
    accessAuditSha256: 'c'.repeat(64),
    operationalIngestionSha256: ['d'.repeat(64)],
    maximumHttpRequests: 10000,
    maximumResponseBytes: 268435456,
  };
  plan.source.manifestSha256 = digest(manifest);
  const files: Record<string, { path: string; sha256: string }> = {};
  for (const phase of ['training', 'validation']) {
    const path = join(base, `blocks-${phase}.json`);
    await writeFile(path, blocksBytes);
    files[`blocks-${phase}`] = { path, sha256: blocksSha256 };
  }
  const protocol = { plan, manifest, sources, files };
  const protocolSha256 = bundleSha(bundleCanonical(protocol));
  await writeFile(join(runDirectory, 'protocol.json'), JSON.stringify(protocol));
  return { base, protocol, plan, studyRoot, runDirectory, outputDirectory, protocolSha256 };
}
/** A real boundary and durable store generate the synthetic certificate; neither is mocked. */
export async function completeBundleFixture(
  context: Awaited<ReturnType<typeof bundleFixtureFiles>>,
  existingStore?: Awaited<ReturnType<typeof openGoalQualificationStudyStoreV2>>
) {
  const store =
    existingStore ??
    (await (
      context.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
        ? openGoalQualificationStudyStoreV3
        : openGoalQualificationStudyStoreV2
    )({
      directory: context.studyRoot,
      sourceSha256: context.plan.source.evaluatorSha256,
    }));
  const boundary = (
    context.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
      ? createGoalQualificationBoundaryV3
      : createGoalQualificationBoundaryV2
  )({
    protocol:
      context.plan.protocol === GOAL_QUALIFICATION_PROTOCOL_V3
        ? 'finalized-xyk-execution-validation-v3'
        : 'finalized-xyk-execution-validation-v2',
    sourceSha256: context.plan.source.evaluatorSha256,
    register: store.register,
    sealSelection: store.sealSelection,
    evaluate: (request, selection) =>
      store.evaluate(request, selection, async (_, sink) => {
        await sink.retainEvidence('invented-raw', {
          fixture: true,
          requestSha256: digest(request),
          label: 'not-chain-evidence',
        });
        return bundleEpisode(request, context.plan);
      }),
  });
  try {
    const result = await boundary.qualify(context.plan);
    await writeFile(join(context.runDirectory, 'certificate.json'), bundleCanonical(result.certificate) + '\n');
    return result.certificate;
  } finally {
    boundary.revoke();
    if (!existingStore) await store.dispose();
  }
}
