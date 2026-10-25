import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { Consts, LiquiditySourceTypes, SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import {
  buyPriceNoVolume,
  canExchange,
  checkRewards,
  quote,
  quoteWithoutImpact,
  sellPriceNoVolume,
  stepQuote,
} from '@/lib/substrate/liquidity-proxy/pallets/xst';

const BASE = Consts.XOR;
const XST = Consts.XST;
const XSTUSD = Consts.XSTUSD;
const SYNTH = 'synthetic-token';

const fp = (value: string | number) => new FPNumber(value);
const codec = (value: string | number) => fp(value).toCodecString();
const asNumber = (value: FPNumber) => value.toNumber();

describe('liquidity proxy XST pallet', () => {
  it('allows exchange only through the configured synthetic base on XOR dex', () => {
    const payload = createPayload();

    expect(canExchange(BASE, XST, XST, XSTUSD, payload)).toBe(true);
    expect(canExchange(BASE, XST, XSTUSD, XST, payload)).toBe(true);
    expect(canExchange(Consts.KUSD, XST, XST, XSTUSD, payload)).toBe(false);
    expect(canExchange(BASE, XST, XSTUSD, SYNTH, payload)).toBe(false);
    expect(canExchange(BASE, XST, XST, 'missing-synthetic', payload)).toBe(false);
  });

  it('quotes buying XST with desired XSTUSD input and deducts aggregated fees', () => {
    const result = quote(BASE, XST, XSTUSD, XST, fp(10), true, createPayload(), true);

    expect(asNumber(result.amount)).toBeCloseTo(4.85);
    expect(asNumber(result.fee)).toBeCloseTo(0.3);
    expect(result.distribution).toEqual([
      expect.objectContaining({
        input: XSTUSD,
        output: XST,
        market: LiquiditySourceTypes.XSTPool,
      }),
    ]);
    expect(result.distribution[0]?.income.toString()).toBe('10');
    expect(asNumber(result.distribution[0]?.outcome as FPNumber)).toBeCloseTo(4.85);
  });

  it('quotes buying desired XST output by returning the required XSTUSD input', () => {
    const result = quote(BASE, XST, XSTUSD, XST, fp(5), false, createPayload(), true);

    expect(asNumber(result.amount)).toBeCloseTo(10.309278350515465);
    expect(asNumber(result.fee)).toBeCloseTo(0.309278350515464);
    expect(asNumber(result.distribution[0]?.income as FPNumber)).toBeCloseTo(10.309278350515465);
    expect(result.distribution[0]?.outcome.toString()).toBe('5');
  });

  it('quotes selling XST with desired input and converts XST fees into XOR', () => {
    const result = quote(BASE, XST, XST, XSTUSD, fp(10), true, createPayload(), true);

    expect(asNumber(result.amount)).toBeCloseTo(19.4);
    expect(asNumber(result.fee)).toBeCloseTo(0.6);
    expect(result.distribution[0]?.input).toBe(XST);
    expect(result.distribution[0]?.output).toBe(XSTUSD);
    expect(result.distribution[0]?.income.toString()).toBe('10');
  });

  it('quotes selling XST for desired XSTUSD output by returning the required XST input', () => {
    const result = quote(BASE, XST, XST, XSTUSD, fp(20), false, createPayload(), true);

    expect(asNumber(result.amount)).toBeCloseTo(10.309278350515465);
    expect(asNumber(result.fee)).toBeCloseTo(0.618556701030928);
    expect(asNumber(result.distribution[0]?.income as FPNumber)).toBeCloseTo(10.309278350515465);
    expect(result.distribution[0]?.outcome.toString()).toBe('20');
  });

  it('uses oracle reference prices for non-reference synthetic assets', () => {
    const payload = createPayload();

    expect(asNumber(buyPriceNoVolume(SYNTH, payload))).toBeCloseTo(0.5);
    expect(asNumber(sellPriceNoVolume(SYNTH, payload))).toBeCloseTo(0.5);

    const result = quote(BASE, XST, SYNTH, XST, fp(8), true, payload, true);
    expect(asNumber(result.amount)).toBeCloseTo(15.52);
  });

  it('returns no-impact quotes without applying the synthetic base limit', () => {
    const result = quoteWithoutImpact(BASE, XST, XST, XSTUSD, fp(1_000), true, createPayload(), true);

    expect(result.isGtZero()).toBe(true);
    expect(asNumber(result)).toBeCloseTo(1_940);
  });

  it('returns safe zero quotes for invalid paths, zero amounts, exceeded limits, and invalid fees', () => {
    expect(quote(BASE, XST, XSTUSD, SYNTH, fp(1), true, createPayload(), true).amount.toString()).toBe('0');
    expect(quote(BASE, XST, XSTUSD, XST, FPNumber.ZERO, true, createPayload(), true).amount.toString()).toBe('0');
    expect(quote(BASE, XST, XST, XSTUSD, fp(101), true, createPayload(), true).amount.toString()).toBe('0');
    expect(
      quote(
        BASE,
        XST,
        XSTUSD,
        XST,
        fp(1),
        true,
        createPayload({ feeRatio: fp('0.99'), dynamicFee: '0.02' }),
        true
      ).amount.toString()
    ).toBe('0');
  });

  it('returns zero no-impact quote when the underlying quote cannot be calculated', () => {
    const result = quoteWithoutImpact(BASE, XST, XSTUSD, SYNTH, fp(1), true, createPayload(), true);

    expect(result.toString()).toBe('0');
  });

  it('builds single-sample step quotes for selling XST with desired input', () => {
    const quotation = stepQuote(BASE, XST, XST, XSTUSD, fp(80), true, createPayload(), true, 0);

    expect(quotation.limits.maxAmount?.variant).toBe(SwapVariant.WithDesiredInput);
    expect(quotation.limits.maxAmount?.amount.toString()).toBe('100');
    expect(quotation.chunks).toHaveLength(1);
    expect(quotation.chunks[0]?.input.toString()).toBe('80');
    expect(quotation.chunks[0]?.output.isGtZero()).toBe(true);
  });

  it('builds sampled step quotes for buying desired XST output', () => {
    const quotation = stepQuote(BASE, XST, XSTUSD, XST, fp(80), false, createPayload(), true, 4);

    expect(quotation.limits.maxAmount?.variant).toBe(SwapVariant.WithDesiredOutput);
    expect(quotation.limits.maxAmount?.amount.toString()).toBe('100');
    expect(quotation.chunks).toHaveLength(4);
    expect(asNumber(quotation.chunks.reduce((sum, chunk) => sum.add(chunk.output), FPNumber.ZERO))).toBeCloseTo(80);
  });

  it('throws from step quotes when the synthetic base amount exceeds the configured limit', () => {
    expect(() => stepQuote(BASE, XST, XST, XSTUSD, fp(120), true, createPayload(), true, 4)).toThrow(
      'Input/output amount of synthetic base asset exceeds the limit'
    );
    expect(() => stepQuote(BASE, XST, XSTUSD, XST, fp(120), false, createPayload(), true, 4)).toThrow(
      'Input/output amount of synthetic base asset exceeds the limit'
    );
  });

  it('returns empty step quotes for zero input or zero configured limit', () => {
    expect(stepQuote(BASE, XST, XST, XSTUSD, FPNumber.ZERO, true, createPayload(), true, 4).chunks).toEqual([]);
    expect(stepQuote(BASE, XST, XST, XSTUSD, fp(1), true, createPayload({ limit: 0 }), true, 4).chunks).toEqual([]);
  });

  it('throws when step quotes are requested for unsupported paths', () => {
    expect(() => stepQuote(BASE, XST, XSTUSD, SYNTH, fp(1), true, createPayload(), true, 4)).toThrow(
      "Liquidity source can't exchange assets"
    );
  });

  it('has no XST pool rewards', () => {
    expect(checkRewards(BASE, XST, XST, XSTUSD, fp(1), fp(2), createPayload())).toEqual([]);
  });
});

type PayloadOptions = {
  dynamicFee?: string | number;
  feeRatio?: FPNumber;
  floorPrice?: string | number;
  limit?: string | number;
};

const createPayload = ({
  dynamicFee = '0.01',
  feeRatio = fp('0.02'),
  floorPrice = 1,
  limit = 100,
}: PayloadOptions = {}) =>
  ({
    enabledAssets: {
      tbc: [],
      xst: {
        [XSTUSD]: {
          referenceSymbol: 'USD',
          feeRatio,
        },
        [SYNTH]: {
          referenceSymbol: 'SYN',
          feeRatio,
        },
      },
    },
    rates: {
      USD: {
        value: codec(1),
        lastUpdated: 1,
        dynamicFee: codec(dynamicFee),
      },
      SYN: {
        value: codec(4),
        lastUpdated: 1,
        dynamicFee: codec(dynamicFee),
      },
    },
    prices: {
      [XST]: {
        Buy: codec('0.5'),
        Sell: codec('0.5'),
      },
      [Consts.DAI]: {
        Buy: codec(1),
        Sell: codec(1),
      },
    },
    consts: {
      xst: {
        floorPrice: codec(floorPrice),
        referenceAsset: Consts.DAI,
        syntheticBaseBuySellLimit: codec(limit),
      },
    },
  }) as any;
