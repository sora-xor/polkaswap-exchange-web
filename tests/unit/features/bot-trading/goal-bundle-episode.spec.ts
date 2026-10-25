// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createGoalBundleEpisodeFixture } from '../../../fixtures/bots/goal-bundle-episode';
import {
  createGoalBundleTrainingSource,
  createGoalBundleValidationSource,
  evaluateGoalBundleTrainingEpisode,
  type GoalBundleValidationAdmission,
  type GoalBundleTrainingInput,
} from '@/features/bot-trading/goal-bundle-episode';
import { goalQualificationDigest } from '@/features/bot-trading/goal-qualification';
import { metadataFixtureCanonical, metadataFixtureDigest } from '../../../fixtures/bots/goal-bundle-metadata';

vi.unmock('@polkadot/util-crypto');
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));
let original: Awaited<ReturnType<typeof createGoalBundleEpisodeFixture>>;
beforeAll(async () => {
  original = await createGoalBundleEpisodeFixture();
}, 120000);

function fixture() {
  const { metadata, ...input } = original.input;
  const detached: GoalBundleTrainingInput = { ...JSON.parse(JSON.stringify(input)), metadata };
  const artifacts = new Map(original.artifacts);
  const reads: string[] = [];
  const readArtifact = async (name: string) => {
    reads.push(name);
    const value = artifacts.get(name);
    if (!value) throw Error('missing synthetic artifact');
    return new Uint8Array(value);
  };
  const replace = (name: string, change: (value: Record<string, unknown>) => void) => {
    const wrapper = JSON.parse(new TextDecoder().decode(artifacts.get(name)!));
    change(wrapper.value);
    wrapper.sha256 = metadataFixtureDigest(wrapper.value);
    const receipt = detached.receipts.find((v) => v.name === name)!;
    receipt.sha256 = wrapper.sha256;
    receipt.bytes = new TextEncoder().encode(metadataFixtureCanonical(wrapper.value)).length;
    artifacts.set(name, new TextEncoder().encode(metadataFixtureCanonical(wrapper) + '\n'));
  };
  return { input: detached, artifacts, reads, readArtifact, replace };
}

