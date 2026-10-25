/** Same-finalized-state quote collection through a deliberately read-only transport. */
import {
  EXECUTION_EVIDENCE_INPUT_CODEC,
  EXECUTION_EVIDENCE_KUSD,
  EXECUTION_EVIDENCE_XOR,
  normalizeExecutionQuote,
  validateExecutionReverseLot,
  validateExecutionSnapshot,
  type ExecutionContext,
  type ExecutionRawQuote,
  type ExecutionReverseLot,
  type ExecutionSnapshot,
} from './execution-evidence';

export interface ExecutionReader {
  context(): Promise<ExecutionContext>;
  quote(
    context: ExecutionContext,
    assetIn: string,
    assetOut: string,
    amount: string,
    onPartial?: (value: Record<string, unknown>) => void
  ): Promise<ExecutionRawQuote>;
  assertUnchanged(context: ExecutionContext): Promise<void>;
  close(): Promise<void>;
}

/** Retain public partial observations when a direction or context validation fails. */
export interface ExecutionProgress {
  stage: 'connect' | 'context' | 'buy' | 'sell' | 'continuity' | 'validate';
  context?: ExecutionContext;
  buy?: ExecutionRawQuote;
  sell?: ExecutionRawQuote;
  partial?: Record<string, unknown>;
}

/** Quote either the same-state buy minimum or an explicitly frozen lot, retaining each adapter request interval. */
export async function readExecutionSnapshot(
  reader: ExecutionReader,
  slotAt: number,
  requestStartedAt: number,
  progress: ExecutionProgress,
  now: () => number = Date.now,
  reverseLot: ExecutionReverseLot = { kind: 'same-block-buy-minimum' }
): Promise<ExecutionSnapshot> {
  const lot = validateExecutionReverseLot(reverseLot, slotAt);
  progress.stage = 'context';
  const context = await reader.context();
  progress.context = context;
  progress.stage = 'buy';
  const buyStartedAt = now();
  progress.buy = await reader.quote(
    context,
    EXECUTION_EVIDENCE_KUSD,
    EXECUTION_EVIDENCE_XOR,
    EXECUTION_EVIDENCE_INPUT_CODEC,
    (value) => {
      progress.partial = value;
    }
  );
  const buyFinishedAt = now();
  const buy = normalizeExecutionQuote(progress.buy);
  progress.stage = 'sell';
  delete progress.partial;
  const sellStartedAt = now();
  progress.sell = await reader.quote(
    context,
    EXECUTION_EVIDENCE_XOR,
    EXECUTION_EVIDENCE_KUSD,
    lot.kind === 'fixed-frozen-lot' ? lot.amountCodec : buy.minimumCodec,
    (value) => {
      progress.partial = value;
    }
  );
  const sellFinishedAt = now();
  const sell = normalizeExecutionQuote(progress.sell);
  progress.stage = 'continuity';
  await reader.assertUnchanged(context);
  progress.stage = 'validate';
  return validateExecutionSnapshot({
    schemaVersion: 1,
    purpose: 'development',
    slotAt,
    requestStartedAt,
    requestFinishedAt: now(),
    context,
    buy,
    sell,
    reverseLot: lot,
    quoteTiming: {
      buy: { startedAt: buyStartedAt, finishedAt: buyFinishedAt },
      sell: { startedAt: sellStartedAt, finishedAt: sellFinishedAt },
    },
  });
}
