import { FPNumber } from '@sora-substrate/math';

import { isAssetAddress, safeQuoteResult, safeDivide } from '../../utils';
import { LiquiditySourceTypes, Errors, PriceVariant, SwapVariant, DexIdByBaseAsset } from '../../consts';
import { SwapChunk, DiscreteQuotation, SideAmount } from '../../common/primitives';
import { OrderBookStatus } from './consts';

import type { QuotePayload, QuoteResult } from '../../types';
import type { OrderBookId, OrderBook, OrderBookAggregated, OrderBookPriceVolume } from './types';

class DealInfo {
  public inputAsset!: string;
  public inputAmount!: OrderAmount;
  public outputAsset!: string;
  public outputAmount!: OrderAmount;
  public averagePrice!: FPNumber;
  public direction!: PriceVariant;

  constructor(
    inputAsset: string,
    inputAmount: OrderAmount,
    outputAsset: string,
    outputAmount: OrderAmount,
    averagePrice: FPNumber,
    direction: PriceVariant
  ) {
    this.inputAsset = inputAsset;
    this.inputAmount = inputAmount;
    this.outputAsset = outputAsset;
    this.outputAmount = outputAmount;
    this.averagePrice = averagePrice;
    this.direction = direction;
  }

  get isValid(): boolean {
    return (
      this.inputAsset !== this.outputAsset &&
      !(this.inputAmount.isBase && this.outputAmount.isBase) &&
      !(this.inputAmount.isQuote && this.outputAmount.isQuote) &&
      !this.inputAmount.value.isZero() &&
      !this.outputAmount.value.isZero() &&
      !this.averagePrice.isZero()
    );
  }

  get baseAmount(): FPNumber {
    if (this.inputAmount.isBase) {
      return this.inputAmount.value;
    } else {
      return this.outputAmount.value;
    }
  }

  get quoteAmount(): FPNumber {
    if (this.inputAmount.isQuote) {
      return this.inputAmount.value;
    } else {
      return this.outputAmount.value;
    }
  }
}

enum OrderAmountType {
  Base = 'Base',
  Quote = 'Quote',
}

class OrderAmount {
  public type!: OrderAmountType;
  public value!: FPNumber;

  constructor(type: OrderAmountType, value: FPNumber) {
    this.type = type;
    this.value = value;
  }

  get isBase(): boolean {
    return this.type === OrderAmountType.Base;
  }

  get isQuote(): boolean {
    return this.type === OrderAmountType.Quote;
  }

  isSame(other: OrderAmount): boolean {
    return (this.isBase && other.isBase) || (this.isQuote && other.isQuote);
  }

  copyType(amount: FPNumber): OrderAmount {
    return new OrderAmount(this.type, amount);
  }

  associatedAsset(id: OrderBookId) {
    if (this.type === OrderAmountType.Base) {
      return id.base;
    } else {
      return id.quote;
    }
  }

  static averagePrice(input: OrderAmount, output: OrderAmount) {
    if (input.isQuote) {
      return safeDivide(input.value, output.value);
    } else {
      return safeDivide(output.value, input.value);
    }
  }

  add(other: OrderAmount) {
    if (!this.isSame(other)) throw new Error('');

    const result = this.value.add(other.value);
    return this.copyType(result);
  }

  sub(other: OrderAmount) {
    if (!this.isSame(other)) throw new Error('');

    const result = this.value.sub(other.value);
    return this.copyType(result);
  }
}

// can_exchange
export const canExchange = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  payload: QuotePayload
): boolean => {
  const id = assembleOrderBookId(baseAssetId, inputAsset, outputAsset);

  if (!id) return false;

  const book = getOrderBook(id, payload);

  if (!book) return false;

  return book.status === OrderBookStatus.Trade;
};

const getOrderBook = (id: OrderBookId, payload: QuotePayload) => {
  return payload.reserves.orderBook[id.base];
};

