/** Synthetic causal-evaluator contract double; never a production qualification provider. */
import {
  GOAL_QUALIFICATION_POLICY,
  GOAL_QUALIFICATION_PROTOCOL,
  goalQualificationDigest,
  type GoalQualificationPlan,
  type GoalQualificationEvaluator,
  type GoalQualificationEpisodeEvidence,
  type GoalQualificationEvaluationRequest,
  type GoalQualificationFill,
  type GoalQualificationValuation,
} from '@/features/bot-trading/goal-qualification';
import type { GoalQualificationClockEvent } from '@/features/bot-trading/goal-qualification-clock';
import { GOAL_LIVE_CLOCK_PROTOCOL } from '@/features/bot-trading/goal-live-clock';
import {
  createGoalExactLedger,
  GOAL_EXACT_KUSD as KUSD,
  GOAL_EXACT_XOR as XOR,
} from '@/features/bot-trading/goal-exact-ledger';
import { goalStorageBot, goalTestCodec, goalTestHash, goalTestSha, goalTestMark } from './goal-storage-fixtures';
const HOUR = 3600000,
  DAY = 24 * HOUR,
  UNIT = 10n ** 18n;
export function syntheticQualificationPlan(): GoalQualificationPlan {
  const bot = goalStorageBot();
  return {
    protocol: GOAL_QUALIFICATION_PROTOCOL,
    studyId: 'synthetic-study',
    policy: GOAL_QUALIFICATION_POLICY,
    source: {
      sourceId: 'synthetic-source',
      manifestSha256: goalTestSha(100),
      collectorSha256: goalTestSha(101),
      evaluatorSha256: goalTestSha(102),
    },
    runtimeProfiles: [
      { specVersion: 130, transactionVersion: 130, metadataSha256: goalTestSha(103), codeHash: goalTestHash(104) },
    ],
    arrivalModel: {
      kind: 'modeled-finalized-callbacks',
      model: 'fixed-nonnegative-delays-v1',
      finalityDelayMs: 0,
      callbackDelayMs: 0,
      processingDelayMs: 0,
      checkDurationMs: 3000,
    },
    training: { identitySha256: goalTestSha(105), startAtMs: HOUR, endAtMs: 117 * HOUR },
    validation: { identitySha256: goalTestSha(106), startAtMs: 119 * HOUR, endAtMs: 168 * HOUR },
    candidates: [
      {
        genesisHash: bot.network,
        denominator: '1',
        initialKusdCodec: goalTestCodec(10),
        maxTradeKusdCodec: goalTestCodec(2),
        maxTradeXorCodec: goalTestCodec(2),
        strategy: {
          ...bot.strategy,
          kind: 'sma',
          amount: '2',
          intervalMs: HOUR,
          fastWindow: 2,
          slowWindow: 3,
          signalTiming: 'closed-hour',
        },
      },
    ],
  };
}
export function syntheticQualificationEpisode(
  request: GoalQualificationEvaluationRequest,
  plan: GoalQualificationPlan
): GoalQualificationEpisodeEvidence {
  const events: (GoalQualificationValuation | GoalQualificationFill)[] = [];
  const base = Math.floor(request.startAtMs / 60000) * 10;
  const buyOut = (2n * UNIT * 9940n) / 10000n,
    buyMin = (buyOut * 9950n) / 10000n;
  const sellOut = (((buyMin * 9940n) / 10000n) * 100n) / 96n;
  for (let i = 0; i < 1440; i++) {
    const at = request.startAtMs + i * 60000;
    const mark = {
      blockHash: goalTestHash(base + i * 10 + 1),
      blockNumber: base + i * 10 + 1,
      timestampMs: at,
      denominator: '1',
      kusdReserveCodec: goalTestCodec(100000),
      xorReserveCodec: goalTestCodec(i >= 60 && i < 120 ? 96000 : 100000),
    };
    events.push({
      kind: 'valuation',
      checkId: i + 1,
      captureStartedAtMs: at,
      receivedAtMs: at + 500,
      mark,
      evidenceSha256: goalTestSha(1000 + i),
    });
    if (i === 0 || i === 60) {
      const out = i === 0 ? buyOut : sellOut;
      events.push({
        kind: 'minimum-output-fill',
        signalIndex: i === 0 ? 0 : 1,
        contextReceivedAtMs: at + 1000,
        receivedAtMs: at + 2000,
        mark,
        inputAsset: i === 0 ? KUSD : XOR,
        inputCodec: String(i === 0 ? 2n * UNIT : buyMin),
        outputAsset: i === 0 ? XOR : KUSD,
        quotedOutputCodec: String(out),
        withoutImpactCodec: String(out),
        minimumOutputCodec: String((out * 9950n) / 10000n),
        feeCodec: '1000000000000000',
        queryInfoFeeCodec: '1000000000000000',
        queryDetailsFeeCodec: '1000000000000000',
        runtimeProfileSha256: goalQualificationDigest(plan.runtimeProfiles[0]),
        quoteEvidenceSha256: goalTestSha(4000 + i),
        feeEvidenceSha256: goalTestSha(5000 + i),
      });
    }
  }
  const clockEvents: GoalQualificationClockEvent[] = [];
  for (let i = 0; i < 14400; i++) {
    const at = request.startAtMs + i * 6000,
      block = {
        height: base + i + 1,
        hash: goalTestHash(base + i + 1),
        parentHash: goalTestHash(base + i),
        timestampMs: at,
      };
    clockEvents.push({ kind: 'callback', arrivedAtMs: at, processedAtMs: at, block });
    if (i % 10 === 0) clockEvents.push({ kind: 'complete', checkId: i / 10 + 1, atMs: at + 3000 });
  }
  clockEvents.push({ kind: 'deadline', atMs: request.endAtMs });
  const opening = {
    fundedAtMs: request.startAtMs,
    receivedAtMs: request.startAtMs,
    mark: (events[0] as GoalQualificationValuation).mark,
    evidenceSha256: goalTestSha(8000),
  };
  const terminalMark = {
    ...opening.mark,
    blockHash: goalTestHash(base + 14401),
    blockNumber: base + 14401,
    timestampMs: request.endAtMs,
  };
  return {
    protocol: 'finalized-xyk-execution-validation-v1',
    opening,
    clock: { protocol: GOAL_LIVE_CLOCK_PROTOCOL, events: clockEvents },
    terminal: {
      accountingAtMs: request.endAtMs,
      mark: terminalMark,
      successor: {
        height: base + 14402,
        hash: goalTestHash(base + 14402),
        parentHash: terminalMark.blockHash,
        timestampMs: request.endAtMs + 6000,
      },
      evidenceSha256: goalTestSha(8001),
    },
    requestSha256: goalQualificationDigest(request),
    dataSha256: goalQualificationDigest({ request, kind: 'synthetic-data' }),
    signals: Array.from({ length: 24 }, (_, index) => ({
      index,
      checkId: index * 60 + 1,
      completedAtMs: request.startAtMs + index * HOUR,
      availableAtMs: request.startAtMs + index * HOUR + 500,
      decisionAtMs: request.startAtMs + index * HOUR + 500,
      action: index < 2 ? 'filled' : 'hold',
      evidenceSha256: goalTestSha(6000 + index),
    })),
    events,
  };
}
export function syntheticQualificationEvaluator(
  plan = syntheticQualificationPlan(),
  mutate?: (
    request: GoalQualificationEvaluationRequest,
    evidence: GoalQualificationEpisodeEvidence
  ) => GoalQualificationEpisodeEvidence
) {
  const calls: string[] = [];
  const evaluator: GoalQualificationEvaluator = {
    protocol: 'finalized-xyk-execution-validation-v1',
    sourceSha256: plan.source.evaluatorSha256,
    register: async (input) => {
      calls.push('register');
      if (goalQualificationDigest(input) !== goalQualificationDigest(plan)) throw Error('Changed preregistration');
      return {
        kind: 'preregistered-unopened-validation',
        planSha256: goalQualificationDigest(input),
        registrationSha256: goalTestSha(701),
        trainingIdentitySha256: plan.training.identitySha256,
        validationIdentitySha256: plan.validation.identitySha256,
      };
    },
    evaluate: async (request, selection) => {
      calls.push(`${request.phase}:${request.episodeIndex}`);
      if (request.phase === 'validation' && !selection) throw Error('Unsealed validation');
      const evidence = syntheticQualificationEpisode(request, plan);
      return mutate ? mutate(request, evidence) : evidence;
    },
    sealSelection: async (input) => {
      calls.push('seal');
      return { ...input, kind: 'selection-sealed-before-validation', sealSha256: goalTestSha(702) };
    },
  };
  return { evaluator, calls };
}
export function botForSyntheticQualification(certificateSha256: string, policySha256: string) {
  const bot = goalStorageBot();
  const b = syntheticQualificationPlan().candidates[0];
  const state = createGoalExactLedger(
    {
      goalId: bot.goalExecution.goalId,
      startedAtMs: bot.exactGoalState.episode.startedAtMs,
      initialKusdCodec: b.initialKusdCodec,
      maxTradeKusdCodec: b.maxTradeKusdCodec,
      maxTradeXorCodec: b.maxTradeXorCodec,
    },
    goalTestMark()
  );
  return {
    ...bot,
    strategy: b.strategy,
    policy: { ...bot.policy, maxTradeCodec: { [KUSD]: b.maxTradeKusdCodec, [XOR]: b.maxTradeXorCodec } },
    exactGoalState: state,
    goalExecution: { ...bot.goalExecution, qualificationDigest: certificateSha256, policyDigest: policySha256 },
  };
}
