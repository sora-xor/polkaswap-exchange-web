import { FPNumber } from '@sora-substrate/math';

import { SwapVariant, LiquiditySourceTypes, Errors, Consts } from '../../../consts';
import { SwapChunk, DiscreteQuotation, SideAmount } from '../../../common/primitives';
import { checkedSub, safeDivide, absDiff } from '../../../utils';

import { Aggregation } from './aggregation';
import { AggregationResult } from './aggregationResult';
import { Selector } from './selector';

import type { SwapInfo } from './aggregationResult';

/** Liquidity Aggregator selects and align the best chunks of liquidity from different sources to gain the best exchange result. */
export class LiquidityAggregator {
  public variant!: SwapVariant;
  public selector!: Selector;
  public aggregation!: Aggregation;
  public originAmount!: FPNumber;

  constructor(variant: SwapVariant) {
    this.variant = variant;
    this.selector = new Selector(variant);
    this.aggregation = new Aggregation();
    this.originAmount = FPNumber.ZERO;
  }

  public addSource(source: LiquiditySourceTypes, discreteQuotation: DiscreteQuotation): void {
    this.selector.addSource(source, discreteQuotation);
  }

  /**
   * Aggregates the liquidity from the provided liquidity sources.
   * Liquidity sources provide discretized liquidity curve by chunks and then Liquidity Aggregator selects the best chunks from different sources to gain the best swap amount.
   */
  public aggregateLiquidity(amount: FPNumber): AggregationResult {
    this.originAmount = amount;

    if (this.selector.isEmpty()) {
      throw new Error(Errors.InsufficientLiquidity);
    }

    this.aggregateAmount(amount);

    // max & precision limits are taken into account during the main aggregation
    // min limit requires the separate process
    this.alignMin();

    return this.calculateResult();
  }

  /** Aggregates the liquidity until it reaches the target `amount`. */
  public aggregateAmount(amount: FPNumber) {
    while (FPNumber.isGreaterThan(amount, FPNumber.ZERO)) {
      const [source, selectedChunk] = this.selector.selectChunk(amount, this.aggregation);

      const [chunk, newAmount] = this.fitChunk(selectedChunk, source, amount);

      // there is a case when `fit_chunk` can edit the target amount
      // this change should not exceed the allowed slippage
      if (!FPNumber.eq(newAmount, amount)) {
        const diff = absDiff(amount, newAmount);

        if (FPNumber.isGreaterThan(diff, Consts.InternalSlippageTolerance.mul(this.originAmount))) {
          throw new Error(Errors.InsufficientLiquidity);
        }

        if (newAmount.isZero()) {
          break;
        }

        amount = newAmount;
      }

      if (chunk.isZero()) {
        continue;
      }

      const delta = chunk.getAssociatedField(this.variant).amount;

      this.aggregation.pushChunk(source, chunk);

      const amountResult = checkedSub(amount, delta);

      if (!amountResult) throw new Error(Errors.CalculationError);

      amount = amountResult;
    }
  }