// assemble_order_book_id
const assembleOrderBookId = (baseAssetId: string, inputAsset: string, outputAsset: string): OrderBookId | null => {
  if (isAssetAddress(inputAsset, outputAsset)) return null;

  const dexId = DexIdByBaseAsset[baseAssetId];

  if (!Number.isFinite(dexId)) return null;

  if (isAssetAddress(inputAsset, baseAssetId)) {
    return { dexId, base: outputAsset, quote: inputAsset };
  } else if (isAssetAddress(outputAsset, baseAssetId)) {
    return { dexId, base: inputAsset, quote: outputAsset };
  } else {
    return null;
  }
};

// get_direction
const getDirection = (book: OrderBookAggregated, inputAsset: string, outputAsset: string): PriceVariant => {
  const { base, quote } = book.orderBookId;

  if (isAssetAddress(base, outputAsset) && isAssetAddress(quote, inputAsset)) {
    return PriceVariant.Buy;
  }
  if (isAssetAddress(base, inputAsset) && isAssetAddress(quote, outputAsset)) {
    return PriceVariant.Sell;
  }

  throw new Error('Invalid Assets');
};

// align_amount
const alignAmount = (amount: FPNumber, book: OrderBook) => {
  // get rounded by stepLotSize steps
  const steps = Math.floor(safeDivide(amount, book.stepLotSize).toNumber());
  const aligned = FPNumber.fromNatural(steps, amount.precision).mul(book.stepLotSize);

  return aligned;
};

const bestAsk = (book: OrderBookAggregated): FPNumber | null => {
  const asks = book.aggregated.asks;

  if (!asks.length) return null;

  return FPNumber.min(...asks.map(([price, _]) => price));
};

const bestBid = (book: OrderBookAggregated): FPNumber | null => {
  const bids = book.aggregated.bids;

  if (!bids.length) return null;

  return FPNumber.max(...bids.map(([price, _]) => price));
};

/** sum_market */
// prettier-ignore
const sumMarket = (
  book: OrderBook,
  marketData: OrderBookPriceVolume[],
  targetDepth: OrderAmount | null,
  filledTarget: boolean,
): [OrderAmount, OrderAmount] => { // NOSONAR
  let marketBaseVolume = FPNumber.ZERO;
  let marketQuoteVolume = FPNumber.ZERO;
  let enoughLiquidity = false;

  for (const [price, baseVolume] of marketData) {
    const quoteVolume = price.mul(baseVolume);

    if (targetDepth) {
      if (targetDepth.isBase) {
        const baseTarget = targetDepth.value;
        if (FPNumber.isGreaterThanOrEqualTo(marketBaseVolume.add(baseVolume), baseTarget)) {
          const delta = alignAmount(baseTarget.sub(marketBaseVolume), book);
          marketBaseVolume = marketBaseVolume.add(delta);
          marketQuoteVolume = marketQuoteVolume.add(price.mul(delta));
          enoughLiquidity = true;
          break;
        }
      } else {
        const quoteTarget = targetDepth.value ?? FPNumber.ZERO;
        if (FPNumber.isGreaterThanOrEqualTo(marketQuoteVolume.add(quoteVolume), quoteTarget)) {
          const delta = alignAmount(safeDivide(quoteTarget.sub(marketQuoteVolume), price), book);
          marketBaseVolume = marketBaseVolume.add(delta);
          marketQuoteVolume = marketQuoteVolume.add(price.mul(delta));
          enoughLiquidity = true;
          break;
        }
      }
    }

    marketBaseVolume = marketBaseVolume.add(baseVolume);
    marketQuoteVolume = marketQuoteVolume.add(quoteVolume);
  }

  if (!(!targetDepth || enoughLiquidity || !filledTarget)) {
    throw new Error(Errors.NotEnoughLiquidityInOrderBook);
  }

  return [
    new OrderAmount(OrderAmountType.Base, marketBaseVolume),
    new OrderAmount(OrderAmountType.Quote, marketQuoteVolume),
  ];
};

