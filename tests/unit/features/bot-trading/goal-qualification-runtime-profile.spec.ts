// @vitest-environment node
/** Runtime admission scope only. These economic traces are synthetic trusted-evaluator doubles. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createGoalQualificationBoundary,
  createGoalQualificationBoundaryV2,
  assertGoalQualificationRuntime,
  goalQualificationDigest,
  GOAL_QUALIFICATION_POLICY_V2,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_RELEASE_PROTOCOL,
  verifyPinnedGoalQualificationRelease,
  type GoalQualificationCertificate,
  type GoalQualificationRuntimeProfile,
} from '@/features/bot-trading/goal-qualification';
import { goalRawBytesSha256 } from '@/features/bot-trading/goal-raw-envelope';
import { syntheticQualificationEvaluator, syntheticQualificationPlan } from './goal-qualification-fixtures';
import { bundleEpisode } from '../../scripts/bots/goal-study-bundle-fixtures';
vi.unmock('@polkadot/util-crypto');
const profile131: GoalQualificationRuntimeProfile = {
  specVersion: 131,
  transactionVersion: 131,
  metadataSha256: 'a'.repeat(64),
  codeHash: `0x${'b'.repeat(64)}`,
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

describe('single exact-runtime qualification scope', () => {
  it.each(['v1', 'v2'] as const)(
    'rejects unused additional profiles before %s registration or market reads',
    async (version) => {
      const plan = syntheticQualificationPlan();
      plan.runtimeProfiles = [...plan.runtimeProfiles, profile131];
      if (version === 'v2') {
        plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
        plan.policy = GOAL_QUALIFICATION_POLICY_V2;
      }
      const source = syntheticQualificationEvaluator(plan);
      if (version === 'v2') source.evaluator.protocol = 'finalized-xyk-execution-validation-v2';
      const boundary =
        version === 'v2'
          ? createGoalQualificationBoundaryV2(source.evaluator)
          : createGoalQualificationBoundary(source.evaluator);
      await expect(boundary.qualify(plan)).rejects.toThrow('bots.errors.research');
      expect(source.calls).toEqual([]);
    }
  );

  it('cannot qualify a sole131 plan with130 fills', async () => {
    const plan = syntheticQualificationPlan(),
      originalProfile = plan.runtimeProfiles[0];
    plan.runtimeProfiles = [profile131];
    const source = syntheticQualificationEvaluator(plan, (_request, evidence) => ({
      ...evidence,
      events: evidence.events.map((event) =>
        event.kind === 'minimum-output-fill'
          ? { ...event, runtimeProfileSha256: goalQualificationDigest(originalProfile) }
          : event
      ),
    }));
    await expect(createGoalQualificationBoundary(source.evaluator).qualify(plan)).rejects.toThrow();
    expect(source.calls).toEqual(['register', 'training:0']);
  });
});

describe('imported certificate cannot broaden exact runtime scope', () => {
  let certificate: GoalQualificationCertificate;
  let originalProfile: GoalQualificationRuntimeProfile;
  beforeAll(async () => {
    const plan = syntheticQualificationPlan();
    plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    plan.policy = GOAL_QUALIFICATION_POLICY_V2;
    if (plan.arrivalModel.kind !== 'modeled-finalized-callbacks') throw Error('fixture');
    plan.arrivalModel.checkDurationMs = 60000;
    const source = syntheticQualificationEvaluator(plan);
    const boundary = createGoalQualificationBoundaryV2({
      ...source.evaluator,
      protocol: 'finalized-xyk-execution-validation-v2',
      evaluate: async (request) => bundleEpisode(request, plan),
    });
    const result = await boundary.qualify(plan);
    certificate = result.certificate;
    originalProfile = plan.runtimeProfiles[0];
    expect(() => assertGoalQualificationRuntime(result.verification, originalProfile)).not.toThrow();
    expect(() => assertGoalQualificationRuntime(result.verification, profile131)).toThrow();
    boundary.revoke();
  }, 120000);

  /** Give the edited certificate consistent public digests; hash mismatches must not be the rejection reason. */
  const expanded = () => {
    const c = clone(certificate);
    c.plan.runtimeProfiles = [...c.plan.runtimeProfiles, profile131];
    c.registration.planSha256 = goalQualificationDigest(c.plan);
    const { certificateSha256: _old, ...body } = c;
    c.certificateSha256 = goalQualificationDigest(body);
    return c;
  };

  it('rejects a digest-consistent broadened imported certificate before replay callbacks', async () => {
    const c = expanded(),
      source = syntheticQualificationEvaluator(c.plan);
    source.evaluator.protocol = 'finalized-xyk-execution-validation-v2';
    await expect(createGoalQualificationBoundaryV2(source.evaluator).reverify(c)).rejects.toThrow(
      'bots.errors.research'
    );
    expect(source.calls).toEqual([]);
  });

  it('rejects the same broadening in a correctly pinned publisher summary', () => {
    const c = expanded();
    const bundleIndexSha256 = 'd'.repeat(64);
    const original = new TextEncoder().encode(
      JSON.stringify({ protocol: GOAL_QUALIFICATION_RELEASE_PROTOCOL, bundleIndexSha256, certificate })
    );
    const control = verifyPinnedGoalQualificationRelease(original, {
      sha256: goalRawBytesSha256(original),
      bundleIndexSha256,
      certificateSha256: certificate.certificateSha256,
    });
    expect(() => assertGoalQualificationRuntime(control.verification, originalProfile)).not.toThrow();
    control.dispose();
    const bytes = new TextEncoder().encode(
      JSON.stringify({ protocol: GOAL_QUALIFICATION_RELEASE_PROTOCOL, bundleIndexSha256, certificate: c })
    );
    expect(() =>
      verifyPinnedGoalQualificationRelease(bytes, {
        sha256: goalRawBytesSha256(bytes),
        bundleIndexSha256,
        certificateSha256: c.certificateSha256,
      })
    ).toThrow('bots.errors.research');
  });
});
