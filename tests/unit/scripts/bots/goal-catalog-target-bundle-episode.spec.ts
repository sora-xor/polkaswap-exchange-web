// @vitest-environment node
/** Complete invented 24-hour mixed-runtime observations; actual producer, target WASM and independent raw replay. */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createGoalBundleEpisodeFixture } from '../../../fixtures/bots/goal-bundle-episode';
import { evaluateGoalTargetBundleTrainingEpisode } from '../../../../scripts/bots/goal-target-bundle-episode';
import {
  goalQualificationDigest,
  GOAL_QUALIFICATION_POLICY_V3,
} from '../../../../src/features/bot-trading/goal-qualification';
import {
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_MODEL_PROFILES,
  isGoalCatalogTargetExecutionModel,
} from '../../../../src/features/bot-trading/goal-target-model';
import type { GoalBundleEpisodeInput } from '../../../../src/features/bot-trading/goal-bundle-episode';

const binary = readFileSync(
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
);
const network = vi.fn(() => {
  throw Error('Network forbidden');
});
let original: Awaited<ReturnType<typeof createGoalBundleEpisodeFixture>>;
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  original = await createGoalBundleEpisodeFixture(false, undefined, true, true, (stage) => {
    console.info(JSON.stringify({ stage, heapMiB: Math.ceil(process.memoryUsage().heapUsed / 1024 ** 2) }));
  });
}, 600000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

/** Preserve the owned metadata while detaching all caller-controlled episode data. */
function fixture() {
  const { metadata, ...untrusted } = original.input;
  const input: GoalBundleEpisodeInput = { ...JSON.parse(JSON.stringify(untrusted)), metadata };
  let reads = 0;
  const readArtifact = vi.fn(async (...args: Parameters<typeof original.readArtifact>) => {
    reads++;
    if (reads === 1 || reads % 100 === 0)
      console.info(
        JSON.stringify({
          stage: `replay-artifacts-${reads}`,
          heapMiB: Math.ceil(process.memoryUsage().heapUsed / 1024 ** 2),
          rssMiB: Math.ceil(process.memoryUsage().rss / 1024 ** 2),
        })
      );
    return original.readArtifact(...args);
  });
  return {
    input,
    readArtifact,
    run: () => evaluateGoalTargetBundleTrainingEpisode(input, { readArtifact, compressedBytes: binary }),
  };
}

describe('complete catalog target episode composition', () => {
  it('reproduces the full original trace across both upgrades and charges the declared fee cap', async () => {
    const f = fixture();
    const result = await f.run();
    expect(goalQualificationDigest(result)).toBe(goalQualificationDigest(original.trace));
    expect(result.signals).toHaveLength(24);
    const model = f.input.plan.executionModel!;
    if (!isGoalCatalogTargetExecutionModel(model)) throw Error('Wrong fixture model');
    const profiles = new Set(
      result.events.filter((event) => event.kind === 'valuation').map((event) => event.runtimeProfileSha256)
    );
    expect(profiles).toEqual(new Set(model.sourceRuntimeProfiles.map(goalQualificationDigest)));
    const fills = result.events.filter((event) => event.kind === 'minimum-output-fill');
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.length).toBeLessThanOrEqual(4);
    for (const fill of fills) {
      expect(fill.feeCodec).toBe('210000000000000000');
      expect(profiles.has(fill.sourceRuntimeProfileSha256)).toBe(true);
      expect(fill.runtimeProfileSha256).toBe(goalQualificationDigest(model.targetRuntimeProfile));
    }
    const names = f.readArtifact.mock.calls.map(([name]) => name);
    expect(names).toContain('market-schema-2.json');
    expect(names.some((name) => name.startsWith('target-rpc-'))).toBe(true);
    expect(names.at(-1)).toBe('complete-source.json');
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBe(f.input.receipts.length);
  }, 600000);

  it('refuses catalog metadata under the legacy source130 model before reading episode artifacts', async () => {
    const f = fixture();
    const model = f.input.plan.executionModel!;
    if (!isGoalCatalogTargetExecutionModel(model)) throw Error('Wrong fixture model');
    const { catalogCodecSha256: _catalog, ...implementation } = model.implementation;
    f.input.plan.executionModel = {
      protocol: GOAL_TARGET_MODEL_PROTOCOL,
      sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source,
      targetRuntimeProfile: model.targetRuntimeProfile,
      targetCompressedSha256: model.targetCompressedSha256,
      implementation,
      stateModel: 'source130-exact-storage-complete-xst-v1',
      fillModel: model.fillModel,
      costPolicy: model.costPolicy,
    };
    f.input.plan.policy = GOAL_QUALIFICATION_POLICY_V3;
    f.input.plan.runtimeProfiles = [GOAL_TARGET_MODEL_PROFILES.source];
    await expect(f.run()).rejects.toThrow('metadata-model');
    expect(f.readArtifact).not.toHaveBeenCalled();
  });

  it('rejects copied catalog metadata before reading any episode artifact', async () => {
    const f = fixture();
    f.input.metadata = JSON.parse(JSON.stringify(f.input.metadata));
    await expect(f.run()).rejects.toThrow('unowned-metadata');
    expect(f.readArtifact).not.toHaveBeenCalled();
  });
});
