// @vitest-environment node
/** Complete invented archive observations; actual fixed target131 binary and original producer/evaluator. */
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { createGoalBundleEpisodeFixture } from '../../../fixtures/bots/goal-bundle-episode';
import { metadataFixtureCanonical, metadataFixtureDigest } from '../../../fixtures/bots/goal-bundle-metadata';
import {
  evaluateGoalTargetBundleTrainingEpisode,
  evaluateGoalTargetBundleValidationEpisode,
} from '../../../../scripts/bots/goal-target-bundle-episode';
import {
  createGoalBundleTrainingSource,
  type GoalBundleEpisodeInput,
  type GoalBundleValidationAdmission,
} from '../../../../src/features/bot-trading/goal-bundle-episode';
import {
  goalQualificationDigest,
  GOAL_QUALIFICATION_PROTOCOL_V2,
  GOAL_QUALIFICATION_POLICY_V2,
} from '../../../../src/features/bot-trading/goal-qualification';

const binary = readFileSync(
  '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
);
const network = vi.fn(() => {
  throw Error('Network forbidden');
});
// Replaying 1,440 minute checks and 3,017 retained artifacts takes about 400 seconds alone.
// Keep the exact trace assertions when other local test or build jobs share the machine.
const COMPLETE_EPISODE_REPLAY_TIMEOUT_MS = 15 * 60_000;
let original: Awaited<ReturnType<typeof createGoalBundleEpisodeFixture>>;
beforeAll(async () => {
  vi.stubGlobal('fetch', network);
  original = await createGoalBundleEpisodeFixture(false, undefined, true);
}, 1_200_000);
afterAll(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

function fixture() {
  const { metadata, ...raw } = original.input;
  const input: GoalBundleEpisodeInput = { ...JSON.parse(JSON.stringify(raw)), metadata };
  const artifacts = new Map(original.artifacts),
    reads: string[] = [];
  const readArtifact = async (name: string) => {
    reads.push(name);
    const value = artifacts.get(name);
    if (!value) throw Error('Missing synthetic evidence');
    return new Uint8Array(value);
  };
  const replace = (name: string, change: (value: Record<string, any>) => void) => {
    const wrapper = JSON.parse(new TextDecoder().decode(artifacts.get(name)!));
    change(wrapper.value);
    wrapper.sha256 = metadataFixtureDigest(wrapper.value);
    const receipt = input.receipts.find((r) => r.name === name)!;
    receipt.sha256 = wrapper.sha256;
    receipt.bytes = Buffer.byteLength(metadataFixtureCanonical(wrapper.value));
    artifacts.set(name, new TextEncoder().encode(metadataFixtureCanonical(wrapper) + '\n'));
  };
  return {
    input,
    artifacts,
    reads,
    readArtifact,
    replace,
    run: () => evaluateGoalTargetBundleTrainingEpisode(input, { readArtifact, compressedBytes: binary }),
  };
}

describe('fixed Node V3 raw episode replay', () => {
  it(
    'matches the real V3 archive trace from all raw causal evidence and actual target quote/fee APIs',
    async () => {
      const f = fixture();
      const result = await f.run();
      expect(goalQualificationDigest(result)).toBe(goalQualificationDigest(original.trace));
      expect(result.protocol).toBe('finalized-xyk-execution-validation-v3');
      expect(result.signals).toHaveLength(24);
      const fills = result.events.filter((e) => e.kind === 'minimum-output-fill');
      expect(fills.length).toBeGreaterThan(0);
      for (const fill of fills) {
        expect(fill.feeCodec).toBe('2000000000000000');
        expect(fill.sourceRuntimeProfileSha256).toBe(
          goalQualificationDigest(f.input.plan.executionModel!.sourceRuntimeProfile)
        );
        expect(fill.runtimeProfileSha256).toBe(
          goalQualificationDigest(f.input.plan.executionModel!.targetRuntimeProfile)
        );
      }
      expect(f.reads.filter((n) => n.startsWith('target-rpc-')).length).toBeGreaterThan(0);
      expect(f.reads).toContain('market-schema-2.json');
      expect(f.reads.some((n) => n.startsWith('history-pending-'))).toBe(true);
      expect(f.reads.at(-1)).toBe('complete-source.json');
      expect(new Set(f.reads).size).toBe(f.reads.length);
      expect(f.reads.length).toBe(f.input.receipts.length);
    },
    COMPLETE_EPISODE_REPLAY_TIMEOUT_MS
  );

  it('keeps V2 public constructors strict and refuses V2 data in the V3 entrypoint', async () => {
    const f = fixture();
    expect(() => createGoalBundleTrainingSource(f.input, { readArtifact: f.readArtifact })).toThrow('protocol');
    f.input.plan.protocol = GOAL_QUALIFICATION_PROTOCOL_V2;
    f.input.plan.policy = GOAL_QUALIFICATION_POLICY_V2;
    f.input.manifest.protocol = 'goal-qualification-archive-source-v2';
    await expect(f.run()).rejects.toThrow('protocol');
    expect(f.reads).toEqual([]);
  });

  it('requires genuine metadata ownership and refuses replaceable verifier fields or binary getters before reads', async () => {
    const f = fixture();
    const getter = vi.fn();
    await expect(
      evaluateGoalTargetBundleTrainingEpisode(f.input, {
        readArtifact: f.readArtifact,
        compressedBytes: binary,
        verifyQuote: vi.fn(),
      } as never)
    ).rejects.toThrow('dependency-fields');
    await expect(
      evaluateGoalTargetBundleTrainingEpisode(
        f.input,
        Object.defineProperty({ readArtifact: f.readArtifact }, 'compressedBytes', {
          enumerable: true,
          get: getter,
        }) as never
      )
    ).rejects.toThrow('dependency-fields');
    expect(getter).not.toHaveBeenCalled();
    f.input.metadata = JSON.parse(JSON.stringify(f.input.metadata));
    await expect(f.run()).rejects.toThrow('unowned-metadata');
    expect(f.reads).toEqual([]);
  });

  it('rejects forged validation selection before opening any validation artifact', async () => {
    const f = fixture();
    f.input.request.phase = 'validation';
    const admission = {
      selection: {},
      binding: {
        indexSha256: 'a'.repeat(64),
        planSha256: f.input.request.planSha256,
        sourceSha256: f.input.plan.source.evaluatorSha256,
        candidateSha256: f.input.request.candidateSha256,
        requestSha256: goalQualificationDigest(f.input.request),
      },
    } as GoalBundleValidationAdmission;
    await expect(
      evaluateGoalTargetBundleValidationEpisode(
        f.input,
        { readArtifact: f.readArtifact, compressedBytes: binary },
        admission
      )
    ).rejects.toThrow('unowned-selection');
    expect(f.reads).toEqual([]);
  });

  it.each(['missing', 'altered'] as const)(
    'rejects %s individual target RPC evidence despite unchanged embedded copies',
    async (kind) => {
      const f = fixture();
      const name = f.input.receipts.find((r) => r.name.startsWith('target-rpc-'))!.name;
      if (kind === 'missing') f.input.receipts = f.input.receipts.filter((r) => r.name !== name);
      else
        f.replace(name, (value) => {
          value.responseBody += ' ';
        });
      await expect(f.run()).rejects.toThrow();
      expect(f.reads).not.toContain('complete-source.json');
    },
    120000
  );

  it('rejects target wrapper IDs outside the declared clock and missing executable fee evidence', async () => {
    const f = fixture();
    f.input.receipts = [...f.input.receipts, { name: 'target-rpc-99999-1.json', sha256: 'a'.repeat(64), bytes: 2 }];
    await expect(f.run()).rejects.toThrow('target-receipt-name');
    expect(f.reads).toEqual([]);
    const g = fixture();
    const name = g.input.receipts.find((r) => r.name.startsWith('fee-'))!.name;
    g.input.receipts = g.input.receipts.filter((r) => r.name !== name);
    await expect(g.run()).rejects.toThrow();
    expect(g.reads).not.toContain('complete-source.json');
  }, 600000);

  it('aborts before a target wrapper can be used and never returns a partial trace', async () => {
    const f = fixture();
    const controller = new AbortController();
    const reader = async (name: string) => {
      const value = await f.readArtifact(name);
      if (name.startsWith('target-rpc-')) controller.abort();
      return value;
    };
    await expect(
      evaluateGoalTargetBundleTrainingEpisode(f.input, {
        readArtifact: reader,
        signal: controller.signal,
        compressedBytes: binary,
      })
    ).rejects.toThrow('aborted');
    expect(f.reads).not.toContain('complete-source.json');
  }, 600000);
});
