/** Fixed-dependency dispatch tests only: observers are test spies, not raw chain or profitability evidence. */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { reverifyGoalStudyBundleV3 } from '../../../../scripts/bots/goal-study-bundle-verifier-v3';
import { loadCatalogPoolFixture } from '../../../fixtures/bots/catalog-pool';
import {
  GOAL_CATALOG_TARGET_MODEL_PROTOCOL,
  GOAL_TARGET_MODEL_PROTOCOL,
  GOAL_CATALOG_TARGET_SOURCE_PROFILES,
  GOAL_TARGET_RUNTIME_CATALOG_SHA256,
  GOAL_TARGET_MODEL_PROFILES,
  GOAL_TARGET_COMPRESSED_SHA256,
  GOAL_TARGET_COST_PROTOCOL,
  readGoalTargetExecutionModel,
} from '@/features/bot-trading/goal-target-model';
const doubles = vi.hoisted(() => ({
  reader: undefined as any,
  contexts: [] as any[],
  bootstrap: vi.fn(),
  metadata: vi.fn(),
  validationMetadata: vi.fn(),
  catalogMetadata: vi.fn(),
  catalogValidationMetadata: vi.fn(),
  training: vi.fn(),
  validation: vi.fn(),
  dispose: vi.fn(),
  selection: { ownedByTestController: true },
}));
vi.mock('@/features/bot-trading/goal-study-bundle-reader', () => ({
  createGoalStudyBundleReader: async () => doubles.reader,
}));
vi.mock('@/features/bot-trading/goal-bundle-study', () => ({
  createGoalBundleStudyV3: async (input: any) => ({
    dispose: doubles.dispose,
    reverify: async () => {
      for (const ctx of doubles.contexts) await input.evaluateEpisode(ctx);
      return { dispatchComplete: true };
    },
  }),
}));
vi.mock('@/features/bot-trading/goal-bundle-metadata', () => ({
  verifyGoalBundleMetadata: doubles.metadata,
  verifyGoalBundleValidationMetadata: doubles.validationMetadata,
  verifyGoalBundleCatalogMetadata: doubles.catalogMetadata,
  verifyGoalBundleCatalogValidationMetadata: doubles.catalogValidationMetadata,
}));
vi.mock('../../../../scripts/bots/goal-study-bundle-catalog', () => ({
  createGoalStudyBundleCatalog: doubles.bootstrap,
}));
vi.mock('../../../../scripts/bots/goal-target-bundle-episode', () => ({
  evaluateGoalTargetBundleTrainingEpisode: doubles.training,
  evaluateGoalTargetBundleValidationEpisode: doubles.validation,
}));
let compressedBytes: Uint8Array, catalog: Awaited<ReturnType<typeof loadCatalogPoolFixture>>;
beforeAll(async () => {
  compressedBytes = await readFile(
    '/Users/takemiyamakoto/dev/sora2-network/runtime-upgrade-4.8.9/framenode-runtime-4.8.9.compact.compressed.wasm'
  );
  catalog = await loadCatalogPoolFixture();
});
const pin = 'a'.repeat(64),
  locator = { rootUrl: 'https://evidence.example/study/', indexSha256: pin };
