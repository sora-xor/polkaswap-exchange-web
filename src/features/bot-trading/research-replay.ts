import { FPNumber } from '@/lib/substrate/math';
import { decimalRatio } from './engine';
import type { ResearchCosts, ResearchResult, ResearchSummary } from './research';

/** Exact accounting visible after a chronological prefix of trade balls has landed. */
export interface ResearchReplaySnapshot extends Readonly<ResearchSummary>, Readonly<ResearchCosts> {
  readonly landedCount: number;
  readonly timestamp: number | null;
  /** Index into the original portfolio equity series, including its opening allocation. */
  readonly equityIndex: number;
  readonly equityValue: string;
  readonly returnPercent: string;
}

const PRECISION = 36;
const ZERO = new FPNumber('0', PRECISION);
const HUNDRED = new FPNumber('100', PRECISION);

/**
 * Precompute one immutable-in-use snapshot per landed count, starting at zero.
 * Input is the chronological output of runResearch. A single equity cursor keeps
 * preparation O(candidates + equity); animation frames only index this array.
 *
 * Candidate P&L remains common-endpoint attribution. Portfolio return instead
 * follows the actual chronological equity series, including changing XOR reserve
 * values and sell proceeds. Hypothetical excluded fees never enter paid totals.
 */
export function createResearchReplay(result: ResearchResult): readonly ResearchReplaySnapshot[] {
  const equity = result.result.equity;
  const initialValue = equity[0]?.value ?? '0';
  const initial = new FPNumber(initialValue, PRECISION);
  let equityIndex = 0;
  let selectedProfit = ZERO;
  let excludedProfit = ZERO;
  let missedProfit = ZERO;
  let avoidedLoss = ZERO;
  let networkFeeXor = ZERO;
  let networkFeeInCapital = ZERO;
  let swapFeeInCapital = ZERO;
  let selectedCount = 0;
  const snapshots: ResearchReplaySnapshot[] = [
    {
      landedCount: 0,
      timestamp: equity[0]?.timestamp ?? null,
      equityIndex: 0,
      equityValue: initialValue,
      returnPercent: '0',
      selectedProfit: '0',
      excludedProfit: '0',
      missedProfit: '0',
      avoidedLoss: '0',
      networkFeeXor: '0',
      networkFeeInCapital: '0',
      swapFeeInCapital: '0',
      selectedCount: 0,
      excludedCount: 0,
    },
  ];

  for (const [index, candidate] of result.candidates.entries()) {
    const pnl = new FPNumber(candidate.pnl, PRECISION);
    if (candidate.selected) {
      selectedCount++;
      selectedProfit = selectedProfit.add(pnl);
      networkFeeXor = networkFeeXor.add(new FPNumber(candidate.costs.networkFeeXor, PRECISION));
      networkFeeInCapital = networkFeeInCapital.add(new FPNumber(candidate.costs.networkFeeInCapital, PRECISION));
      swapFeeInCapital = swapFeeInCapital.add(new FPNumber(candidate.costs.swapFeeInCapital, PRECISION));
    } else {
      excludedProfit = excludedProfit.add(pnl);
      if (pnl.gt(ZERO)) missedProfit = missedProfit.add(pnl);
      if (pnl.lt(ZERO)) avoidedLoss = avoidedLoss.sub(pnl);
    }

    while (equityIndex + 1 < equity.length && equity[equityIndex + 1].timestamp <= candidate.timestamp) equityIndex++;
    const equityValue = equity[equityIndex]?.value ?? initialValue;
    const currentValue = new FPNumber(equityValue, PRECISION);
    const complete = index === result.candidates.length - 1;
    snapshots.push({
      landedCount: index + 1,
      timestamp: candidate.timestamp,
      equityIndex,
      equityValue,
      returnPercent: complete
        ? result.result.returnPercent
        : initial.gt(ZERO)
          ? decimalRatio(currentValue.sub(initial), initial).mul(HUNDRED).toString()
          : '0',
      selectedProfit: selectedProfit.toString(),
      excludedProfit: excludedProfit.toString(),
      missedProfit: missedProfit.toString(),
      avoidedLoss: avoidedLoss.toString(),
      networkFeeXor: networkFeeXor.toString(),
      networkFeeInCapital: networkFeeInCapital.toString(),
      swapFeeInCapital: swapFeeInCapital.toString(),
      selectedCount,
      excludedCount: index + 1 - selectedCount,
      ...(complete ? { ...result.summary, ...result.costs } : {}),
    });
  }

  return snapshots;
}
