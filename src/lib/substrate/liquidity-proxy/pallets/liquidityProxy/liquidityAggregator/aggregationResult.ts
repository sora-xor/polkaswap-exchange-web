import { FPNumber } from '@sora-substrate/math';

import { SwapVariant, LiquiditySourceTypes } from '../../../consts';

import type { DistributionChunk } from '../../../types';

/** Info with input & output amounts for liquidity source */
export type SwapInfo = Map<LiquiditySourceTypes, [FPNumber, FPNumber]>;

export class AggregationResult {
  public swapInfo!: SwapInfo;
  /** A distribution of amounts each liquidity sources gets to swap in the entire trade */
  public distribution!: DistributionChunk[];
  /** The best possible desired amount */
  public desiredAmount!: FPNumber;
  public resultAmount!: FPNumber;
  public swapVariant!: SwapVariant;
  /** Total fee amount, nominated in XOR */
  public fee!: FPNumber;

  constructor(
    swapInfo: SwapInfo,
    distribution: DistributionChunk[],
    desiredAmount: FPNumber,
    resultAmount: FPNumber,
    swapVariant: SwapVariant,
    fee: FPNumber
  ) {
    this.swapInfo = swapInfo;
    this.distribution = distribution;
    this.desiredAmount = desiredAmount;
    this.resultAmount = resultAmount;
    this.swapVariant = swapVariant;
    this.fee = fee;
  }
}

export class AggregatedSwapOutcome {
  /** A distribution of amounts each liquidity sources gets to swap in the entire trade */
  public distribution!: DistributionChunk[];
  /** The best possible output/input amount for a given trade and a set of liquidity sources */
  public amount!: FPNumber;
  /** Total fee amount, nominated in XOR */
  public fee!: FPNumber;

  constructor(distribution: DistributionChunk[], amount: FPNumber, fee: FPNumber) {
    this.distribution = distribution;
    this.amount = amount;
    this.fee = fee;
  }

  public from(value: AggregationResult) {
    return new AggregatedSwapOutcome(value.distribution, value.resultAmount, value.fee);
  }
}