  /**
   * Change the `chunk` if it's necessary.
   * Rescale the `chunk` if it exceeds the max amount for its source (if there is such limit for this source).
   * Rescale the `chunk` if adding this chunk will exceed the necessary `amount`.
   * Rescale the `chunk` if it doesn't match the precision limit.
   * Return another `amount` if it's necessary.
   */
  public fitChunk(chunk: SwapChunk, source: LiquiditySourceTypes, amount: FPNumber): [SwapChunk, FPNumber] {
    const limits = this.selector.getLimits(source);

    let refund = SwapChunk.zero();

    const total = this.aggregation.getTotal(source);

    const [aligned, remainder] = limits.alignExtraChunkMax(total, chunk);

    if (!remainder.isZero()) {
      // max amount (already selected + new chunk) exceeded
      chunk = aligned;
      refund = remainder;
      this.selector.lockSource(source);
    }

    if (!chunk.isZero()) {
      const step = limits.getPrecisionStep(chunk, this.variant);

      if (FPNumber.isLessThan(amount, step)) {
        // This case means that this is the last available source,
        // it has precision limitation and `amount` doesn't match the precision.
        // We have to round the `amount`.
        switch (this.variant) {
          case SwapVariant.WithDesiredInput: {
            // round down
            refund = refund.saturatingAdd(chunk);
            chunk = SwapChunk.zero();
            amount = FPNumber.ZERO;
            break;
          }
          case SwapVariant.WithDesiredOutput: {
            // round up
            const precision = limits.amountPrecision;
            if (!precision) throw new Error(Errors.AggregationError);
            const rescaled = chunk.rescaleBySideAmount(precision);

            refund = refund.saturatingAdd(chunk.saturatingSub(rescaled));
            chunk = rescaled;
            amount = step;
          }
        }
      } else {
        let sideAmount!: SideAmount;
        // if `step` is not 0, it means the source has a precision limit
        // in this case the amount should be a multiple of the precision
        if (!step.isZero() && !amount.isZeroMod(step)) {
          const count = safeDivide(amount, step);
          const aligned = count.mul(step);
          sideAmount = new SideAmount(aligned, this.variant);
        } else {
          sideAmount = new SideAmount(amount, this.variant);
        }

        // if chunk is bigger than remaining amount, it is necessary to rescale it and take only required part
        if (FPNumber.isGreaterThan(...chunk.compareWith(sideAmount))) {
          const rescaled = chunk.rescaleBySideAmount(sideAmount);
          refund = refund.saturatingAdd(chunk.saturatingSub(rescaled));
          chunk = rescaled;
        }

        const [aligned, reminder] = limits.alignChunkPrecision(chunk);

        if (!reminder.isZero()) {
          chunk = aligned;
          refund = refund.saturatingAdd(reminder);
        }
      }

      if (chunk.isZero() && !amount.isZero()) {
        // should never happen
        throw new Error(Errors.AggregationError);
      }
    }

    if (!refund.isZero()) {
      // push remains of the chunk back
      this.selector.pushChunk(source, refund);
    }

    return [chunk, amount];
  }

  /** Align the selected aggregation in according with source min amount limits. */
  public alignMin(): void {
    const toDelete: LiquiditySourceTypes[] = [];

    const queue = this.aggregation.getTotalPriceAscendingQueue();

    for (const source of queue) {
      const cluster = this.aggregation.getMutCluster(source);
      const limits = this.selector.getLimits(source);

      const [, remainder] = limits.alignChunkMin(cluster.getTotal());

      if (!remainder.isZero()) {
        const minAmount = limits.minAmount;
        if (!minAmount) throw new Error(Errors.AggregationError);

        const remainderSideAmount = remainder.getSameTypeAmount(minAmount);

        const [returnedLiquidity, remove] = this.selector.returnLiquidity(remainderSideAmount, source, cluster);

        if (remove) {
          toDelete.push(source);
        }

        this.selector.lockSource(source);

        const remainingAmount = returnedLiquidity.getAssociatedField(this.variant).amount;

        this.aggregateAmount(remainingAmount);
      }
    }

    toDelete.forEach((source) => {
      this.aggregation.delete(source);
    });
  }

  public calculateResult(): AggregationResult {
    const distribution = [];
    const swapInfo: SwapInfo = new Map();
    let desiredAmount = FPNumber.ZERO;
    let resultAmount = FPNumber.ZERO;
    let fee = FPNumber.ZERO;

    for (const [source, cluster] of this.aggregation.entries()) {
      const total = cluster.getTotal();

      swapInfo.set(source, [total.input, total.output]);

      const [desiredPart, resultPart] =
        this.variant === SwapVariant.WithDesiredInput ? [total.input, total.output] : [total.output, total.input];

      distribution.push({
        market: source,
        income: total.input,
        outcome: total.output,
        fee: total.fee,
      });

      desiredAmount = desiredAmount.add(desiredPart);
      resultAmount = resultAmount.add(resultPart);
      fee = fee.add(total.fee);
    }

    return new AggregationResult(swapInfo, distribution, desiredAmount, resultAmount, this.variant, fee);
  }
}
