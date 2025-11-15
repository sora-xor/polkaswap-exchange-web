import { FPNumber } from '@sora-substrate/math';

import { SwapVariant, LiquiditySourceTypes, Errors } from '../../../consts';
import { SwapChunk, DiscreteQuotation, SideAmount, type SwapLimits } from '../../../common/primitives';
import { checkedSub } from '../../../utils';

import { Cluster, Aggregation } from './aggregation';

export class Selector {
  public variant!: SwapVariant;
  public liquidityQuotations!: Map<LiquiditySourceTypes, DiscreteQuotation>;
  public lockedSources!: Set<LiquiditySourceTypes>;

  constructor(variant: SwapVariant) {
    this.variant = variant;
    this.liquidityQuotations = new Map();
    this.lockedSources = new Set();
  }

  public addSource(source: LiquiditySourceTypes, discreteQuotation: DiscreteQuotation): void {
    this.liquidityQuotations.set(source, discreteQuotation);
  }

  public isEmpty(): boolean {
    return this.liquidityQuotations.size === 0;
  }

  public lockSource(source: LiquiditySourceTypes): void {
    this.lockedSources.add(source);
  }

  public getLimits(source: LiquiditySourceTypes): SwapLimits {
    const quotation = this.liquidityQuotations.get(source);

    if (!quotation) throw new Error(Errors.AggregationError);

    return quotation.limits;
  }

  public pushChunk(source: LiquiditySourceTypes, chunk: SwapChunk): void {
    const quotation = this.liquidityQuotations.get(source);

    if (!quotation) throw new Error(Errors.AggregationError);

    quotation.chunks.unshift(chunk);
  }

  /** Takes chunks from `cluster` and puts them back into the selector until it reaches `amount`. */
  /** Returns the returned amount of liquidity and the flag true if `cluster` became empty. */
  public returnLiquidity(amount: SideAmount, source: LiquiditySourceTypes, cluster: Cluster): [SwapChunk, boolean] {
    let taken = SwapChunk.default();

    while (FPNumber.isGreaterThan(amount.amount, FPNumber.ZERO)) {
      // it is necessary to return chunks back till `remainder` volume is filled
      const chunk = cluster.popBack();

      if (!chunk) break;

      if (FPNumber.isLessThanOrEqualTo(...chunk.compareWith(amount))) {
        const value = checkedSub(amount.amount, chunk.getSameTypeAmount(amount).amount);

        if (!value) throw new Error(Errors.CalculationError);

        amount.amount = value;
        taken = taken.saturatingAdd(chunk);
        this.pushChunk(source, chunk);
      } else {
        const remainderChunk = chunk.rescaleBySideAmount(amount);
        const updatedChunk = chunk.saturatingSub(remainderChunk);
        cluster.pushBack(updatedChunk);
        taken = taken.saturatingAdd(remainderChunk);
        this.pushChunk(source, remainderChunk);
        amount.amount = FPNumber.ZERO;
      }
    }

    return [taken, cluster.isEmpty()];
  }

  /**
   * Selects the chunk with best price.
   * If there are several best chunks, we select the source that already was selected before.
   * If the source has the precision limit and `amount` is less than precision - this source is used only if there are no other candidates even if it has the best price.
   */
  public selectChunk(amount: FPNumber, aggregation: Aggregation): [LiquiditySourceTypes, SwapChunk] {
    let candidates = [];
    let delayed = null;
    let max = FPNumber.ZERO;

    for (const [source, discreteQuotation] of this.liquidityQuotations.entries()) {
      // skip the locked source
      if (this.lockedSources.has(source)) {
        continue;
      }

      const front = discreteQuotation.chunks[0];

      if (!front) continue;

      let price!: FPNumber;

      try {
        price = front.price;
      } catch {
        throw new Error(Errors.CalculationError);
      }

      const step = discreteQuotation.limits.getPrecisionStep(front, this.variant);

      if (FPNumber.isEqualTo(price, max) && FPNumber.isGreaterThanOrEqualTo(amount, step)) {
        candidates.push(source);
      }

      if (FPNumber.isGreaterThan(price, max)) {
        if (FPNumber.isLessThan(amount, step)) {
          delayed = source;
        } else {
          candidates = [];
          max = price;
          candidates.push(source);
        }
      }
    }

    let source = candidates[0];

    if (source) {
      for (const candidate of candidates) {
        if (aggregation.has(candidate)) {
          source = candidate;
          break;
        }
      }
    } else {
      if (!delayed) throw new Error(Errors.InsufficientLiquidity);
      source = delayed;
    }

    const quotation = this.liquidityQuotations.get(source);

    if (!quotation) throw new Error(Errors.AggregationError);

    const chunk = quotation.chunks.shift();

    if (!chunk) throw new Error(Errors.AggregationError);

    return [source, chunk];
  }
}
