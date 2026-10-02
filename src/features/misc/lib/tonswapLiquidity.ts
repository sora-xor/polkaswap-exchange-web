import { FPNumber } from '@sora-substrate/sdk';
import type { GetTsPurpose } from './getTsFlow';

/** Native SORA2 funding is always bound to this production chain, independently of any campaign. */
export const SORA_FUNDING_MAINNET_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';

/** A funding check is advisory and short lived; the eventual swap always requires a new quote. */
export const TONSWAP_LIQUIDITY_TTL_MS = 30_000;
export const TONSWAP_MAX_PRICE_IMPACT = '5';
/** Current SDK network-fee codecs; zero is the SDK's unavailable/default sentinel. */
export interface TonswapFeeEvidence {
  swapFeeCodec?: string | null;
  burnFeeCodec?: string | null;
  /** Configured SORA swap slippage, in percentage points. */
  slippageTolerance?: string;
}
export interface TonswapLiquidityCheck {
  allowed: boolean;
  amount: string;
  xor: string;
  impact: string;
  expiresAt: number;
  reason?: 'price-impact' | 'fees-unavailable' | 'fees-insufficient';
  feeReserve?: string;
  burnableXor?: string;
  /** Generic XOR purchase output after the swap fee; never reserves a campaign burn fee. */
  spendableXor?: string;
}

/** Rejects unbounded, zero, exponent, signed, and overprecision DAI input before any RPC request. */
export function isTonswapFundingAmount(amount: string): boolean {
  return (
    typeof amount === 'string' &&
    amount.length <= 60 &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount) &&
    new FPNumber(amount).gt(FPNumber.ZERO)
  );
}

/**
 * Checks price impact and leaves positive XOR after purpose-specific network fees.
 * Reduces output by the accepted 2% conversion bound and configured
 * SORA slippage when larger. It assumes no existing XOR to subsidize a newcomer.
 */
export function evaluateTonswapLiquidity(
  amount: string,
  xorCodec: string,
  withoutImpactCodec: string,
  fees: TonswapFeeEvidence,
  now = Date.now(),
  purpose: GetTsPurpose = 'ts'
): TonswapLiquidityCheck {
  if (!isTonswapFundingAmount(amount)) throw new Error('Invalid funding amount');
  for (const value of [xorCodec, withoutImpactCodec]) {
    if (typeof value !== 'string' || value.length > 78 || !/^[1-9]\d*$/.test(value)) throw new Error('Invalid quote');
  }
  const output = FPNumber.fromCodecValue(xorCodec, 18);
  const baseline = FPNumber.fromCodecValue(withoutImpactCodec, 18);
  const impact = baseline.sub(output).div(baseline).mul(new FPNumber('100')).abs();
  const result: TonswapLiquidityCheck = {
    allowed: false,
    amount,
    xor: output.toString(),
    impact: impact.toString(),
    expiresAt: now + TONSWAP_LIQUIDITY_TTL_MS,
  };
  const requiredFees = purpose === 'xor' ? [fees?.swapFeeCodec] : [fees?.swapFeeCodec, fees?.burnFeeCodec];
  const hasFees = requiredFees.every((fee) => typeof fee === 'string' && fee.length <= 78 && /^[1-9]\d*$/.test(fee));
  const tolerance = fees?.slippageTolerance ?? '1';
  const validTolerance =
    typeof tolerance === 'string' &&
    tolerance.length <= 24 &&
    /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(tolerance) &&
    new FPNumber(tolerance).lt(new FPNumber('100'));
  if (!hasFees || !validTolerance) {
    result.reason = 'fees-unavailable';
  } else {
    const feeReserve = requiredFees.reduce(
      (total, fee) => total.add(FPNumber.fromCodecValue(fee as string, 18)),
      FPNumber.ZERO
    );
    const retained = new FPNumber('0.98').mul(FPNumber.ONE.sub(new FPNumber(tolerance).div(new FPNumber('100'))));
    const conservativeRate = retained.lt(new FPNumber('0.98')) ? retained : new FPNumber('0.98');
    // Round down to on-chain XOR precision before comparing against exact fees.
    const conservativeOutput = output.mul(conservativeRate).dp(18, 3);
    const burnable = conservativeOutput.sub(feeReserve);
    result.feeReserve = feeReserve.toString();
    if (purpose === 'xor') result.spendableXor = burnable.gt(FPNumber.ZERO) ? burnable.toString() : '0';
    else result.burnableXor = burnable.gt(FPNumber.ZERO) ? burnable.toString() : '0';
    if (!burnable.gt(FPNumber.ZERO)) result.reason = 'fees-insufficient';
  }
  if (impact.gt(new FPNumber(TONSWAP_MAX_PRICE_IMPACT))) result.reason = 'price-impact';
  result.allowed = result.reason === undefined;
  return result;
}