// calculate_deal
const calculateDeal = (
  book: OrderBookAggregated,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean
): DealInfo => {
  const direction = getDirection(book, inputAsset, outputAsset);
  const isBuyDirection = direction === PriceVariant.Buy;

  let base!: OrderAmount;
  let quote!: OrderAmount;

  if (isDesiredInput) {
    if (isBuyDirection) {
      [base, quote] = sumMarket(
        book,
        book.aggregated.asks,
        new OrderAmount(OrderAmountType.Quote, amount.dp(book.tickSize.precision)),
        true
      );
    } else {
      [base, quote] = sumMarket(
        book,
        [...book.aggregated.bids].reverse(),
        new OrderAmount(OrderAmountType.Base, amount.dp(book.stepLotSize.precision)),
        true
      );
    }
  } else {
    // prettier-ignore
    if (isBuyDirection) { // NOSONAR
      [base, quote] = sumMarket(
        book,
        book.aggregated.asks,
        new OrderAmount(OrderAmountType.Base, amount.dp(book.stepLotSize.precision)),
        true,
      );
    } else {
      [base, quote] = sumMarket(
        book,
        [...book.aggregated.bids].reverse(),
        new OrderAmount(OrderAmountType.Quote, amount.dp(book.tickSize.precision)),
        true,
      );
    }
  }

  if (!(base.value.isGtZero() && quote.value.isGtZero())) {
    throw new Error(Errors.InvalidOrderAmount);
  }

  const [inputAmount, outputAmount] = isBuyDirection ? [quote, base] : [base, quote];

  const averagePrice = OrderAmount.averagePrice(inputAmount, outputAmount);

  return new DealInfo(inputAsset, inputAmount, outputAsset, outputAmount, averagePrice, direction);
};

// market_depth
const marketDepth = (
  book: OrderBookAggregated,
  side: PriceVariant,
  volumeLimit: OrderAmount | null
): OrderBookPriceVolume[] => {
  if (side === PriceVariant.Buy) {
    return getMarketDepth(volumeLimit, [...book.aggregated.bids].reverse());
  } else {
    return getMarketDepth(volumeLimit, book.aggregated.asks);
  }
};

// get_market_depth
const getMarketDepth = (
  volumeLimit: OrderAmount | null,
  marketData: OrderBookPriceVolume[]
): OrderBookPriceVolume[] => {
  if (volumeLimit) {
    const marketDepth: OrderBookPriceVolume[] = [];
    let limit = volumeLimit.value;

    if (!FPNumber.isGreaterThan(limit, FPNumber.ZERO)) {
      return marketDepth;
    }

    for (const [price, volume] of marketData) {
      marketDepth.push([price, volume]);

      if (volumeLimit.isBase) {
        limit = limit.sub(volume);
      } else {
        limit = limit.sub(volume.mul(price));
      }

      if (!FPNumber.isGreaterThan(limit, FPNumber.ZERO)) {
        break;
      }
    }

    return marketDepth;
  } else {
    return marketData;
  }
};

