import { describe, expect, it } from 'vitest';
import { assessSwapFee, getSwapExecutionAmounts } from '@/features/swap/services/feeAssessment';

const base = {
  balanceCodec: '99',
  feeCodec: '100',
  decimals: 18,
  spendsXor: false,
  receivesXor: false,
  inputAmount: '1',
  outputAmount: '1',
};
describe('swap fee assessment with exact native units', () => {
  it('retains a one-codec-unit shortfall above Number.MAX_SAFE_INTEGER', () => {
    expect(
      assessSwapFee({ ...base, balanceCodec: '900719925474099299999', feeCodec: '900719925474099300000' })
    ).toMatchObject({ status: 'shortfall', shortfallCodec: '1' });
  });
  it('respects native decimals and distinguishes fee reserve from input insufficiency', () => {
    expect(
      assessSwapFee({
        ...base,
        decimals: 6,
        balanceCodec: '1000000',
        feeCodec: '100000',
        spendsXor: true,
        inputAmount: '1',
      })
    ).toMatchObject({ status: 'shortfall', shortfallCodec: '100000', canReduceInput: true });
    expect(assessSwapFee({ ...base, decimals: 6, balanceCodec: '1000000', spendsXor: true, inputAmount: '2' })).toEqual(
      { status: 'covered' }
    );
  });
  it('allows received XOR to cover fees only with positive output remaining', () => {
    expect(assessSwapFee({ ...base, receivesXor: true, outputAmount: '0.000000000000000002' })).toEqual({
      status: 'covered',
    });
    expect(assessSwapFee({ ...base, receivesXor: true, outputAmount: '0.000000000000000001' })).toMatchObject({
      status: 'shortfall',
      paidFromOutput: true,
      shortfallCodec: '0',
    });
  });
  it('handles unknown balance, zero fees, and exact coverage without floating point', () => {
    expect(assessSwapFee({ ...base, balanceCodec: undefined })).toEqual({ status: 'unknown' });
    expect(assessSwapFee({ ...base, feeCodec: '' })).toEqual({ status: 'unknown' });
    expect(assessSwapFee({ ...base, feeCodec: '0' })).toEqual({ status: 'covered' });
    expect(assessSwapFee({ ...base, balanceCodec: '100' })).toEqual({ status: 'covered' });
  });
  it('uses maximum sold for exact-output balance checks and minimum received for native-output fees', () => {
    const exactOutput = getSwapExecutionAmounts({
      fromValue: '9',
      toValue: '1',
      minMaxReceived: '9900000000000000000',
      isExchangeB: true,
      fromDecimals: 18,
      toDecimals: 6,
    });
    expect(exactOutput.inputAmount).toBe('9.9');
    expect(
      assessSwapFee({
        ...base,
        ...exactOutput,
        balanceCodec: '10000000000000000000',
        feeCodec: '500000000000000000',
        spendsXor: true,
      })
    ).toMatchObject({ status: 'shortfall', shortfallCodec: '400000000000000000' });
    const exactInput = getSwapExecutionAmounts({
      fromValue: '1',
      toValue: '1',
      minMaxReceived: '400000000000000000',
      isExchangeB: false,
      fromDecimals: 6,
      toDecimals: 18,
    });
    expect(
      assessSwapFee({ ...base, ...exactInput, balanceCodec: '0', feeCodec: '500000000000000000', receivesXor: true })
    ).toMatchObject({ status: 'shortfall', shortfallCodec: '100000000000000000' });
  });
});