function setup(catalogMode = true) {
  const policy = catalogMode ? 'verified-canonical-catalog-metadata-cache-v2' : 'verified-canonical-metadata-cache-v1';
  const model = readGoalTargetExecutionModel({
    protocol: catalogMode ? GOAL_CATALOG_TARGET_MODEL_PROTOCOL : GOAL_TARGET_MODEL_PROTOCOL,
    ...(catalogMode
      ? {
          catalogSha256: GOAL_TARGET_RUNTIME_CATALOG_SHA256,
          sourceRuntimeProfiles: GOAL_CATALOG_TARGET_SOURCE_PROFILES,
        }
      : { sourceRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.source }),
    targetRuntimeProfile: GOAL_TARGET_MODEL_PROFILES.target,
    targetCompressedSha256: GOAL_TARGET_COMPRESSED_SHA256,
    implementation: {
      hostSha256: pin,
      stateCodecSha256: pin,
      quoteCodecSha256: pin,
      ...(catalogMode ? { catalogCodecSha256: pin } : {}),
    },
    stateModel: catalogMode
      ? 'catalog-source-exact-storage-complete-xst-v1'
      : 'source130-exact-storage-complete-xst-v1',
    fillModel: 'minimum-output-hypothetical-no-market-feedback',
    costPolicy: { protocol: GOAL_TARGET_COST_PROTOCOL, maximumLiveFeeCodec: '210000000000000000' },
  });
  doubles.reader = {
    indexSha256: pin,
    index: {
      parent: null,
      sourceSha256: pin,
      metadata: {
        bindings: Object.fromEntries(
          ['training', 'validation'].map((phase) => [
            phase,
            {
              policy,
              partition: phase,
              manifestSha256: pin,
              verificationSha256: pin,
              rawManifestSha256: pin,
              blocksSha256: pin,
              initShardIndex: 0,
            },
          ])
        ),
        artifacts: ['training', 'validation'].map((phase) => ({ name: `blocks-${phase}`, sha256: pin, bytes: 1 })),
      },
    },
    readMetadata: vi.fn(async () => new Uint8Array([1])),
    dispose: vi.fn(),
  };
  doubles.contexts = ['training', 'training', 'validation', 'validation'].map((phase) => ({
    request: { phase, planSha256: pin, candidateSha256: pin },
    plan: { executionModel: model },
    manifest: {},
    registration: {},
    receipts: [],
    reader: { read: vi.fn() },
    signal: new AbortController().signal,
    ...(phase === 'validation' ? { selection: doubles.selection } : {}),
  }));
  doubles.bootstrap.mockResolvedValue(catalog);
  doubles.metadata.mockResolvedValue({ kind: 'legacy-training' });
  doubles.validationMetadata.mockResolvedValue({ kind: 'legacy-validation' });
  doubles.catalogMetadata.mockResolvedValue({ kind: 'catalog-training' });
  doubles.catalogValidationMetadata.mockResolvedValue({ kind: 'catalog-validation' });
  doubles.training.mockResolvedValue({});
  doubles.validation.mockResolvedValue({});
  return { fetch: vi.fn(), compressedBytes };
}
beforeEach(() => {
  vi.clearAllMocks();
});
describe('fixed V3 catalog composition dispatch', () => {
  it('reuses one actual schema catalog and separately guarded metadata capabilities across phases', async () => {
    const result = await reverifyGoalStudyBundleV3(locator, setup());
    expect(doubles.bootstrap).toHaveBeenCalledOnce();
    expect(doubles.catalogMetadata).toHaveBeenCalledOnce();
    expect(doubles.catalogValidationMetadata).toHaveBeenCalledOnce();
    expect(doubles.metadata).not.toHaveBeenCalled();
    expect(doubles.catalogMetadata.mock.calls[0][1].catalog).toBe(catalog);
    expect(doubles.catalogValidationMetadata.mock.calls[0][1].catalog).toBe(catalog);
    expect(doubles.catalogValidationMetadata.mock.calls[0][2].selection).toBe(doubles.selection);
    expect(doubles.training.mock.calls.map(([input]) => input.metadata.kind)).toEqual([
      'catalog-training',
      'catalog-training',
    ]);
    expect(doubles.validation.mock.calls.map(([input]) => input.metadata.kind)).toEqual([
      'catalog-validation',
      'catalog-validation',
    ]);
    result.dispose();
    expect(doubles.dispose).toHaveBeenCalledOnce();
  });
  it('keeps original source130 dispatch entirely on the original metadata path', async () => {
    const result = await reverifyGoalStudyBundleV3(locator, setup(false));
    expect(doubles.bootstrap).not.toHaveBeenCalled();
    expect(doubles.catalogMetadata).not.toHaveBeenCalled();
    expect(doubles.metadata).toHaveBeenCalledOnce();
    expect(doubles.validationMetadata).toHaveBeenCalledOnce();
    result.dispose();
  });
  it.each([true, false])(
    'refuses mismatched metadata policy for catalog=%s before schema/episode access',
    async (catalogMode) => {
      const dependencies = setup(catalogMode);
      doubles.reader.index.metadata.bindings.training.policy = catalogMode
        ? 'verified-canonical-metadata-cache-v1'
        : 'verified-canonical-catalog-metadata-cache-v2';
      await expect(reverifyGoalStudyBundleV3(locator, dependencies)).rejects.toThrow('metadata-policy');
      expect(doubles.bootstrap).not.toHaveBeenCalled();
      expect(doubles.training).not.toHaveBeenCalled();
      expect(doubles.reader.readMetadata).not.toHaveBeenCalled();
    }
  );
  it('does not enter validation metadata without the controller selection', async () => {
    const dependencies = setup();
    delete doubles.contexts[2].selection;
    await expect(reverifyGoalStudyBundleV3(locator, dependencies)).rejects.toThrow('selection-required');
    expect(doubles.catalogValidationMetadata).not.toHaveBeenCalled();
    expect(doubles.validation).not.toHaveBeenCalled();
  });
  it('blocks every episode and validation read after training metadata verification fails', async () => {
    const dependencies = setup();
    doubles.catalogMetadata.mockRejectedValueOnce(Error('original wire mismatch'));
    await expect(reverifyGoalStudyBundleV3(locator, dependencies)).rejects.toThrow('original wire mismatch');
    expect(doubles.training).not.toHaveBeenCalled();
    expect(doubles.catalogValidationMetadata).not.toHaveBeenCalled();
    expect(doubles.reader.dispose).toHaveBeenCalled();
  });
  it('cannot emit an episode after cancellation during catalog reconstruction', async () => {
    const dependencies = setup(),
      controller = new AbortController();
    doubles.bootstrap.mockImplementationOnce(async () => {
      controller.abort();
      return catalog;
    });
    await expect(reverifyGoalStudyBundleV3(locator, { ...dependencies, signal: controller.signal })).rejects.toThrow(
      'closed'
    );
    expect(doubles.catalogMetadata).not.toHaveBeenCalled();
    expect(doubles.training).not.toHaveBeenCalled();
  });
});
