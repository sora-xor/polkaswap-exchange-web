/** Additive persisted protocol contracts. Digests bind evidence; they do not establish authority or qualification. */
import type { GoalTerminalEvidence } from './goal-terminal';
import type { GoalPersistedSigning } from './goal-mortality';
import type { GoalExpiryEvidence } from './goal-expiry';
import type { BotDefinition, BotOrder, StrategyState } from './types';
import type { GoalSwapExecutionRequest } from '@/features/agent-trading/goal-swap';
import type {
  GoalExactCreate,
  GoalExactLedgerState,
  GoalExactMark,
  GoalExactRejection,
  GoalExactPostDeadlineJournal,
} from './goal-exact-ledger';

export const GOAL_EXECUTION_PROTOCOL = 'finalized-xyk-goal-v1' as const;
export interface GoalExecutionBinding {
  protocol: typeof GOAL_EXECUTION_PROTOCOL;
  execution: GoalSwapExecutionRequest;
  goalId: string;
  consentDigest: string;
  qualificationDigest: string;
  policyDigest: string;
}
export interface GoalExecutionBot extends BotDefinition {
  goalExecution: GoalExecutionBinding;
  goalControl: { revision: number };
  goalSignal: { completedAtMs: number | null };
  exactGoalState: GoalExactLedgerState;
  goalState?: never;
  goalTerminal?: { evidence: GoalTerminalEvidence; ledgerStateSha256: string };
  /** Actual later effects; the original deadline ledger and valuation remain immutable. */
  goalPostDeadline?: GoalExactPostDeadlineJournal;
}
export interface GoalExecutionAccountingExpected {
  goalId: string;
  revision: number;
  stateSha256: string;
}
export interface GoalExecutionControlExpected {
  goalId: string;
  controlRevision: number;
}
export interface GoalExecutionExpected extends GoalExecutionAccountingExpected, GoalExecutionControlExpected {}
export interface GoalExecutionFinalReceipt {
  goalId: string;
  orderId: string;
  account: string;
  network: string;
  txHash: string;
  blockHash: string;
  blockNumber: number;
  extrinsicIndex: number;
  success: boolean;
  outputCodec: string;
  actualFeeCodec: string;
  evidenceDigest: string;
}
export interface GoalExecutionOrder extends BotOrder {
  goalExecution: GoalExecutionBinding & {
    ledgerRevision: number;
    ledgerStateSha256: string;
    controlRevision: number;
    quoteDigest: string;
    envelopeDigest: string;
    feePolicyDigest: string;
    orderRevision: number;
    phase:
      | 'reserved'
      | 'signed'
      | 'submitted'
      | 'cancelled'
      | 'expired'
      | 'finalized-pending'
      | 'accounted'
      | 'accounted-after-deadline';
    signedEnvelopeDigest?: string;
  };
  signingEvidence?: GoalPersistedSigning;
  expiryEvidence?: GoalExpiryEvidence;
  finalReceipt?: {
    receipt: GoalExecutionFinalReceipt;
    receiptDigest: string;
    accounting: 'pending' | 'applied' | 'applied-after-deadline';
    appliedStateSha256?: string;
  };
}
export interface GoalExecutionFreshGuard {
  /** Required synchronous external owned-context check; no promises or wallet authority are inferred. */
  assertCurrent(): void;
}
export interface GoalExecutionObservation extends GoalExecutionFreshGuard {
  botId: string;
  expected: GoalExecutionExpected;
  accountingAtMs: number;
  mark: GoalExactMark;
}
export interface GoalExecutionStorage {
  initialize(
    input: GoalExecutionFreshGuard & {
      bot: BotDefinition & { goalExecution: GoalExecutionBinding };
      config: Omit<GoalExactCreate, 'startedAtMs'>;
      openingMark: GoalExactMark;
      balances: Record<string, string>;
    }
  ): Promise<GoalExecutionBot>;
  observe(input: GoalExecutionObservation): Promise<GoalExecutionBot>;
  /** Read-only terminal evidence closes the original deadline; unresolved orders prohibit closure. */
  terminal(input: {
    botId: string;
    expected: GoalExecutionExpected;
    evidence: GoalTerminalEvidence;
  }): Promise<GoalExecutionBot>;
  /** Consume one completed hour together with its exact mark; lastTradeAt remains receipt-owned. */
  recordSignal(
    input: GoalExecutionObservation & {
      expectedCompletedAtMs: number | null;
      completedAtMs: number;
      strategyState: StrategyState;
    }
  ): Promise<GoalExecutionBot>;
  reserve(
    input: GoalExecutionObservation & { order: GoalExecutionOrder; balances: Record<string, string> }
  ): Promise<{ bot: GoalExecutionBot; order?: GoalExecutionOrder; rejection?: GoalExactRejection }>;
  sign(input: {
    orderId: string;
    expectedOrderRevision: number;
    txHash: string;
    signedAtBlock: number;
    envelopeDigest: string;
    signedEnvelopeDigest: string;
    signingEvidence?: GoalPersistedSigning;
  }): Promise<GoalExecutionOrder>;
  submit(
    input: GoalExecutionFreshGuard & {
      orderId: string;
      expected: GoalExecutionExpected;
      expectedOrderRevision: number;
      txHash: string;
    }
  ): Promise<GoalExecutionOrder>;
  cancel(input: { orderId: string; expectedOrderRevision: number }): Promise<GoalExecutionOrder>;
  /** Resolve only an exact complete canonical lifetime scan; imported evidence cannot authorize this mutation. */
  expire(input: {
    orderId: string;
    expected: GoalExecutionControlExpected;
    evidence: GoalExpiryEvidence;
  }): Promise<GoalExecutionOrder>;
  persistFinalReceipt(input: { orderId: string; receipt: GoalExecutionFinalReceipt }): Promise<GoalExecutionOrder>;
  applyReceipt(
    input: Omit<GoalExecutionObservation, 'expected'> & { orderId: string; expected: GoalExecutionAccountingExpected }
  ): Promise<{ bot: GoalExecutionBot; order: GoalExecutionOrder; duplicate: boolean }>;
  pause(input: { botId: string; expected: GoalExecutionControlExpected }): Promise<GoalExecutionBot>;
  resume(
    input: GoalExecutionFreshGuard & {
      botId: string;
      expected: GoalExecutionExpected;
      sessionExpiresAt: number;
      balances: Record<string, string>;
    }
  ): Promise<GoalExecutionBot>;
}
