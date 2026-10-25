// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import { sha256AsU8a } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import {
  createGoalQualificationBoundary,
  createGoalQualificationBoundaryV2,
  createGoalQualificationBoundaryV3,
  GOAL_QUALIFICATION_PROTOCOL_V3,
  GOAL_QUALIFICATION_POLICY_V3,
  GOAL_QUALIFICATION_POLICY_CATALOG_V3,
  GOAL_EXECUTION_EVIDENCE_V3,
  GOAL_QUALIFICATION_RELEASE_PROTOCOL,
  goalQualificationDigest,
  assertGoalQualificationRuntime,
  assertGoalQualificationFee,
  encodeGoalQualificationRelease,
  verifyPinnedGoalQualificationRelease,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationFill,
} from '@/features/bot-trading/goal-qualification';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  goalTargetSourceRuntimeProfiles,
  GOAL_TARGET_COST_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
import {
  GOAL_QUALIFICATION_CLOCK_V2,
  type GoalQualificationClockEventV2,
} from '@/features/bot-trading/goal-qualification-clock-v2';
import { syntheticQualificationPlan, syntheticQualificationEvaluator } from './goal-qualification-fixtures';

/** Invented economics exercise the boundary, never real profitability or a deployable release. */
function fixture(mutate?: (e: GoalQualificationEpisodeEvidence) => void, catalog = false) {
  const p = syntheticQualificationPlan();
  p.protocol = GOAL_QUALIFICATION_PROTOCOL_V3;
  p.policy = catalog ? GOAL_QUALIFICATION_POLICY_CATALOG_V3 : GOAL_QUALIFICATION_POLICY_V3;
  p.executionModel = readGoalTargetExecutionModel({
    ...(catalog
      ? {
          protocol: GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
          sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
          catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
        }
      : { protocol: GOAL_TARGET_MODEL_PROTOCOL, sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source }),
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: {
      hostSha256: 'a'.repeat(64),
      stateCodecSha256: 'b'.repeat(64),
      quoteCodecSha256: 'c'.repeat(64),
      ...(catalog ? { catalogCodecSha256: 'd'.repeat(64) } : {}),
    },
    stateModel: catalog ? 'catalog-source-exact-storage-complete-xst-v1' : 'source130-exact-storage-complete-xst-v1',
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '2000000000000000' },
  });
  p.runtimeProfiles = goalTargetSourceRuntimeProfiles(p.executionModel);
  if (p.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
  p.arrivalModel.checkDurationMs = 60000;
  const f = syntheticQualificationEvaluator(p, (request, e) => {
    const callbacks = e.clock.events.filter((x) => x.kind === 'callback');
    const complete: GoalQualificationClockEventV2[] = Array.from({ length: 1439 }, (_, i) => ({
      kind: 'complete',
      checkId: i + 1,
      atMs: request.startAtMs + (i + 1) * 60000,
    }));
    const events: GoalQualificationClockEventV2[] = [...callbacks, ...complete];
    events.sort(
      (a, b) =>
        ('arrivedAtMs' in a ? a.arrivedAtMs : a.atMs) - ('arrivedAtMs' in b ? b.arrivedAtMs : b.atMs) ||
        (a.kind === 'complete' ? -1 : 1)
    );
    events.push(
      { kind: 'deadline-cancel', checkId: 1440, atMs: request.endAtMs },
      { kind: 'deadline', atMs: request.endAtMs }
    );
    e.protocol = GOAL_EXECUTION_EVIDENCE_V3;
    e.deadlineCancellation = null;
    e.clock = { protocol: GOAL_QUALIFICATION_CLOCK_V2, events };
    for (const event of e.events) {
      if (event.kind !== 'minimum-output-fill') {
        if (catalog)
          event.runtimeProfileSha256 = goalQualificationDigest(
            p.runtimeProfiles[Math.floor((event.checkId - 1) / 60) % 3]
          );
        continue;
      }
      event.feeCodec = p.executionModel!.costPolicy.maximumLiveFeeCodec;
      event.sourceRuntimeProfileSha256 = goalQualificationDigest(
        p.runtimeProfiles[catalog ? event.signalIndex % 3 : 0]
      );
      event.runtimeProfileSha256 = goalQualificationDigest(p.executionModel!.targetRuntimeProfile);
      event.executionModelSha256 = goalQualificationDigest(p.executionModel);
    }
    mutate?.(e);
    return e;
  });
  f.evaluator.protocol = GOAL_EXECUTION_EVIDENCE_V3;
  return { p, ...f };
}

