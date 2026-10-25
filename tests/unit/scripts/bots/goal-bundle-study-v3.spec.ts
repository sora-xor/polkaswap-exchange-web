// @vitest-environment node
/** Synthetic trusted-producer tests isolate v3 journal replay; invented values are not raw chain evidence. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createGoalBundleStudy,
  createGoalBundleStudyV3,
  assertGoalBundleStudySelection,
  type GoalBundleStudyEpisodeContext,
  type GoalBundleStudySelection,
  type GoalBundleStudyReader,
} from '@/features/bot-trading/goal-bundle-study';
import {
  createGoalQualificationBoundaryV3,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_EXECUTION_EVIDENCE_V3,
  goalQualificationDigest as digest,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationPlan,
} from '@/features/bot-trading/goal-qualification';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
import { createGoalStudyBundleReader } from '@/features/bot-trading/goal-study-bundle-reader';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import type { GoalBundleManifest } from '@/features/bot-trading/goal-bundle-reader';
import type { GoalBundleEpisodeReceipt } from '@/features/bot-trading/goal-bundle-episode';
import { openGoalQualificationStudyStoreV3 } from '../../../../scripts/bots/goal-qualification-study-store';
import type { GoalStudyBundleIndex } from '../../../../scripts/bots/goal-study-bundle-export';
import { bundleFixtureFiles, bundleEpisode, bundleCanonical } from './goal-study-bundle-fixtures';
vi.unmock('@polkadot/util-crypto');
const ROOT = 'https://v3-study.example.org/bundle/';
const encoded = (value: unknown) => new TextEncoder().encode(bundleCanonical(value) + '\n');

/** Preserve genuine boundary rules while explicitly inventing both fills and implementation hashes. */
function inventedEpisode(request: GoalQualificationEvaluationRequest, plan: GoalQualificationPlan) {
  const value = bundleEpisode(request, plan),
    model = plan.executionModel!;
  value.protocol = GOAL_EXECUTION_EVIDENCE_V3;
  for (const event of value.events)
    if (event.kind === 'minimum-output-fill') {
      event.feeCodec = model.costPolicy.maximumLiveFeeCodec;
      event.runtimeProfileSha256 = digest(model.targetRuntimeProfile);
      event.sourceRuntimeProfileSha256 = digest(model.sourceRuntimeProfile);
      event.executionModelSha256 = digest(model);
    }
  return value;
}
/** Build actual v3 journal/certificate, then serve exact original bytes using the real pinned browser reader. */
async function fixture() {
  const temp = await mkdtemp(join(tmpdir(), 'bundle-study-v3-'));
  try {
    const files = await bundleFixtureFiles(temp),
      plan = files.plan;
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
    plan.policy = GOAL_QUALIFICATION_POLICY_V3;
    plan.executionModel = readGoalTargetExecutionModel({
      protocol: GOAL_TARGET_MODEL_PROTOCOL,
      sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
      targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
      targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
      implementation: {
        hostSha256: 'a'.repeat(64),
        stateCodecSha256: 'b'.repeat(64),
        quoteCodecSha256: 'c'.repeat(64),
      },
      stateModel: 'source130-exact-storage-complete-xst-v1',
      fillModel: 'minimum-output-hypothetical-no-market-feedback',
      costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
    });
    plan.runtimeProfiles = [plan.executionModel.sourceRuntimeProfile];
    files.protocol.manifest.protocol = 'goal-qualification-archive-source-v3';
    plan.source.manifestSha256 = digest(files.protocol.manifest);
    const store = await openGoalQualificationStudyStoreV3({
      directory: files.studyRoot,
      sourceSha256: plan.source.evaluatorSha256,
    });
    const requests: Readonly<GoalQualificationEvaluationRequest>[] = [];
    const boundary = createGoalQualificationBoundaryV3({
      protocol: GOAL_EXECUTION_EVIDENCE_V3,
      sourceSha256: plan.source.evaluatorSha256,
      register: store.register,
      sealSelection: store.sealSelection,
      evaluate: (request, selection) =>
        store.evaluate(request, selection, async (_, sink) => {
          requests.push(request);
          await sink.retainEvidence('invented-raw', {
            fixture: true,
            requestSha256: digest(request),
            label: 'not-chain-evidence',
          });
          return inventedEpisode(request, plan);
        }),
    });
    let certificate;
    try {
      certificate = (await boundary.qualify(plan)).certificate;
    } finally {
      boundary.revoke();
      await store.dispose();
    }
    const index: GoalStudyBundleIndex = {
      kind: 'goal-study-evidence-bundle-v1',
      version: 1,
      protocolSha256: digest(files.protocol),
      planSha256: digest(plan),
      sourceSha256: plan.source.evaluatorSha256,
      certificateSha256: certificate.certificateSha256,
      artifacts: [],
      episodes: [],
      parent: null,
      metadata: null,
    };
    const objects = new Map<string, Uint8Array>();
    const rootArtifacts: { name: string; sha256: string; bytes: number }[] = [];
    const addRoot = (name: string, raw: Uint8Array) => {
      const sha256 = goalRawBytesSha256(raw);
      rootArtifacts.push({ name, sha256, bytes: raw.length });
      objects.set(ROOT + `objects/${sha256}.bin`, raw);
    };
    addRoot(
      'protocol',
      encoded({
        plan,
        manifest: files.protocol.manifest,
        sources: files.protocol.sources,
        protocolSha256: index.protocolSha256,
        parent: null,
      })
    );
    addRoot('certificate', encoded(certificate));
    const study = join(files.studyRoot, 'studies', index.planSha256);
    for (const name of ['registration', 'selection'])
      addRoot(name, new Uint8Array(await readFile(join(study, `${name}.json`))));
    addRoot('study-claim', new Uint8Array(await readFile(join(files.studyRoot, 'study-ids', `${plan.studyId}.json`))));
    addRoot(
      'validation-claim',
      new Uint8Array(
        await readFile(join(files.studyRoot, 'validation-partitions', `${plan.validation.identitySha256}.json`))
      )
    );
    for (const phase of ['training', 'validation']) addRoot(`metadata-${phase}`, encoded({ synthetic: true }));
    const episodes: GoalStudyBundleIndex['episodes'][number][] = [];
    for (const request of requests) {
      const id = digest(request);
      const completionBytes = new Uint8Array(await readFile(join(study, `complete-${id}.json`)));
      const complete = JSON.parse(new TextDecoder().decode(completionBytes)) as {
        rawEvidence: GoalBundleEpisodeReceipt[];
      };
      addRoot(`access-${id}`, new Uint8Array(await readFile(join(study, `access-${id}.json`))));
      addRoot(`complete-${id}`, completionBytes);
      const artifacts: { name: string; sha256: string; bytes: number }[] = [];
      for (const receipt of complete.rawEvidence) {
        const raw = new Uint8Array(await readFile(join(study, `raw-${id}`, receipt.name + '.json')));
        const sha256 = goalRawBytesSha256(raw);
        artifacts.push({ name: receipt.name, sha256, bytes: raw.length });
        objects.set(ROOT + `episodes/${id}/objects/${sha256}.bin`, raw);
      }
      const manifest: GoalBundleManifest = {
        version: 1,
        kind: 'goal-episode-evidence-bundle-v1',
        phase: request.phase,
        planSha256: index.planSha256,
        requestSha256: id,
        sourceSha256: index.sourceSha256,
        artifacts,
      };
      const raw = encoded(manifest);
      objects.set(ROOT + `episodes/${id}/manifest.json`, raw);
      episodes.push({
        phase: request.phase,
        candidateSha256: request.candidateSha256,
        episodeIndex: request.episodeIndex,
        requestSha256: id,
        manifestSha256: goalRawBytesSha256(raw),
      });
    }
    index.artifacts = rootArtifacts;
    index.episodes = episodes;
    return {
      plan,
      certificate,
      fork() {
        const content = new Map([...objects].map(([k, v]) => [k, new Uint8Array(v)]));
        const current = structuredClone(index),
          requested: string[] = [];
        const rootValue = (name: string): Record<string, unknown> => {
          const pin = current.artifacts.find((p) => p.name === name)!;
          return JSON.parse(new TextDecoder().decode(content.get(ROOT + `objects/${pin.sha256}.bin`)!));
        };
        const editRoot = (name: string, edit: (value: Record<string, unknown>) => void) => {
          const pin = current.artifacts.find((p) => p.name === name)!,
            value = rootValue(name);
          edit(value);
          const bytes = encoded(value);
          Object.assign(pin, { sha256: goalRawBytesSha256(bytes), bytes: bytes.length });
          content.set(ROOT + `objects/${pin.sha256}.bin`, bytes);
        };
        const open = () => {
          const raw = encoded(current);
          content.set(ROOT + 'index.json', raw);
          return createGoalStudyBundleReader(
            { rootUrl: ROOT, indexSha256: goalRawBytesSha256(raw) },
            {
              fetch: async (url) => {
                const key = String(url);
                requested.push(key);
                const bytes = content.get(key);
                if (!bytes) throw Error('missing invented bundle');
                const response = new Response(new Uint8Array(bytes));
                Object.defineProperty(response, 'url', { value: key });
                return response;
              },
            }
          );
        };
        const evidence = async (context: Readonly<GoalBundleStudyEpisodeContext>) => {
          for (const receipt of context.receipts) await context.reader.read(receipt.name);
          return inventedEpisode(context.request, context.plan);
        };
        const create = async (evaluateEpisode = evidence) => {
          const reader = await open();
          return { reader, study: await createGoalBundleStudyV3({ reader, evaluateEpisode }) };
        };
        return { index: current, content, requested, rootValue, editRoot, open, evidence, create };
      },
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
let base: Awaited<ReturnType<typeof fixture>>;
beforeAll(async () => {
  base = await fixture();
}, 120000);
const binding = (value: GoalBundleStudySelection, requestSha256?: string) => ({
  indexSha256: value.indexSha256,
  planSha256: value.planSha256,
  sourceSha256: value.sourceSha256,
  candidateSha256: value.selection.candidateSha256,
  ...(requestSha256 ? { requestSha256 } : {}),
});
/** Assert protected completion and episode files never crossed the reader boundary. */
function noValidation(f: ReturnType<typeof base.fork>) {
  for (const entry of f.index.episodes.filter((e) => e.phase === 'validation')) {
    const pin = f.index.artifacts.find((p) => p.name === `complete-${entry.requestSha256}`)!;
    expect(f.requested).not.toContain(ROOT + `objects/${pin.sha256}.bin`);
    expect(f.requested.some((url) => url.includes(`/episodes/${entry.requestSha256}/`))).toBe(false);
  }
}

describe('explicit v3 completed-study replay', () => {
  it('reproduces actual v3 summaries with stress fees, source/target roles and live owned selection', async () => {
    const f = base.fork(),
      seen: Readonly<GoalBundleStudyEpisodeContext>[] = [];
    const { study, reader } = await f.create(async (context) => {
      seen.push(context);
      if (context.selection)
        assertGoalBundleStudySelection(context.selection, binding(context.selection, digest(context.request)));
      else expect(seen.length).toBeLessThanOrEqual(4);
      return f.evidence(context);
    });
    const result = await study.reverify();
    expect(result.certificate).toEqual(base.certificate);
    expect(result.verification.runtimeProfiles).toEqual([GOAL_TARGET_MODEL_PROFILES.target]);
    expect(result.certificate.plan.runtimeProfiles).toEqual([GOAL_TARGET_MODEL_PROFILES.source]);
    expect(result.verification.executionModel).toEqual(base.plan.executionModel);
    expect(result.certificate.validation.every((e) => e.fills === 2 && e.feesPaidCodec === '4000000000000000')).toBe(
      true
    );
    expect(seen.map((c) => c.request.phase)).toEqual([
      'training',
      'training',
      'training',
      'training',
      'validation',
      'validation',
    ]);
    const selected = seen[4].selection!,
      requestId = selected.validationRequests[0];
    const before = f.requested.length;
    expect(() => assertGoalBundleStudySelection({ ...selected }, binding(selected))).toThrow('unowned');
    await expect(reader.openValidationEpisode(requestId, { ...selected })).rejects.toThrow('unowned');
    expect(f.requested).toHaveLength(before);
    expect(() =>
      assertGoalBundleStudySelection(selected, { ...binding(selected), requestSha256: 'f'.repeat(64) })
    ).toThrow('selection-binding');
    study.dispose();
    expect(() => assertGoalBundleStudySelection(selected, binding(selected))).toThrow('unowned');
    await expect(study.reverify()).rejects.toThrow('closed');
  }, 120000);

  it.each(['v2-entry', 'v2-plan', 'v2-manifest'] as const)(
    'rejects %s before completion or episode reads',
    async (kind) => {
      const f = base.fork();
      if (kind === 'v2-plan')
        f.editRoot('protocol', (value) => {
          (value.plan as GoalQualificationPlan).protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
        });
      if (kind === 'v2-manifest')
        f.editRoot('protocol', (value) => {
          (value.manifest as { protocol: string }).protocol = 'goal-qualification-archive-source-v2';
        });
      const reader = await f.open(),
        evaluateEpisode = vi.fn(f.evidence);
      await expect(
        (kind === 'v2-entry' ? createGoalBundleStudy : createGoalBundleStudyV3)({ reader, evaluateEpisode })
      ).rejects.toThrow('protocol-version');
      expect(evaluateEpisode).not.toHaveBeenCalled();
      expect(f.requested.some((url) => url.includes('/episodes/'))).toBe(false);
      noValidation(f);
    }
  );

  it.each(['continuation', 'acquisition'] as const)('rejects the %s dependency before any root read', async (kind) => {
    const f = base.fork(),
      reader = await f.open(),
      before = f.requested.length,
      prepare = vi.fn();
    try {
      await expect(
        createGoalBundleStudyV3({ reader, evaluateEpisode: f.evidence, [kind]: { prepare } })
      ).rejects.toThrow('fields');
      expect(f.requested).toHaveLength(before);
      expect(prepare).not.toHaveBeenCalled();
    } finally {
      reader.dispose();
    }
  });

  it.each(['index-parent', 'index-continuation', 'protocol-parent', 'acquisition-receipt'] as const)(
    'rejects %s lineage before protected episode reads',
    async (kind) => {
      const f = base.fork();
      if (kind === 'protocol-parent')
        f.editRoot('protocol', (value) => {
          value.parent = { planSha256: 'f'.repeat(64) };
        });
      if (kind === 'acquisition-receipt')
        f.editRoot(`complete-${f.index.episodes[0].requestSha256}`, (value) => {
          const receipts = value.rawEvidence as GoalBundleEpisodeReceipt[];
          receipts[0].name = 'acquisition-prefix-market-0';
          value.rawManifestSha256 = digest(receipts);
        });
      let reader: GoalBundleStudyReader = await f.open();
      if (kind === 'index-parent')
        reader = {
          ...reader,
          index: {
            ...reader.index,
            parent: { planSha256: 'a'.repeat(64), requestSha256: 'b'.repeat(64), artifacts: [] },
          },
        };
      if (kind === 'index-continuation')
        reader = {
          ...reader,
          index: {
            ...reader.index,
            artifacts: [...reader.index.artifacts, { name: 'continuation', sha256: 'a'.repeat(64), bytes: 1 }],
          },
        };
      const evaluateEpisode = vi.fn(f.evidence);
      await expect(
        (async () => {
          const study = await createGoalBundleStudyV3({ reader, evaluateEpisode });
          await study.reverify();
        })()
      ).rejects.toThrow('v3-lineage-unsupported');
      expect(evaluateEpisode).not.toHaveBeenCalled();
      expect(f.requested.some((url) => url.includes('/episodes/'))).toBe(false);
      noValidation(f);
    }
  );

  it.each(['raw-cap', 'modeled-cap', 'source-role', 'target-role'] as const)(
    'rejects changed %s before selection even when recomputation and completion agree',
    async (kind) => {
      const f = base.fork(),
        id = f.index.episodes[0].requestSha256;
      const change = (e: GoalQualificationEpisodeEvidence) => {
        const fill = e.events.find((v) => v.kind === 'minimum-output-fill')!;
        if (fill.kind === 'minimum-output-fill') {
          if (kind === 'raw-cap') fill.queryInfoFeeCodec = fill.queryDetailsFeeCodec = '3000000000000000';
          if (kind === 'modeled-cap') fill.feeCodec = '1';
          if (kind === 'source-role') fill.sourceRuntimeProfileSha256 = digest(GOAL_TARGET_MODEL_PROFILES.target);
          if (kind === 'target-role') fill.runtimeProfileSha256 = digest(GOAL_TARGET_MODEL_PROFILES.source);
        }
      };
      f.editRoot(`complete-${id}`, (value) => {
        change(value.evidence as GoalQualificationEpisodeEvidence);
        value.evidenceSha256 = digest(value.evidence);
      });
      const { study } = await f.create(async (context) => {
        const e = await f.evidence(context);
        change(e);
        return e;
      });
      await expect(study.reverify()).rejects.toThrow();
      noValidation(f);
    }
  );

  it('withholds validation if recomputed training differs from the original full trace', async () => {
    const f = base.fork(),
      { study } = await f.create(async (context) => {
        const e = await f.evidence(context);
        e.dataSha256 = 'f'.repeat(64);
        return e;
      });
    await expect(study.reverify()).rejects.toThrow('recomputed-evidence');
    noValidation(f);
  });

  it('revokes the shared selection capability when the validation producer aborts the study', async () => {
    const f = base.fork(),
      reader = await f.open(),
      controller = new AbortController();
    let selected: GoalBundleStudySelection | undefined;
    const study = await createGoalBundleStudyV3({
      reader,
      signal: controller.signal,
      evaluateEpisode: async (context) => {
        if (context.selection) {
          selected = context.selection;
          controller.abort();
          expect(context.signal.aborted).toBe(true);
        }
        return f.evidence(context);
      },
    });
    await expect(study.reverify()).rejects.toThrow('closed');
    expect(selected).toBeDefined();
    expect(() => assertGoalBundleStudySelection(selected, binding(selected!))).toThrow('unowned');
    expect(f.requested.some((url) => url.includes(`/episodes/${f.index.episodes.at(-1)!.requestSha256}/`))).toBe(false);
  });
});