describe('complete original training episode replay in the browser', () => {
  it('reproduces the real archive source/evaluator trace, including history waits, schema rotation and exact quotes', async () => {
    const f = fixture(),
      network = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
        throw Error('network forbidden');
      });
    try {
      const trace = await evaluateGoalBundleTrainingEpisode(f.input, { readArtifact: f.readArtifact });
      expect(goalQualificationDigest(trace)).toBe(goalQualificationDigest(original.trace));
      expect(trace.signals).toHaveLength(24);
      expect(trace.events.filter((e) => e.kind === 'minimum-output-fill').length).toBeGreaterThan(0);
      expect(f.reads.some((name) => name.startsWith('history-pending-'))).toBe(true);
      expect(f.reads).toContain('market-schema-2.json');
      expect(f.reads.filter((name) => name.startsWith('quote-context-')).length).toBeGreaterThan(0);
      expect(f.reads.at(-1)).toBe('complete-source.json');
      expect(new Set(f.reads).size).toBe(f.reads.length);
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  }, 120000);

  it('requires the private owned metadata result before any artifact read', () => {
    const f = fixture();
    f.input.metadata = JSON.parse(JSON.stringify(f.input.metadata));
    expect(() => createGoalBundleTrainingSource(f.input, { readArtifact: f.readArtifact })).toThrow('unowned-metadata');
    expect(f.reads).toEqual([]);
  });

  it('refuses validation and a changed original source receipt before reads', () => {
    const f = fixture();
    f.input.request.phase = 'validation';
    expect(() => createGoalBundleTrainingSource(f.input, { readArtifact: f.readArtifact })).toThrow(
      'validation-unsupported'
    );
    expect(f.reads).toEqual([]);
  });

  it('rejects a serialized selection claim before reading any validation wrapper', () => {
    const f = fixture();
    f.input.request.phase = 'validation';
    const admission = {
      selection: {
        kind: 'reverified-training-study-selection-v1',
        indexSha256: 'a'.repeat(64),
        planSha256: f.input.request.planSha256,
        sourceSha256: f.input.plan.source.evaluatorSha256,
        selection: {
          kind: 'selection-sealed-before-validation',
          registrationSha256: f.input.registration.registrationSha256,
          candidateSha256: f.input.request.candidateSha256,
          validationIdentitySha256: f.input.plan.validation.identitySha256,
          trainingSha256: 'b'.repeat(64),
          sealSha256: 'c'.repeat(64),
        },
        validationRequests: [goalQualificationDigest(f.input.request)],
      },
      binding: {
        indexSha256: 'a'.repeat(64),
        planSha256: f.input.request.planSha256,
        sourceSha256: f.input.plan.source.evaluatorSha256,
        candidateSha256: f.input.request.candidateSha256,
        requestSha256: goalQualificationDigest(f.input.request),
      },
    } as GoalBundleValidationAdmission;
    expect(() => createGoalBundleValidationSource(f.input, { readArtifact: f.readArtifact }, admission)).toThrow(
      'unowned-selection'
    );
    expect(f.reads).toEqual([]);
  });

  it('verifies the complete original clock/source object before opening the pool', async () => {
    const f = fixture();
    f.replace('source.json', (value) => {
      value.observedHistoricalArrivals = true;
    });
    await expect(evaluateGoalBundleTrainingEpisode(f.input, { readArtifact: f.readArtifact })).rejects.toThrow(
      'source-projection'
    );
    expect(f.reads).toEqual(['source.json']);
  });

  it('rejects omitted original semantic evidence without substitution', async () => {
    const f = fixture();
    f.input.receipts = f.input.receipts.filter((r) => r.name !== 'opening.json');
    await expect(evaluateGoalBundleTrainingEpisode(f.input, { readArtifact: f.readArtifact })).rejects.toThrow(
      'missing-receipt'
    );
    expect(f.reads).not.toContain('valuation-1.json');
  });

  it('rejects a changed canonical value byte count even when its digest is valid', async () => {
    const f = fixture();
    f.input.receipts.find((r) => r.name === 'source.json')!.bytes++;
    await expect(evaluateGoalBundleTrainingEpisode(f.input, { readArtifact: f.readArtifact })).rejects.toThrow(
      'receipt-bytes'
    );
  });

  it('stops concurrent/repeated calls and aborts a reader which ignores cancellation', async () => {
    const f = fixture(),
      controller = new AbortController();
    let started!: () => void;
    const invoked = new Promise<void>((resolve) => {
      started = resolve;
    });
    const source = createGoalBundleTrainingSource(f.input, {
      signal: controller.signal,
      readArtifact: async () => {
        started();
        return new Promise(() => undefined);
      },
    });
    const pending = source.open(f.input.request);
    await invoked;
    await expect(source.open(f.input.request)).rejects.toThrow('concurrent-or-closed');
    controller.abort();
    await expect(pending).rejects.toThrow('aborted');
    await expect(source.open(f.input.request)).rejects.toThrow('concurrent-or-closed');
  });

  it('recomputes logical source completion counters and rejects a rehashed false total', async () => {
    const f = fixture();
    f.replace('complete-source.json', (value) => {
      value.requests = Number(value.requests) + 1;
    });
    await expect(evaluateGoalBundleTrainingEpisode(f.input, { readArtifact: f.readArtifact })).rejects.toThrow(
      'source-completion'
    );
  }, 120000);

  it('leaves original acquisition provenance to the study reader without treating it as extra economic evidence', async () => {
    const f = fixture();
    f.input.receipts = [
      ...f.input.receipts,
      ...[
        'composition-metadata',
        'metadata-cache-binding',
        'cache-1',
        'acquisition-1-1-1',
        'acquisition-prefix-history-1',
      ].map((name) => ({ name, sha256: 'a'.repeat(64), bytes: 2 })),
    ];
    const trace = await evaluateGoalBundleTrainingEpisode(f.input, { readArtifact: f.readArtifact });
    expect(goalQualificationDigest(trace)).toBe(goalQualificationDigest(original.trace));
    expect(f.reads).not.toContain('composition-metadata');
    expect(f.reads).not.toContain('acquisition-1-1-1');
  }, 120000);

  it('reproduces an original deadline-cancelled prefix and closes using the real terminal successor', async () => {
    const ended = await createGoalBundleEpisodeFixture(true);
    const trace = await evaluateGoalBundleTrainingEpisode(ended.input, { readArtifact: ended.readArtifact });
    expect(goalQualificationDigest(trace)).toBe(goalQualificationDigest(ended.trace));
    expect(ended.values.has('deadline-cancelled-stage.json')).toBe(true);
    expect(trace.terminal.successor.timestampMs).toBeGreaterThan(trace.terminal.accountingAtMs);
  }, 120000);
});