describe('qualification v3 separate source/target and fee stress', () => {
  const f = fixture();
  const boundary = createGoalQualificationBoundaryV3(f.evaluator);
  let result: Awaited<ReturnType<typeof boundary.qualify>>;
  beforeAll(async () => {
    result = await boundary.qualify(f.p);
  }, 120000);

  it('recomputes all episodes at the declared cap while admitting only the target runtime', () => {
    expect(f.calls).toHaveLength(8);
    expect(result.certificate.plan.runtimeProfiles[0].specVersion).toBe(130);
    expect(result.verification.runtimeProfiles[0].specVersion).toBe(131);
    expect(result.certificate.validation.every((e) => e.fills === 2 && e.feesPaidCodec === '4000000000000000')).toBe(
      true
    );
    expect(() => assertGoalQualificationRuntime(result.verification, GOAL_TARGET_MODEL_PROFILES.target)).not.toThrow();
    expect(() => assertGoalQualificationRuntime(result.verification, GOAL_TARGET_MODEL_PROFILES.source)).toThrow();
  });
  it('enforces the owned cap at exact codec boundaries and rejects serialized authority', () => {
    expect(() => assertGoalQualificationFee(result.verification, '2000000000000000')).not.toThrow();
    expect(() => assertGoalQualificationFee(result.verification, '2000000000000001')).toThrow();
    expect(() => assertGoalQualificationFee({ ...result.verification }, '1')).toThrow();
  });
  it('retains identical target identity and cap through the trusted publisher release path', () => {
    const bundleIndexSha256 = 'd'.repeat(64);
    const raw = encodeGoalQualificationRelease({ ...result, bundleIndexSha256 });
    const loaded = verifyPinnedGoalQualificationRelease(raw, {
      sha256: u8aToHex(sha256AsU8a(raw)).slice(2),
      bundleIndexSha256,
      certificateSha256: result.certificate.certificateSha256,
    });
    expect(loaded.verification.runtimeProfiles).toEqual(result.verification.runtimeProfiles);
    expect(loaded.verification.executionModel).toEqual(result.verification.executionModel);
    expect(() => assertGoalQualificationRuntime(loaded.verification, GOAL_TARGET_MODEL_PROFILES.source)).toThrow();
    expect(() => assertGoalQualificationFee(loaded.verification, '2000000000000001')).toThrow();
    loaded.dispose();
    expect(() => assertGoalQualificationFee(loaded.verification, '1')).toThrow();
  });
  it('keeps all three constructors version-specific', async () => {
    expect(() => createGoalQualificationBoundary(f.evaluator)).toThrow();
    expect(() => createGoalQualificationBoundaryV2(f.evaluator)).toThrow();
    expect(() => createGoalQualificationBoundaryV3(syntheticQualificationEvaluator().evaluator)).toThrow();
    await expect(
      createGoalQualificationBoundaryV3(fixture().evaluator).qualify(syntheticQualificationPlan())
    ).rejects.toThrow();
  });
  it('rejects a correctly hashed release whose fee summary does not charge the declared cap per fill', () => {
    const certificate = structuredClone(result.certificate);
    certificate.validation[0].feesPaidCodec = '2000000000000000';
    const { certificateSha256: _old, ...body } = certificate;
    certificate.certificateSha256 = goalQualificationDigest(body);
    const bundleIndexSha256 = 'd'.repeat(64);
    const raw = new TextEncoder().encode(
      JSON.stringify({ protocol: GOAL_QUALIFICATION_RELEASE_PROTOCOL, bundleIndexSha256, certificate })
    );
    expect(() =>
      verifyPinnedGoalQualificationRelease(raw, {
        sha256: u8aToHex(sha256AsU8a(raw)).slice(2),
        bundleIndexSha256,
        certificateSha256: certificate.certificateSha256,
      })
    ).toThrow();
  });
  it.each(['missing-model', 'historical-relabel', 'extra-target-source-profile', 'changed-cap-with-old-policy'])(
    'rejects plan inconsistency: %s',
    async (kind) => {
      const x = fixture();
      if (kind === 'missing-model') delete x.p.executionModel;
      if (kind === 'historical-relabel') x.p.runtimeProfiles = [GOAL_TARGET_MODEL_PROFILES.target];
      if (kind === 'extra-target-source-profile') x.p.runtimeProfiles = Object.values(GOAL_TARGET_MODEL_PROFILES);
      if (kind === 'changed-cap-with-old-policy')
        x.p.policy = { ...x.p.policy, targetPercent: '4' } as unknown as typeof x.p.policy;
      await expect(createGoalQualificationBoundaryV3(x.evaluator).qualify(x.p)).rejects.toThrow();
      expect(x.calls).toHaveLength(0);
    }
  );
  it.each([
    'wrong-source',
    'wrong-target',
    'wrong-model',
    'undercharged-cap',
    'raw-fees-disagree',
    'raw-fee-over-cap',
    'missing-source',
  ])('rejects fill inconsistency: %s', async (kind) => {
    const x = fixture((episode) => {
      const fill = episode.events.find((e) => e.kind === 'minimum-output-fill') as GoalQualificationFill;
      if (kind === 'wrong-source')
        fill.sourceRuntimeProfileSha256 = goalQualificationDigest(GOAL_TARGET_MODEL_PROFILES.target);
      if (kind === 'wrong-target')
        fill.runtimeProfileSha256 = goalQualificationDigest(GOAL_TARGET_MODEL_PROFILES.source);
      if (kind === 'wrong-model') fill.executionModelSha256 = 'e'.repeat(64);
      if (kind === 'undercharged-cap') fill.feeCodec = fill.queryInfoFeeCodec;
      if (kind === 'raw-fees-disagree') fill.queryDetailsFeeCodec = '1000000000000001';
      if (kind === 'raw-fee-over-cap') fill.queryInfoFeeCodec = fill.queryDetailsFeeCodec = '2000000000000001';
      if (kind === 'missing-source') delete fill.sourceRuntimeProfileSha256;
    });
    await expect(createGoalQualificationBoundaryV3(x.evaluator).qualify(x.p)).rejects.toThrow();
    expect(x.calls).toEqual(['register', 'training:0']);
  });
});

