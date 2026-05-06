import { FPNumber } from '@sora-substrate/math';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getChameleonPoolsMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/substrate/liquidity-proxy/runtime', () => ({
  getChameleonPools: getChameleonPoolsMock,
}));

import { Consts, LiquiditySourceTypes, SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import {
  canExchange,
  checkRewards,
  getActualReserves,
  quote,
  quoteWithoutImpact,
  stepQuote,
} from '@/lib/substrate/liquidity-proxy/pallets/poolXyk';

const BASE = Consts.XOR;
const TARGET = 'target-asset';
const SYNTHETIC_BASE = Consts.XST;

const fp = (value: string | number) => new FPNumber(value);
const codec = (value: string | number) => fp(value).toCodecString();
const asNumber = (value: FPNumber) => value.toNumber();

describe('liquidity proxy XYK pool pallet', () => {
  beforeEach(() => {
    getChameleonPoolsMock.mockReturnValue([null, []]);
  });

  it('reads actual reserves for base-to-target and target-to-base directions', () => {
    const payload = createPayload();

    const [baseInput, targetOutput, maxTargetOutput] = getActualReserves(BASE, BASE, TARGET, payload);
    expect(baseInput.toString()).toBe('1000');
    expect(targetOutput.toString()).toBe('500');
    expect(maxTargetOutput.toString()).toBe('500');

    const [targetInput, baseOutput, maxBaseOutput] = getActualReserves(BASE, TARGET, BASE, payload);
    expect(targetInput.toString()).toBe('500');
    expect(baseOutput.toString()).toBe('1000');
    expect(maxBaseOutput.toString()).toBe('1000');
  });

  it('combines base and chameleon reserves while keeping chameleon output capped', () => {
    getChameleonPoolsMock.mockReturnValue([Consts.KXOR, [TARGET]]);
    const payload = createPayload({
      base: 1000,
      target: 500,
      chameleon: 250,
    });

    const [inputReserve, outputReserve, maxOutput] = getActualReserves(BASE, TARGET, Consts.KXOR, payload);

    expect(inputReserve.toString()).toBe('500');
    expect(outputReserve.toString()).toBe('1250');
    expect(maxOutput.toString()).toBe('250');
  });

  it('allows exchange only when a valid pool exists with non-zero reserves', () => {
    expect(canExchange(BASE, SYNTHETIC_BASE, BASE, TARGET, createPayload())).toBe(true);
    expect(canExchange(BASE, SYNTHETIC_BASE, TARGET, BASE, createPayload())).toBe(true);
    expect(canExchange(BASE, SYNTHETIC_BASE, BASE, TARGET, createPayload({ base: 0 }))).toBe(false);
    expect(canExchange(BASE, SYNTHETIC_BASE, 'asset-a', 'asset-b', createPayload())).toBe(false);
  });

  it('quotes base-to-target swaps with desired input and fee deduction', () => {
    const result = quote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(10), true, createPayload(), true);

    expect(asNumber(result.amount)).toBeCloseTo(4.920546077802825);
    expect(asNumber(result.fee)).toBeCloseTo(0.06);
    expect(result.distribution).toEqual([
      expect.objectContaining({
        input: BASE,
        output: TARGET,
        market: LiquiditySourceTypes.XYKPool,
      }),
    ]);
  });

  it('quotes target-to-base swaps with destination fee deduction', () => {
    const result = quote(BASE, SYNTHETIC_BASE, TARGET, BASE, fp(10), true, createPayload(), true);

    expect(asNumber(result.amount)).toBeCloseTo(19.49019607843137);
    expect(asNumber(result.fee)).toBeCloseTo(0.11764705882352944);
    expect(result.distribution[0]?.input).toBe(TARGET);
    expect(result.distribution[0]?.output).toBe(BASE);
  });

  it('quotes desired output swaps and returns safe zero data when output reserves are insufficient', () => {
    const result = quote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(5), false, createPayload(), true);

    expect(result.amount.isGtZero()).toBe(true);
    expect(result.fee.isGtZero()).toBe(true);
    expect(result.distribution[0]?.outcome.toString()).toBe('5');

    const safeResult = quote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(600), false, createPayload(), true);
    expect(safeResult.amount.toString()).toBe('0');
    expect(safeResult.distribution[0]?.market).toBe(LiquiditySourceTypes.XYKPool);
    expect(safeResult.distribution[0]?.outcome.toString()).toBe('0');
  });

  it('quotes target-to-base desired output swaps and supports no-fee base quotes', () => {
    const targetToBase = quote(BASE, SYNTHETIC_BASE, TARGET, BASE, fp(20), false, createPayload(), true);
    expect(targetToBase.amount.isGtZero()).toBe(true);
    expect(targetToBase.fee.isGtZero()).toBe(true);
    expect(targetToBase.distribution[0]?.input).toBe(TARGET);
    expect(targetToBase.distribution[0]?.output).toBe(BASE);

    const noFeeBaseQuote = quote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(10), true, createPayload(), false);
    expect(asNumber(noFeeBaseQuote.amount)).toBeCloseTo(4.9504950495049505);
    expect(noFeeBaseQuote.fee.toString()).toBe('0');
  });

  it('returns a safe zero quote when chameleon output reserves are capped below the requested output', () => {
    getChameleonPoolsMock.mockReturnValue([Consts.KXOR, [TARGET]]);
    const payload = createPayload({
      base: 1000,
      target: 500,
      chameleon: 10,
    });

    const result = quote(BASE, SYNTHETIC_BASE, TARGET, Consts.KXOR, fp(20), false, payload, true);

    expect(result.amount.toString()).toBe('0');
    expect(result.distribution[0]?.input).toBe(TARGET);
    expect(result.distribution[0]?.output).toBe(Consts.KXOR);
  });

  it('returns a safe zero quote when desired input would exceed chameleon output reserves', () => {
    getChameleonPoolsMock.mockReturnValue([Consts.KXOR, [TARGET]]);
    const payload = createPayload({
      base: 1000,
      target: 500,
      chameleon: 10,
    });

    const result = quote(BASE, SYNTHETIC_BASE, TARGET, Consts.KXOR, fp(100), true, payload, true);

    expect(result.amount.toString()).toBe('0');
    expect(result.distribution[0]?.input).toBe(TARGET);
    expect(result.distribution[0]?.output).toBe(Consts.KXOR);
  });

  it('calculates no-impact XYK prices for both swap variants', () => {
    expect(
      asNumber(quoteWithoutImpact(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(10), true, createPayload(), true))
    ).toBeCloseTo(4.97);
    expect(
      asNumber(quoteWithoutImpact(BASE, SYNTHETIC_BASE, TARGET, BASE, fp(20), false, createPayload(), true))
    ).toBeCloseTo(10.06036217303823);
  });

  it('calculates no-impact prices for target desired-input and base desired-output variants', () => {
    const targetDesiredInput = quoteWithoutImpact(
      BASE,
      SYNTHETIC_BASE,
      TARGET,
      BASE,
      fp(10),
      true,
      createPayload(),
      true
    );
    const baseDesiredOutput = quoteWithoutImpact(
      BASE,
      SYNTHETIC_BASE,
      BASE,
      TARGET,
      fp(5),
      false,
      createPayload(),
      true
    );

    expect(asNumber(targetDesiredInput)).toBeCloseTo(19.88);
    expect(asNumber(baseDesiredOutput)).toBeCloseTo(10.06036217303823);
  });

  it('returns zero no-impact price when reserves cannot be resolved', () => {
    const result = quoteWithoutImpact(BASE, SYNTHETIC_BASE, 'asset-a', 'asset-b', fp(10), true, createPayload(), true);

    expect(result.toString()).toBe('0');
  });

  it('builds desired-input step quotes with sampled chunks', () => {
    const quotation = stepQuote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(12), true, createPayload(), true, 3);

    expect(quotation.chunks).toHaveLength(3);
    expect(quotation.limits.maxAmount).toBeNull();
    expect(quotation.chunks.every((chunk) => chunk.input.isGtZero() && chunk.output.isGtZero())).toBe(true);
  });

  it('builds desired-input step quotes when the fee is deducted from the destination asset', () => {
    const quotation = stepQuote(BASE, SYNTHETIC_BASE, TARGET, BASE, fp(12), true, createPayload(), true, 2);

    expect(quotation.chunks).toHaveLength(2);
    expect(quotation.chunks.every((chunk) => chunk.input.isGtZero() && chunk.output.isGtZero())).toBe(true);
  });

  it('caps desired-output step quotes at the max output limit', () => {
    const quotation = stepQuote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(1_000), false, createPayload(), true, 0);

    expect(quotation.limits.maxAmount?.variant).toBe(SwapVariant.WithDesiredOutput);
    expect(asNumber(quotation.limits.maxAmount?.amount as FPNumber)).toBeCloseTo(495);
    expect(quotation.chunks).toHaveLength(1);
    expect(asNumber(quotation.chunks[0]?.output as FPNumber)).toBeCloseTo(495);
  });

  it('returns empty step quotes for zero amount or empty reserves', () => {
    expect(stepQuote(BASE, SYNTHETIC_BASE, BASE, TARGET, FPNumber.ZERO, true, createPayload(), true, 3).chunks).toEqual(
      []
    );
    expect(
      stepQuote(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(10), true, createPayload({ target: 0 }), true, 3).chunks
    ).toEqual([]);
  });

  it('has no XYK pool rewards', () => {
    expect(checkRewards(BASE, SYNTHETIC_BASE, BASE, TARGET, fp(1), fp(2), createPayload())).toEqual([]);
  });
});

type PoolOverrides = {
  base?: string | number;
  chameleon?: string | number;
  target?: string | number;
};

const createPayload = ({ base = 1000, target = 500, chameleon = 0 }: PoolOverrides = {}) =>
  ({
    reserves: {
      xyk: {
        [TARGET]: {
          base: codec(base),
          target: codec(target),
          chameleon: codec(chameleon),
        },
      },
    },
  }) as any;
