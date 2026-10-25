// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  createHistoricalExecutionCodec,
  HISTORICAL_EXECUTION_KUSD,
  HISTORICAL_EXECUTION_XOR,
} from '@/features/bot-trading/execution-codecs/execution';
import { createHistoricalGoalFeeCodec } from '@/features/bot-trading/execution-codecs/fee';
import {
  createGoalQualificationBoundary,
  assertGoalQualificationRuntime,
} from '@/features/bot-trading/goal-qualification';
import { createHistoricalFeeMetadataFixture } from '../../scripts/bots/fixtures/historical-goal-bound-fee-fixture';
import { syntheticQualificationPlan, syntheticQualificationEvaluator } from './goal-qualification-fixtures';

vi.unmock('@polkadot/util-crypto');

describe('codec compatibility remains separate from runtime economic qualification', () => {
  it('rejects runtime 131 even when the same metadata and envelope layout decode under both versions', async () => {
    const fixture = createHistoricalFeeMetadataFixture();
    const oldIdentity = fixture.identity;
    const nextIdentity = { ...oldIdentity, runtimeVersion: { specVersion: 131, transactionVersion: 131 } };
    const oldCodec = createHistoricalExecutionCodec(oldIdentity);
    const nextCodec = createHistoricalExecutionCodec(nextIdentity);
    expect(nextCodec.binding.metadataSha256).toBe(oldCodec.binding.metadataSha256);
    const request = {
      assetIn: HISTORICAL_EXECUTION_KUSD,
      assetOut: HISTORICAL_EXECUTION_XOR,
      amountInCodec: '2500000000000000000',
      quotedAmountOutCodec: '1000000000000000001',
    };
    const context = { blockNumber: 333 };
    const oldEnvelope = createHistoricalGoalFeeCodec(oldIdentity).buildBoundSwapEnvelope(request, context);
    const nextEnvelope = createHistoricalGoalFeeCodec(nextIdentity).buildBoundSwapEnvelope(request, context);
    expect(nextEnvelope.callHex).toBe(oldEnvelope.callHex);
    expect(nextEnvelope.envelopeHex).toBe(oldEnvelope.envelopeHex);
    expect(nextEnvelope.encodedLength).toBe(oldEnvelope.encodedLength);
    expect(nextEnvelope.estimation.payloadHex).not.toBe(oldEnvelope.estimation.payloadHex);
    expect(nextEnvelope.feeAdequacyVerified).toBe(false);

    // This synthetic plan is constructed before evaluation; no retained study/profile is relabeled.
    const plan = syntheticQualificationPlan();
    plan.runtimeProfiles[0].metadataSha256 = oldCodec.binding.metadataSha256;
    const frozenProfile = { ...plan.runtimeProfiles[0] };
    const { evaluator } = syntheticQualificationEvaluator(plan);
    const result = await createGoalQualificationBoundary(evaluator).qualify(plan);
    expect(() => assertGoalQualificationRuntime(result.verification, frozenProfile)).not.toThrow();
    expect(() =>
      assertGoalQualificationRuntime(result.verification, {
        ...frozenProfile,
        specVersion: 131,
        transactionVersion: 131,
      })
    ).toThrow();
    expect(() =>
      assertGoalQualificationRuntime(result.verification, {
        ...frozenProfile,
        codeHash: `0x${'9'.repeat(64)}`,
      })
    ).toThrow();
    expect(result.certificate.plan.runtimeProfiles).toEqual([frozenProfile]);
    expect(result.verification.runtimeProfiles).toEqual([frozenProfile]);
  }, 60_000);
});
