/** Invented continuation journal for adapter hook tests, not a causal acquisition or eligibility fixture. */
import { goalQualificationDigest as digest } from '../../../src/features/bot-trading/goal-qualification';
import { goalRawBytesSha256 } from '../../../src/features/bot-trading/goal-raw-envelope';
import {
  acquisitionCanonical,
  goalAcquisitionReplayFixture,
} from '../../unit/scripts/bots/goal-acquisition-replay-fixture';
import type { createGoalBundleStudyFixture } from './goal-bundle-study';

/** Rebind an invented completed study to a byte-pinned failed parent without changing any economic evidence. */
export function goalBundleStudyContinuationFixture(base: Awaited<ReturnType<typeof createGoalBundleStudyFixture>>) {
  const f = base.fork(),
    plan = structuredClone(base.plan);
  plan.source.evaluatorSha256 = 'a'.repeat(64);
  const parentPlanSha256 = digest(plan),
    registeredAt = '2026-01-01T00:00:00.000Z',
    registration = {
      kind: 'goal-study-registration-v1',
      plan,
      sourceSha256: plan.source.evaluatorSha256,
      registeredAt,
      registration: {
        kind: 'preregistered-unopened-validation',
        planSha256: parentPlanSha256,
        trainingIdentitySha256: plan.training.identitySha256,
        validationIdentitySha256: plan.validation.identitySha256,
        registrationSha256: digest({
          kind: 'goal-study-registration-v1',
          sourceSha256: plan.source.evaluatorSha256,
          registeredAt,
          planSha256: parentPlanSha256,
          trainingIdentitySha256: plan.training.identitySha256,
          validationIdentitySha256: plan.validation.identitySha256,
        }),
      },
    },
    request = { ...f.rootValue(`access-${f.index.episodes[0].requestSha256}`).request, planSha256: parentPlanSha256 },
    parentRequestSha256 = digest(request),
    access = {
      kind: 'goal-study-evaluation-access-v1',
      request,
      registrationSha256: registration.registration.registrationSha256,
      selectionSha256: null,
      recordedAt: registeredAt,
    },
    failed = {
      kind: 'goal-study-evaluation-failed-v1',
      requestSha256: parentRequestSha256,
      accessSha256: digest(access),
    },
    parent = goalAcquisitionReplayFixture({ registration, access, failed });
  const lineage = {
    kind: 'goal-study-acquisition-continuation-v1',
    parentPlanSha256,
    parentRegistrationSha256: registration.registration.registrationSha256,
    parentSourceSha256: plan.source.evaluatorSha256,
    parentRequestSha256,
    parentAccessSha256: digest(access),
    parentFailedRecordSha256: digest(failed),
    parentRawManifestSha256: parent.input.rawManifestSha256,
    failedHttpStatus: 502,
    childPlanSha256: f.index.planSha256,
    childSourceSha256: f.index.sourceSha256,
  };
  const artifact = (name: string, text: string) => {
    const bytes = new TextEncoder().encode(text),
      sha256 = goalRawBytesSha256(bytes);
    f.content.set(`${f.root}objects/${sha256}.bin`, bytes);
    return { name, sha256, bytes: bytes.length };
  };
  const parentArtifacts = [...parent.artifacts].map(([name, text]) =>
    artifact(
      name === 'manifest'
        ? 'acquisition-inventory'
        : name === 'access' || name === 'failed'
          ? `${name}-${parentRequestSha256}`
          : name.replace(/^raw\//, ''),
      text
    )
  );
  parentArtifacts.push(artifact('continuation-child', acquisitionCanonical(lineage) + '\n'));
  Object.assign(f.index, {
    parent: { planSha256: parentPlanSha256, requestSha256: parentRequestSha256, artifacts: parentArtifacts },
    artifacts: [...f.index.artifacts, artifact('continuation', acquisitionCanonical(lineage) + '\n')],
  });
  f.editRoot('protocol', (value) => {
    value.parent = {
      planSha256: parentPlanSha256,
      requestSha256: parentRequestSha256,
      sourceSha256: plan.source.evaluatorSha256,
      protocolSha256: 'b'.repeat(64),
    };
  });
  for (const name of ['study-claim', 'validation-claim'])
    f.editRoot(name, (value) => {
      value.planSha256 = parentPlanSha256;
      value.source = plan.source;
    });
  f.editRoot('registration', (value) => {
    value.registration.registrationSha256 = digest({
      kind: value.kind,
      sourceSha256: value.sourceSha256,
      registeredAt: value.registeredAt,
      continuationSha256: digest(lineage),
      planSha256: f.index.planSha256,
      trainingIdentitySha256: base.plan.training.identitySha256,
      validationIdentitySha256: base.plan.validation.identitySha256,
    });
  });
  const childRegistration = f.rootValue('registration').registration;
  f.editRoot('selection', (value) => {
    value.registrationSha256 = childRegistration.registrationSha256;
    const { kind: _kind, sealSha256: _seal, ...selected } = value;
    value.sealSha256 = digest({ kind: 'goal-study-selection-v1', planSha256: f.index.planSha256, ...selected });
  });
  const selection = f.rootValue('selection');
  for (const entry of f.index.episodes) {
    f.editRoot(`access-${entry.requestSha256}`, (value) => {
      value.registrationSha256 = childRegistration.registrationSha256;
      value.selectionSha256 = entry.phase === 'training' ? null : selection.sealSha256;
    });
    f.editRoot(`complete-${entry.requestSha256}`, (value) => {
      value.accessSha256 = digest(f.rootValue(`access-${entry.requestSha256}`));
    });
  }
  f.editRoot('certificate', (value) => {
    value.registration = childRegistration;
    value.selection = selection;
    const { certificateSha256: _sha, ...body } = value;
    value.certificateSha256 = digest(body);
  });
  Object.assign(f.index, { certificateSha256: f.rootValue('certificate').certificateSha256 });
  return f;
}
