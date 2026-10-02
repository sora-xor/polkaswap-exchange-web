import { FPNumber } from '@sora-substrate/math';
import type { CodecString } from '@sora-substrate/sdk';

/** Amounts remain codec strings until a UI formatter applies the chain's XOR precision. */
export type SwapFeeAssessment =
  | { status: 'unknown' }
  | { status: 'covered' }
  | {
      status: 'shortfall';
      feeCodec: CodecString;
      shortfallCodec: CodecString;
      canReduceInput: boolean;
      paidFromOutput: boolean;
    };

/** Uses slippage-protected execution bounds when assessing balances and output-funded fees. */
export function getSwapExecutionAmounts(input: {
  fromValue: string;
  toValue: string;
  minMaxReceived: CodecString;
  isExchangeB: boolean;
  fromDecimals: number;
  toDecimals: number;
}): { inputAmount: string; outputAmount: string } {
  const bound = FPNumber.fromCodecValue(
    input.minMaxReceived || '0',
    input.isExchangeB ? input.fromDecimals : input.toDecimals
  ).toString();
  return {
    inputAmount: input.isExchangeB ? bound : input.fromValue,
    outputAmount: input.isExchangeB ? input.toValue : bound,
  };
}

/** Assesses the native fee without treating output-funded swaps as a missing wallet balance. */
export function assessSwapFee(input: {
  balanceCodec?: CodecString | null;
  feeCodec?: CodecString | null;
  decimals?: number;
  spendsXor: boolean;
  receivesXor: boolean;
  inputAmount: string;
  outputAmount: string;
}): SwapFeeAssessment {
  if (input.balanceCodec == null || input.feeCodec == null || input.feeCodec === '' || input.decimals == null) {
    return { status: 'unknown' };
  }
  const { decimals } = input;
  const balance = FPNumber.fromCodecValue(input.balanceCodec, decimals);
  const fee = FPNumber.fromCodecValue(input.feeCodec, decimals);
  const amount = new FPNumber(input.inputAmount || '0', decimals);
  const output = new FPNumber(input.outputAmount || '0', decimals);
  if (!balance.isFinity() || !fee.isFinity() || !amount.isFinity() || !output.isFinity()) return { status: 'unknown' };
  if (FPNumber.lt(balance, FPNumber.ZERO) || FPNumber.lt(fee, FPNumber.ZERO)) return { status: 'unknown' };
  if (fee.isZero()) return { status: 'covered' };
  const available = input.spendsXor ? balance.sub(amount) : input.receivesXor ? balance.add(output) : balance;
  // Output must remain positive after any unpaid fee is deducted, matching the swap's existing guard.
  const outputUsedForFee = input.receivesXor && FPNumber.lt(balance, fee);
  const covered = outputUsedForFee ? FPNumber.gt(available, fee) : FPNumber.gte(available, fee);
  if (covered || (input.spendsXor && FPNumber.gt(amount, balance))) return { status: 'covered' };
  return {
    status: 'shortfall',
    feeCodec: fee.toCodecString(),
    shortfallCodec: fee.sub(available).max(FPNumber.ZERO).toCodecString(),
    canReduceInput: input.spendsXor && FPNumber.gt(balance, fee),
    paidFromOutput: outputUsedForFee,
  };
}
