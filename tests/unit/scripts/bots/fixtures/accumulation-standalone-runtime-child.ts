/** Actual Node/tsx import smoke. All evidence below is invented; no model, wallet or transport is invoked. */
import assert from 'node:assert/strict';
import { FPNumber } from '@sora-substrate/math';
import { FPNumber as SubpathFPNumber } from '@sora-substrate/math/index';
import { FPNumber as SourceFPNumber } from '@/lib/substrate/math';
import { Consts } from '@sora-substrate/liquidity-proxy';
import { createAccumulationNativeMarkFixture } from './accumulation-native-mark-fixture';
import { createAccumulationAdmissionResultFixture } from './accumulation-admission-result-fixture';
import {
  verifyAccumulationNativeMark,
  isVerifiedAccumulationNativeMark,
} from '../../../../../scripts/bots/accumulation-native-mark';
import {
  validateAccumulationAdmissionResult,
  isValidatedAccumulationAdmissionResult,
} from '../../../../../scripts/bots/accumulation-admission-result';
import {
  assessAccumulationAdmissionCompletion,
  assessAccumulationAdmissionCompletionForTesting,
} from '../../../../../scripts/bots/accumulation-completion-clock';

assert.equal(FPNumber, SubpathFPNumber);
assert.equal(FPNumber, SourceFPNumber);
assert.equal(FPNumber.fromNatural('1.25').toCodecString(), '1250000000000000000');
assert.equal(Consts.XOR, '0x0200000000000000000000000000000000000000000000000000000000000000');

const native = createAccumulationNativeMarkFixture();
const mark = verifyAccumulationNativeMark(native.raw, native.trusted, native.slot);
assert.equal(isVerifiedAccumulationNativeMark(mark), true);
assert.deepEqual(mark.reserveRatio, { numerator: '2', denominator: '3' });
assert.equal(mark.boundary?.timestampMs, native.slot.controlAtMs);
assert.equal(isVerifiedAccumulationNativeMark(JSON.parse(JSON.stringify(mark))), false);

const synthetic = createAccumulationAdmissionResultFixture();
const admission = validateAccumulationAdmissionResult(synthetic.inputBytes, synthetic.receipt, synthetic.trust);
assert.equal(isValidatedAccumulationAdmissionResult(admission), true);
assert.equal(admission.decision?.action, 'buy');
assert.equal(admission.decision.selected_input_kusd, 1);
assert.equal(admission.candidateOutcomes.length, 9);
assert.equal(isValidatedAccumulationAdmissionResult(JSON.parse(JSON.stringify(admission))), false);

const finish = admission.actualClocks.finished;
const fresh = assessAccumulationAdmissionCompletionForTesting(admission, finish);
assert.equal(fresh.status, 'fresh-research-buy');
const expired = assessAccumulationAdmissionCompletionForTesting(admission, {
  wallMs: finish.wallMs + 10_000,
  monotonicNs: String(BigInt(finish.monotonicNs) + 10_000_000_000n),
});
assert.equal(expired.status, 'unusable-buy');
assert.ok(expired.reasons.includes('acceptance-expired'));
assert.equal(expired.originalQuoteReceivedAtMs, fresh.originalQuoteReceivedAtMs);

// The production clock entry point is also exercised. Its status is time-dependent, never backdated to this fixture.
const actual = assessAccumulationAdmissionCompletion(admission);
assert.ok(Number.isSafeInteger(actual.checkedAt.wallMs));
assert.match(actual.checkedAt.monotonicNs, /^(0|[1-9]\d*)$/);
assert.equal(actual.originalQuoteReceivedAtMs, fresh.originalQuoteReceivedAtMs);
for (const result of [fresh, expired, actual]) {
  assert.equal(result.orderAuthority, false);
  assert.equal(result.financialActions, false);
}

process.stdout.write(
  JSON.stringify({
    kind: 'accumulation-standalone-runtime-smoke-v1',
    aliases: ['@/*', '@sora-substrate/math', '@sora-substrate/math/*', '@sora-substrate/liquidity-proxy'],
    amountCodec: '1250000000000000000',
    nativeMarkOwned: true,
    admissionOwned: true,
    nativeRatio: mark.reserveRatio,
    candidateCount: admission.candidateOutcomes.length,
    selectedInputKusd: admission.decision.selected_input_kusd,
    freshStatus: fresh.status,
    expiredStatus: expired.status,
    actualClockCaptured: true,
    modelInvoked: false,
    acquisitionInvoked: false,
    financialActions: false,
  }) + '\n'
);
