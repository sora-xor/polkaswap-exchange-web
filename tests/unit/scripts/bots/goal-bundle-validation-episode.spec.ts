import { describe, expect, it, vi } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createGoalBundleEpisodeFixture } from '../../../fixtures/bots/goal-bundle-episode';
import { createGoalBundleMetadataFixture } from '../../../fixtures/bots/goal-bundle-metadata';
import { createGoalBundleStudyFixture } from '../../../fixtures/bots/goal-bundle-study';
import { bundleCanonical, bundleSha } from './goal-study-bundle-fixtures';
import {
  createGoalBundleValidationSource,
  evaluateGoalBundleValidationEpisode,
  type GoalBundleEpisodeInput,
  type GoalBundleValidationAdmission,
} from '@/features/bot-trading/goal-bundle-episode';
import { verifyGoalBundleValidationMetadata } from '@/features/bot-trading/goal-bundle-metadata';
import { goalQualificationDigest } from '@/features/bot-trading/goal-qualification';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));
const HOUR = 3600000;

describe('guarded original validation episode replay', () => {
  it('uses a live boundary-issued selection, replays the original full trace, and rejects copied/changed/revoked admission', async () => {
    const oracle = await createGoalBundleEpisodeFixture(),
      startAtMs = oracle.input.request.startAtMs;
    const validation = await createGoalBundleMetadataFixture({
      partition: 'validation',
      firstHeight: 20000,
      lastHeight: 21443,
      blockIntervalMs: 60000,
      timestampOffsetMs: startAtMs - 20000 * 60000 - 120000,
      startAtMs,
      endAtMs: startAtMs + 24 * HOUR,
      metadataHex: oracle.metadataHex,
    });
    const harness = await createGoalBundleStudyFixture(async (files) => {
      const evaluatorSha256 = files.plan.source.evaluatorSha256,
        plan = JSON.parse(JSON.stringify(oracle.input.plan)),
        manifest = JSON.parse(JSON.stringify(oracle.input.manifest));
      plan.training.startAtMs = startAtMs - 118 * HOUR;
      plan.training.endAtMs = startAtMs - 2 * HOUR;
      plan.validation.startAtMs = startAtMs;
      plan.validation.endAtMs = startAtMs + 49 * HOUR;
      plan.arrivalModel.checkDurationMs = 60000;
      manifest.partitions.validation.blocksSha256 = validation.binding.blocksSha256;
      manifest.partitions.validation.receiptSha256 = validation.binding.verificationSha256;
      plan.source.evaluatorSha256 = evaluatorSha256;
      plan.source.manifestSha256 = goalQualificationDigest(manifest);
      Object.assign(files.plan, plan);
      files.protocol.manifest = manifest;
      for (const phase of ['training', 'validation']) {
        const bytes = JSON.stringify(oracle.input.metadata.blocks),
          file = files.protocol.files[`blocks-${phase}`];
        file.sha256 = bundleSha(bytes);
        await writeFile(file.path, bytes);
      }
      files.protocolSha256 = bundleSha(bundleCanonical(files.protocol));
      await writeFile(join(files.runDirectory, 'protocol.json'), JSON.stringify(files.protocol));
    });
    const f = harness.fork();
    let admission!: GoalBundleValidationAdmission,
      retained!: Awaited<ReturnType<typeof oracle.runOriginal>>,
      verified = 0;
    const { study } = await f.create(async (context) => {
      if (context.request.phase !== 'validation' || context.request.episodeIndex !== 0) return f.evidence(context);
      admission = {
        selection: context.selection!,
        binding: {
          indexSha256: context.selection!.indexSha256,
          planSha256: context.request.planSha256,
          sourceSha256: context.plan.source.evaluatorSha256,
          candidateSha256: context.request.candidateSha256,
          requestSha256: goalQualificationDigest(context.request),
        },
      };
      const metadata = await verifyGoalBundleValidationMetadata(
        validation.binding,
        { readArtifact: validation.readArtifact },
        admission
      );
      retained = await oracle.runOriginal(
        {
          plan: context.plan,
          manifest: context.manifest,
          registration: context.registration,
          request: context.request,
          metadataBinding: validation.binding,
          metadata,
        },
        admission.selection.selection
      );
      let reads = 0;
      const deps = {
        readArtifact: async (name: string) => {
          reads++;
          return retained.readArtifact(name);
        },
      };
      expect(() =>
        createGoalBundleValidationSource(retained.input, deps, JSON.parse(JSON.stringify(admission)))
      ).toThrow('unowned-selection');
      expect(() =>
        createGoalBundleValidationSource(retained.input, deps, {
          ...admission,
          binding: { ...admission.binding, candidateSha256: 'f'.repeat(64) },
        })
      ).toThrow('selection-binding');
      const changed: GoalBundleEpisodeInput = {
        ...retained.input,
        request: { ...retained.input.request, episodeIndex: 1 },
      };
      expect(() => createGoalBundleValidationSource(changed, deps, admission)).toThrow('selection-request');
      expect(reads).toBe(0);
      const replay = await evaluateGoalBundleValidationEpisode(retained.input, deps, admission);
      expect(goalQualificationDigest(replay)).toBe(goalQualificationDigest(retained.trace));
      expect(reads).toBeGreaterThan(1000);
      verified++;
      // This harness's trusted evaluator double tests selection ownership only. It does not qualify the oracle trace.
      return f.evidence(context);
    });
    try {
      await study.reverify();
      expect(verified).toBe(1);
      let lateReads = 0;
      const revokedDuringRead = createGoalBundleValidationSource(
        retained.input,
        {
          readArtifact: async (name) => {
            lateReads++;
            study.dispose();
            return retained.readArtifact(name);
          },
        },
        admission
      );
      await expect(revokedDuringRead.open(retained.input.request, admission.selection.selection)).rejects.toThrow(
        'unowned-selection'
      );
      expect(lateReads).toBe(1);
    } finally {
      study.dispose();
    }
    const read = vi.fn(retained.readArtifact);
    expect(() => createGoalBundleValidationSource(retained.input, { readArtifact: read }, admission)).toThrow(
      'unowned-selection'
    );
    expect(read).not.toHaveBeenCalled();
  }, 180000);
});
