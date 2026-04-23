import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { Consts, Errors, LiquiditySourceTypes, SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import {
  canExchange,
  checkRewards,
  quote,
  quoteWithoutImpact,
  stepQuote,
} from '@/lib/substrate/liquidity-proxy/pallets/orderBook';
import { OrderBookStatus } from '@/lib/substrate/liquidity-proxy/pallets/orderBook/consts';

const BASE = Consts.XOR;
const ASSET = 'asset-a';
const SYNTHETIC_BASE = Consts.XST;

const fp = (value: string | number) => new FPNumber(value);
const asNumber = (value: FPNumber) => value.toNumber();

describe('liquidity proxy order book pallet', () => {
  it('allows trading only for known trade-enabled order books on a supported dex base asset', () => {
    const payload = createPayload();

    expect(canExchange(BASE, SYNTHETIC_BASE, BASE, ASSET, payload)).toBe(true);
    expect(canExchange(BASE, SYNTHETIC_BASE, ASSET, BASE, payload)).toBe(true);
    expect(canExchange(BASE, SYNTHETIC_BASE, ASSET, ASSET, payload)).toBe(false);
    expect(canExchange('unsupported-base', SYNTHETIC_BASE, BASE, ASSET, payload)).toBe(false);
    expect(canExchange(BASE, SYNTHETIC_BASE, BASE, 'missing-book', payload)).toBe(false);
    expect(canExchange(BASE, SYNTHETIC_BASE, BASE, ASSET, createPayload({ status: OrderBookStatus.OnlyCancel }))).toBe(
      false
    );
  });

  it('quotes a buy with desired input from ask depth and no order-book fee', () => {
    const result = quote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(20), true, createPayload(), false);

    expect(asNumber(result.amount)).toBeCloseTo(10);
    expect(result.fee.toString()).toBe('0');
    expect(result.rewards).toEqual([]);
    expect(result.distribution).toEqual([
      expect.objectContaining({
        input: BASE,
        output: ASSET,
        market: LiquiditySourceTypes.OrderBook,
        fee: FPNumber.ZERO,
      }),
    ]);
  });

  it('quotes a buy with desired output by returning the required quote input', () => {
    const result = quote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(4), false, createPayload(), false);

    expect(asNumber(result.amount)).toBeCloseTo(8);
    expect(result.distribution[0]?.income.toString()).toBe('8');
    expect(result.distribution[0]?.outcome.toString()).toBe('4');
  });

  it('quotes a sell with desired input from the highest bid first', () => {
    const result = quote(BASE, SYNTHETIC_BASE, ASSET, BASE, fp(5), true, createPayload(), false);

    expect(asNumber(result.amount)).toBeCloseTo(9);
    expect(result.distribution[0]?.income.toString()).toBe('5');
    expect(asNumber(result.distribution[0]?.outcome as FPNumber)).toBeCloseTo(9);
  });

  it('quotes a sell with desired output by returning the required base input', () => {
    const result = quote(BASE, SYNTHETIC_BASE, ASSET, BASE, fp(9), false, createPayload(), false);

    expect(asNumber(result.amount)).toBeCloseTo(5);
    expect(result.distribution[0]?.income.toString()).toBe('5');
    expect(result.distribution[0]?.outcome.toString()).toBe('9');
  });

  it('returns a safe zero quote when order-book liquidity cannot satisfy the request', () => {
    const payload = createPayload({
      asks: [[fp(2), fp(1)]],
      minLotSize: fp(1),
      maxLotSize: fp(10),
    });

    const result = quote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(100), true, payload, false);

    expect(result.amount.toString()).toBe('0');
    expect(result.distribution).toEqual([
      {
        input: BASE,
        output: ASSET,
        market: LiquiditySourceTypes.OrderBook,
        income: fp(100),
        outcome: FPNumber.ZERO,
        fee: FPNumber.ZERO,
      },
    ]);
  });

  it('returns safe zero quotes when trading is disabled or base lot limits are violated', () => {
    const disabled = quote(
      BASE,
      SYNTHETIC_BASE,
      BASE,
      ASSET,
      fp(20),
      true,
      createPayload({ status: OrderBookStatus.Stop }),
      false
    );
    expect(disabled.amount.toString()).toBe('0');

    const aboveMaxLot = quote(
      BASE,
      SYNTHETIC_BASE,
      BASE,
      ASSET,
      fp(20),
      true,
      createPayload({ maxLotSize: fp(5) }),
      false
    );
    expect(aboveMaxLot.amount.toString()).toBe('0');
  });

  it('calculates no-impact order-book prices from the best ask and best bid', () => {
    expect(asNumber(quoteWithoutImpact(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(20), true, createPayload(), false))).toBeCloseTo(
      10
    );
    expect(asNumber(quoteWithoutImpact(BASE, SYNTHETIC_BASE, ASSET, BASE, fp(9), false, createPayload(), false))).toBeCloseTo(
      5
    );
  });

  it('calculates no-impact prices for the other buy/sell variants', () => {
    const buyDesiredOutput = quoteWithoutImpact(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(4), false, createPayload(), false);
    const sellDesiredInput = quoteWithoutImpact(BASE, SYNTHETIC_BASE, ASSET, BASE, fp(5), true, createPayload(), false);

    expect(asNumber(buyDesiredOutput)).toBeCloseTo(8);
    expect(asNumber(sellDesiredInput)).toBeCloseTo(9);
  });

  it('returns zero no-impact prices when aligned amounts violate lot constraints', () => {
    const belowPrecision = quoteWithoutImpact(
      BASE,
      SYNTHETIC_BASE,
      BASE,
      ASSET,
      fp('0.01'),
      true,
      createPayload(),
      false
    );
    const aboveMaxLot = quoteWithoutImpact(
      BASE,
      SYNTHETIC_BASE,
      BASE,
      ASSET,
      fp(20),
      true,
      createPayload({ maxLotSize: fp(5) }),
      false
    );

    expect(belowPrecision.toString()).toBe('0');
    expect(aboveMaxLot.toString()).toBe('0');
  });

  it('returns zero no-impact price when a side has no market depth', () => {
    const buyResult = quoteWithoutImpact(
      BASE,
      SYNTHETIC_BASE,
      BASE,
      ASSET,
      fp(20),
      true,
      createPayload({ asks: [] }),
      false
    );
    const sellResult = quoteWithoutImpact(
      BASE,
      SYNTHETIC_BASE,
      ASSET,
      BASE,
      fp(5),
      true,
      createPayload({ bids: [] }),
      false
    );

    expect(buyResult.toString()).toBe('0');
    expect(sellResult.toString()).toBe('0');
  });

  it('builds a step quote with limits and chunks for a desired-input buy', () => {
    const quotation = stepQuote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(20), true, createPayload(), false, 10);

    expect(quotation.limits.minAmount?.variant).toBe(SwapVariant.WithDesiredInput);
    expect(quotation.limits.minAmount?.amount.toString()).toBe('2');
    expect(quotation.limits.maxAmount?.amount.toString()).toBe('80');
    expect(quotation.limits.amountPrecision?.variant).toBe(SwapVariant.WithDesiredOutput);
    expect(quotation.chunks).toHaveLength(1);
    expect(asNumber(quotation.chunks[0]?.input as FPNumber)).toBeCloseTo(20);
    expect(asNumber(quotation.chunks[0]?.output as FPNumber)).toBeCloseTo(10);
  });

  it('builds step quotes for buy desired-output and sell desired-input/output paths', () => {
    const buyOutput = stepQuote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(4), false, createPayload(), false, 10);
    expect(buyOutput.limits.minAmount?.variant).toBe(SwapVariant.WithDesiredOutput);
    expect(buyOutput.limits.amountPrecision?.variant).toBe(SwapVariant.WithDesiredOutput);
    expect(asNumber(buyOutput.chunks[0]?.input as FPNumber)).toBeCloseTo(20);
    expect(asNumber(buyOutput.chunks[0]?.output as FPNumber)).toBeCloseTo(10);

    const sellInput = stepQuote(BASE, SYNTHETIC_BASE, ASSET, BASE, fp(5), true, createPayload(), false, 10);
    expect(sellInput.limits.minAmount?.variant).toBe(SwapVariant.WithDesiredInput);
    expect(sellInput.limits.amountPrecision?.variant).toBe(SwapVariant.WithDesiredInput);
    expect(asNumber(sellInput.chunks[0]?.input as FPNumber)).toBeCloseTo(12);
    expect(asNumber(sellInput.chunks[0]?.output as FPNumber)).toBeCloseTo(21.6);

    const sellOutput = stepQuote(BASE, SYNTHETIC_BASE, ASSET, BASE, fp(9), false, createPayload(), false, 10);
    expect(sellOutput.limits.minAmount?.variant).toBe(SwapVariant.WithDesiredOutput);
    expect(sellOutput.limits.amountPrecision?.variant).toBe(SwapVariant.WithDesiredInput);
    expect(asNumber(sellOutput.chunks[0]?.input as FPNumber)).toBeCloseTo(12);
    expect(asNumber(sellOutput.chunks[0]?.output as FPNumber)).toBeCloseTo(21.6);
  });

  it('returns only limits when a step quote amount is below the minimum lot', () => {
    const quotation = stepQuote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(1), true, createPayload(), false, 10);

    expect(quotation.limits.minAmount?.amount.toString()).toBe('2');
    expect(quotation.chunks).toEqual([]);
  });

  it('throws for step quotes when the order book is not exchangeable or missing', () => {
    expect(() =>
      stepQuote(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(1), true, createPayload({ status: OrderBookStatus.Stop }), false, 10)
    ).toThrow(Errors.CantExchange);
    expect(() => stepQuote(BASE, SYNTHETIC_BASE, BASE, 'missing-book', fp(1), true, createPayload(), false, 10)).toThrow(
      Errors.CantExchange
    );
  });

  it('has no order-book rewards', () => {
    expect(checkRewards(BASE, SYNTHETIC_BASE, BASE, ASSET, fp(1), fp(2), createPayload())).toEqual([]);
  });
});

type BookOverrides = {
  asks?: Array<[FPNumber, FPNumber]>;
  bids?: Array<[FPNumber, FPNumber]>;
  maxLotSize?: FPNumber;
  minLotSize?: FPNumber;
  status?: OrderBookStatus;
  stepLotSize?: FPNumber;
  tickSize?: FPNumber;
};

const createPayload = (bookOverrides: BookOverrides = {}) =>
  ({
    reserves: {
      orderBook: {
        [ASSET]: createBook(bookOverrides),
      },
    },
  }) as any;

const createBook = ({ asks, bids, ...overrides }: BookOverrides = {}) => ({
  orderBookId: {
    dexId: 0,
    base: ASSET,
    quote: BASE,
  },
  status: OrderBookStatus.Trade,
  lastOrderId: 1,
  tickSize: fp('0.01'),
  stepLotSize: fp('0.1'),
  minLotSize: fp(1),
  maxLotSize: fp(100),
  aggregated: {
    asks: asks ?? [
      [fp(2), fp(10)],
      [fp(3), fp(20)],
    ],
    bids: bids ?? [
      [fp(1.5), fp(8)],
      [fp(1.8), fp(12)],
    ],
  },
  ...overrides,
});
