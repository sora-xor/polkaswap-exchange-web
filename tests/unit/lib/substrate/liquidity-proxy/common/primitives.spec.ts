import { FPNumber } from '@sora-substrate/math';
import { describe, expect, it } from 'vitest';

import { SwapVariant } from '@/lib/substrate/liquidity-proxy/consts';
import {
  DiscreteQuotation,
  SideAmount,
  SwapChunk,
  SwapLimits,
} from '@/lib/substrate/liquidity-proxy/common/primitives';

const fp = (value: string | number) => new FPNumber(value);
const asNumber = (value: FPNumber) => value.toNumber();
const chunk = (input: number, output: number, fee = 0) => new SwapChunk(fp(input), fp(output), fp(fee));

describe('liquidity proxy primitives', () => {
  it('tracks the side amount swap variant', () => {
    expect(new SideAmount(fp(1), SwapVariant.WithDesiredInput).isInput).toBe(true);
    expect(new SideAmount(fp(1), SwapVariant.WithDesiredOutput).isInput).toBe(false);
  });

  it('exposes swap chunk side-specific values and equality helpers', () => {
    const sample = chunk(10, 20, 1);
    const input = new SideAmount(fp(10), SwapVariant.WithDesiredInput);
    const output = new SideAmount(fp(20), SwapVariant.WithDesiredOutput);

    expect(sample.getAssociatedField(SwapVariant.WithDesiredInput).amount.toString()).toBe('10');
    expect(sample.getAssociatedField(SwapVariant.WithDesiredOutput).amount.toString()).toBe('20');
    expect(sample.getSameTypeAmount(input).amount.toString()).toBe('10');
    expect(sample.getSameTypeAmount(output).amount.toString()).toBe('20');
    expect(sample.compareWith(input).map((value) => value.toString())).toEqual(['10', '10']);
    expect(sample.compareWith(output).map((value) => value.toString())).toEqual(['20', '20']);
    expect(sample.eq(input)).toBe(true);
    expect(sample.eq(new SideAmount(fp(21), SwapVariant.WithDesiredOutput))).toBe(false);
    expect(SwapChunk.zero().isZero()).toBe(true);
    expect(SwapChunk.default().isZero()).toBe(true);
  });

  it('rescales chunks by sides, ratios, and arithmetic operations', () => {
    const sample = chunk(10, 20, 1);

    expect(asNumber(sample.price)).toBeCloseTo(2);
    expect(asNumber(sample.proportionalInput(fp(10)))).toBeCloseTo(5);
    expect(asNumber(sample.proportionalOutput(fp(5)))).toBeCloseTo(10);
    expect(sample.proportionalInput(FPNumber.ZERO).toString()).toBe('0');
    expect(sample.proportionalOutput(FPNumber.ZERO).toString()).toBe('0');

    const byInput = sample.rescaleByInput(fp(5));
    expect(asNumber(byInput.input)).toBeCloseTo(5);
    expect(asNumber(byInput.output)).toBeCloseTo(10);
    expect(asNumber(byInput.fee)).toBeCloseTo(0.5);

    const byOutput = sample.rescaleByOutput(fp(8));
    expect(asNumber(byOutput.input)).toBeCloseTo(4);
    expect(asNumber(byOutput.output)).toBeCloseTo(8);
    expect(asNumber(byOutput.fee)).toBeCloseTo(0.4);

    const byRatio = sample.rescaleByRatio(fp(0.25));
    expect(asNumber(byRatio.input)).toBeCloseTo(2.5);
    expect(asNumber(byRatio.output)).toBeCloseTo(5);
    expect(asNumber(byRatio.fee)).toBeCloseTo(0.25);

    expect(
      asNumber(sample.rescaleBySideAmount(new SideAmount(fp(3), SwapVariant.WithDesiredInput)).output)
    ).toBeCloseTo(6);
    expect(
      asNumber(sample.rescaleBySideAmount(new SideAmount(fp(6), SwapVariant.WithDesiredOutput)).input)
    ).toBeCloseTo(3);

    expect(sample.saturatingAdd(chunk(1, 2, 0.1)).input.toString()).toBe('11');
    expect(sample.saturatingSub(chunk(12, 30, 2)).isZero()).toBe(true);
  });

  it('calculates precision steps for input and output amount precision', () => {
    const sample = chunk(10, 20, 1);
    const inputPrecision = new SwapLimits(null, null, new SideAmount(fp(2), SwapVariant.WithDesiredInput));
    const outputPrecision = new SwapLimits(null, null, new SideAmount(fp(4), SwapVariant.WithDesiredOutput));

    expect(inputPrecision.getPrecisionStep(sample, SwapVariant.WithDesiredInput).toString()).toBe('2');
    expect(asNumber(inputPrecision.getPrecisionStep(sample, SwapVariant.WithDesiredOutput))).toBeCloseTo(4);
    expect(asNumber(outputPrecision.getPrecisionStep(sample, SwapVariant.WithDesiredInput))).toBeCloseTo(2);
    expect(outputPrecision.getPrecisionStep(sample, SwapVariant.WithDesiredOutput).toString()).toBe('4');
    expect(new SwapLimits(null, null, null).getPrecisionStep(sample, SwapVariant.WithDesiredInput).toString()).toBe(
      '0'
    );
  });

  it('aligns chunks by minimum, maximum, and precision limits', () => {
    const sample = chunk(10, 20, 1);

    const min = new SwapLimits(new SideAmount(fp(12), SwapVariant.WithDesiredInput), null, null);
    const [minAligned, minRemainder] = min.alignChunkMin(sample);
    expect(minAligned.isZero()).toBe(true);
    expect(minRemainder).toBe(sample);

    const max = new SwapLimits(null, new SideAmount(fp(6), SwapVariant.WithDesiredInput), null);
    const [maxAligned, maxRemainder] = max.alignChunkMax(sample);
    expect(asNumber(maxAligned.input)).toBeCloseTo(6);
    expect(asNumber(maxAligned.output)).toBeCloseTo(12);
    expect(asNumber(maxRemainder.input)).toBeCloseTo(4);
    expect(asNumber(maxRemainder.output)).toBeCloseTo(8);

    const precision = new SwapLimits(null, null, new SideAmount(fp(3), SwapVariant.WithDesiredInput));
    const [precisionAligned, precisionRemainder] = precision.alignChunkPrecision(sample);
    expect(asNumber(precisionAligned.input)).toBeCloseTo(9);
    expect(asNumber(precisionAligned.output)).toBeCloseTo(18);
    expect(asNumber(precisionRemainder.input)).toBeCloseTo(1);
    expect(asNumber(precisionRemainder.output)).toBeCloseTo(2);

    expect(new SwapLimits(null, null, null).alignChunk(sample)).toEqual([sample, SwapChunk.zero()]);
  });

  it('aligns an extra chunk against an accumulated maximum', () => {
    const limits = new SwapLimits(null, new SideAmount(fp(12), SwapVariant.WithDesiredInput), null);
    const [aligned, remainder] = limits.alignExtraChunkMax(chunk(10, 20), chunk(5, 10));

    expect(asNumber(aligned.input)).toBeCloseTo(2);
    expect(asNumber(aligned.output)).toBeCloseTo(4);
    expect(asNumber(remainder.input)).toBeCloseTo(3);
    expect(asNumber(remainder.output)).toBeCloseTo(6);
  });

  it('verifies discrete quotations for zero chunks, precision, and price ordering', () => {
    const valid = new DiscreteQuotation();
    valid.chunks = [chunk(10, 30), chunk(10, 20)];
    expect(valid.verify()).toBe(true);

    const withZero = new DiscreteQuotation();
    withZero.chunks = [chunk(0, 1)];
    expect(withZero.verify()).toBe(false);

    const withPrecisionMismatch = new DiscreteQuotation();
    withPrecisionMismatch.limits = new SwapLimits(null, null, new SideAmount(fp(5), SwapVariant.WithDesiredInput));
    withPrecisionMismatch.chunks = [chunk(6, 12)];
    expect(withPrecisionMismatch.verify()).toBe(false);

    const withOutputPrecision = new DiscreteQuotation();
    withOutputPrecision.limits = new SwapLimits(null, null, new SideAmount(fp(4), SwapVariant.WithDesiredOutput));
    withOutputPrecision.chunks = [chunk(10, 20)];
    expect(withOutputPrecision.verify()).toBe(true);

    const withWorsePriceLater = new DiscreteQuotation();
    withWorsePriceLater.chunks = [chunk(10, 10), chunk(10, 20)];
    expect(withWorsePriceLater.verify()).toBe(false);

    const withInvalidPrice = new DiscreteQuotation();
    withInvalidPrice.chunks = [chunk(Number.NaN, 1)];
    expect(withInvalidPrice.verify()).toBe(false);
  });
});