// step_quote
export const stepQuote = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  _deduceFee: boolean,
  _recommendedSamplesCount: number
): DiscreteQuotation => {
  if (!canExchange(baseAssetId, _syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
    throw new Error(Errors.CantExchange);
  }

  const id = assembleOrderBookId(baseAssetId, inputAsset, outputAsset);

  if (!id) {
    throw new Error(Errors.UnknownOrderBook);
  }

  if (amount.isZero()) {
    return new DiscreteQuotation();
  }

  const book = getOrderBook(id, payload);

  if (!book) {
    throw new Error(Errors.UnknownOrderBook);
  }

  const direction = getDirection(book, inputAsset, outputAsset);
  const isBuyDirection = direction === PriceVariant.Buy;

  const marketDepthCalculated = marketDepth(
    book,
    isBuyDirection ? PriceVariant.Sell : PriceVariant.Buy,
    new OrderAmount(OrderAmountType.Base, book.maxLotSize)
  );

  const [baseMinAmount, quoteMinAmount] = sumMarket(
    book,
    marketDepthCalculated,
    new OrderAmount(OrderAmountType.Base, book.minLotSize),
    false
  );

  if (FPNumber.isLessThan(baseMinAmount.value, book.minLotSize)) {
    // order-book has not ehough liquidity even for min amount
    return new DiscreteQuotation();
  }

  const [baseMaxAmount, quoteMaxAmount] = sumMarket(
    book,
    marketDepthCalculated,
    new OrderAmount(OrderAmountType.Base, book.maxLotSize),
    false
  );

  const quotation = new DiscreteQuotation();

  let target!: OrderAmount;

  if (isDesiredInput) {
    if (isBuyDirection) {
      quotation.limits.minAmount = new SideAmount(quoteMinAmount.value, SwapVariant.WithDesiredInput);
      quotation.limits.maxAmount = new SideAmount(quoteMaxAmount.value, SwapVariant.WithDesiredInput);
      quotation.limits.amountPrecision = new SideAmount(book.stepLotSize, SwapVariant.WithDesiredOutput);

      if (FPNumber.isLessThan(amount, quoteMinAmount.value)) {
        return quotation;
      }

      const targetAmount = amount.min(quoteMaxAmount.value);
      target = new OrderAmount(OrderAmountType.Quote, targetAmount.dp(book.tickSize.precision));
    } else {
      quotation.limits.minAmount = new SideAmount(baseMinAmount.value, SwapVariant.WithDesiredInput);
      quotation.limits.maxAmount = new SideAmount(baseMaxAmount.value, SwapVariant.WithDesiredInput);
      quotation.limits.amountPrecision = new SideAmount(book.stepLotSize, SwapVariant.WithDesiredInput);

      if (FPNumber.isLessThan(amount, baseMinAmount.value)) {
        return quotation;
      }

      const targetAmount = amount.min(baseMaxAmount.value);
      target = new OrderAmount(OrderAmountType.Base, targetAmount.dp(book.stepLotSize.precision));
    }
  } else {
    if (isBuyDirection) {
      quotation.limits.minAmount = new SideAmount(baseMinAmount.value, SwapVariant.WithDesiredOutput);
      quotation.limits.maxAmount = new SideAmount(baseMaxAmount.value, SwapVariant.WithDesiredOutput);
      quotation.limits.amountPrecision = new SideAmount(book.stepLotSize, SwapVariant.WithDesiredOutput);

      if (FPNumber.isLessThan(amount, baseMinAmount.value)) {
        return quotation;
      }

      const targetAmount = amount.min(baseMaxAmount.value);
      target = new OrderAmount(OrderAmountType.Base, targetAmount.dp(book.stepLotSize.precision));
    } else {
      quotation.limits.minAmount = new SideAmount(quoteMinAmount.value, SwapVariant.WithDesiredOutput);
      quotation.limits.maxAmount = new SideAmount(quoteMaxAmount.value, SwapVariant.WithDesiredOutput);
      quotation.limits.amountPrecision = new SideAmount(book.stepLotSize, SwapVariant.WithDesiredInput);

      if (FPNumber.isLessThan(amount, quoteMinAmount.value)) {
        return quotation;
      }

      const targetAmount = amount.min(quoteMaxAmount.value);
      target = new OrderAmount(OrderAmountType.Quote, targetAmount.dp(book.tickSize.precision));
    }
  }

  let targetSum = FPNumber.ZERO;

  for (const [price, baseVolume] of marketDepthCalculated) {
    const quoteVolume = price.mul(baseVolume);

    if (isBuyDirection) {
      quotation.chunks.push(new SwapChunk(quoteVolume, baseVolume, FPNumber.ZERO));
    } else {
      quotation.chunks.push(new SwapChunk(baseVolume, quoteVolume, FPNumber.ZERO));
    }

    if (target.isBase) {
      targetSum = targetSum.add(baseVolume);
    } else {
      targetSum = targetSum.add(quoteVolume);
    }

    if (FPNumber.isGreaterThanOrEqualTo(targetSum, target.value)) {
      break;
    }
  }

  return quotation;
};

// quote
export const quote = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  _deduceFee: boolean
): QuoteResult => {
  try {
    if (!canExchange(baseAssetId, _syntheticBaseAssetId, inputAsset, outputAsset, payload)) {
      throw new Error(Errors.CantExchange);
    }

    const id = assembleOrderBookId(baseAssetId, inputAsset, outputAsset);

    if (!id) throw new Error(Errors.UnknownOrderBook);

    const book = getOrderBook(id, payload);

    if (!book) throw new Error(Errors.UnknownOrderBook);

    const dealInfo = calculateDeal(book, inputAsset, outputAsset, amount, isDesiredInput);

    if (!dealInfo.isValid) throw new Error(Errors.PriceCalculationFailed);

    const baseAmount = dealInfo.baseAmount;

    if (
      !(
        FPNumber.isLessThanOrEqualTo(book.minLotSize, baseAmount) &&
        FPNumber.isLessThanOrEqualTo(baseAmount, book.maxLotSize)
      )
    )
      throw new Error(Errors.InvalidOrderAmount);

    // order-book doesn't take fee
    const fee = FPNumber.ZERO;

    if (isDesiredInput) {
      return {
        amount: dealInfo.outputAmount.value,
        fee,
        rewards: [],
        distribution: [
          {
            market: LiquiditySourceTypes.OrderBook,
            input: inputAsset,
            output: outputAsset,
            income: amount,
            outcome: dealInfo.outputAmount.value,
            fee,
          },
        ],
      };
    } else {
      return {
        amount: dealInfo.inputAmount.value,
        fee,
        rewards: [],
        distribution: [
          {
            market: LiquiditySourceTypes.OrderBook,
            input: inputAsset,
            output: outputAsset,
            income: dealInfo.inputAmount.value,
            outcome: amount,
            fee,
          },
        ],
      };
    }
  } catch {
    return safeQuoteResult(inputAsset, outputAsset, amount, LiquiditySourceTypes.OrderBook);
  }
};