describe('qualification v3 finite catalog source model', () => {
  it('recomputes mixed source traces while live authority remains target-only with the same cap', async () => {
    const f = fixture(undefined, true);
    const result = await createGoalQualificationBoundaryV3(f.evaluator).qualify(f.p);
    expect(result.certificate.plan.runtimeProfiles.map((p) => p.specVersion)).toEqual([128, 129, 130]);
    expect(result.verification.runtimeProfiles).toEqual([GOAL_TARGET_MODEL_PROFILES.target]);
    expect(result.certificate.validation.every((e) => e.fills === 2 && e.feesPaidCodec === '4000000000000000')).toBe(
      true
    );
    for (const source of GOAL_CATALOG_TARGET_SOURCE_PROFILES)
      expect(() => assertGoalQualificationRuntime(result.verification, source)).toThrow();
    expect(() => assertGoalQualificationRuntime(result.verification, GOAL_TARGET_MODEL_PROFILES.target)).not.toThrow();
    expect(() => assertGoalQualificationFee(result.verification, '2000000000000000')).not.toThrow();
    expect(() => assertGoalQualificationFee(result.verification, '2000000000000001')).toThrow();
    const bundleIndexSha256 = 'd'.repeat(64),
      raw = encodeGoalQualificationRelease({ ...result, bundleIndexSha256 });
    const loaded = verifyPinnedGoalQualificationRelease(raw, {
      sha256: u8aToHex(sha256AsU8a(raw)).slice(2),
      bundleIndexSha256,
      certificateSha256: result.certificate.certificateSha256,
    });
    expect(loaded.verification.executionModel).toEqual(f.p.executionModel);
    loaded.dispose();
  }, 120000);
  it.each(['old-policy', 'missing-profile', 'reordered-profiles', 'wrong-code', 'extra-target'])(
    'rejects a mismatched finite plan before registration: %s',
    async (kind) => {
      const f = fixture(undefined, true);
      if (kind === 'old-policy') f.p.policy = GOAL_QUALIFICATION_POLICY_V3;
      if (kind === 'missing-profile') f.p.runtimeProfiles = f.p.runtimeProfiles.slice(1);
      if (kind === 'reordered-profiles') f.p.runtimeProfiles = [...f.p.runtimeProfiles].reverse();
      if (kind === 'wrong-code')
        f.p.runtimeProfiles = f.p.runtimeProfiles.map((p, i) =>
          i === 0 ? { ...p, codeHash: '0x' + '0'.repeat(64) } : p
        );
      if (kind === 'extra-target') f.p.runtimeProfiles = [...f.p.runtimeProfiles, GOAL_TARGET_MODEL_PROFILES.target];
      await expect(createGoalQualificationBoundaryV3(f.evaluator).qualify(f.p)).rejects.toThrow();
      expect(f.calls).toEqual([]);
    }
  );
  it.each(['different-supported-source', 'unknown-valuation', 'missing-valuation', 'source-as-target'])(
    'rejects a broken actual valuation/quote identity join: %s',
    async (kind) => {
      const f = fixture((e) => {
        const fill = e.events.find((x) => x.kind === 'minimum-output-fill') as GoalQualificationFill;
        const checkId = e.signals[fill.signalIndex].checkId;
        const mark = e.events.find((x) => x.kind === 'valuation' && x.checkId === checkId)!;
        if (kind === 'different-supported-source')
          fill.sourceRuntimeProfileSha256 = goalQualificationDigest(GOAL_CATALOG_TARGET_SOURCE_PROFILES[1]);
        if (kind === 'unknown-valuation') mark.runtimeProfileSha256 = 'e'.repeat(64);
        if (kind === 'missing-valuation') delete mark.runtimeProfileSha256;
        if (kind === 'source-as-target') fill.runtimeProfileSha256 = fill.sourceRuntimeProfileSha256!;
      }, true);
      await expect(createGoalQualificationBoundaryV3(f.evaluator).qualify(f.p)).rejects.toThrow();
      expect(f.calls).toEqual(['register', 'training:0']);
    }
  );
});