// quote_without_impact
export const quoteWithoutImpact = (
  baseAssetId: string,
  _syntheticBaseAssetId: string,
  inputAsset: string,
  outputAsset: string,
  amount: FPNumber,
  isDesiredInput: boolean,
  payload: QuotePayload,
  _deduceFee: boolean
): FPNumber => {
  try {
    const id = assembleOrderBookId(baseAssetId, inputAsset, outputAsset);

    if (!id) throw new Error(Errors.UnknownOrderBook);

    const book = getOrderBook(id, payload);

    if (!book) throw new Error(Errors.UnknownOrderBook);

    const direction = getDirection(book, inputAsset, outputAsset);
    const isBuyDirection = direction === PriceVariant.Buy;

    const price = isBuyDirection ? bestAsk(book) : bestBid(book);

    if (!price) {
      throw new Error(Errors.NotEnoughLiquidityInOrderBook);
    }

    const [targetAmount, baseAmount] = (() => {
      if (isDesiredInput) {
        if (isBuyDirection) {
          const base = alignAmount(safeDivide(amount.dp(book.tickSize.precision), price), book);

          return [base, base];
        } else {
          const base = alignAmount(amount.dp(book.stepLotSize.precision), book);
          const quote = base.mul(price);

          return [quote, base];
        }
      } else {
        // prettier-ignore
        if (isBuyDirection) { // NOSONAR
          const base = alignAmount(amount.dp(book.stepLotSize.precision), book);
          const quote = base.mul(price);
  
          return [quote, base];
        } else {
          const base = alignAmount(safeDivide(amount.dp(book.tickSize.precision), price), book);
  
          return [base, base];
        }
      }
    })();

    if (!targetAmount.isGtZero()) {
      throw new Error(Errors.InvalidOrderAmount);
    }

    if (
      !(
        FPNumber.isLessThanOrEqualTo(book.minLotSize, baseAmount) &&
        FPNumber.isLessThanOrEqualTo(baseAmount, book.maxLotSize)
      )
    ) {
      throw new Error(Errors.InvalidOrderAmount);
    }

    return targetAmount;
  } catch {
    return FPNumber.ZERO;
  }
};

// check_rewards
export const checkRewards = (
  _baseAssetId: string,
  _syntheticBaseAssetId: string,
  _inputAsset: string,
  _outputAsset: string,
  _inputAmount: FPNumber,
  _outputAmount: FPNumber,
  _payload: QuotePayload
) => {
  // XYK Pool has no rewards currently
  return [];
};
