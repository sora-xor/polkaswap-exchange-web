import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { SORA_NATIVE_MAX_FEE_MARGIN_CODEC } from '@/consts/networkFee';

import type { CodecString } from '@sora-substrate/sdk';

interface WalletSendMaxParams {
  assetAddress: string;
  balance: CodecString;
  decimals: number;
  fee: FPNumber;
}

interface WalletSendMaxAvailabilityParams {
  maxAmount: FPNumber;
  shouldBalanceBeHidden: boolean;
}

/**
 * Calculates the maximum amount that can safely be entered on the wallet send screen.
 * XOR reserves the estimated fee plus the shared allowance for the real sender's
 * encoded nonce. Fees and the allowance are already in current chain units.
 */
export const getWalletSendMaxAmount = ({ assetAddress, balance, decimals, fee }: WalletSendMaxParams): FPNumber => {
  if (!/^\d+$/.test(balance)) return FPNumber.ZERO;

  const fpBalance = FPNumber.fromCodecValue(balance, decimals);
  if (!fpBalance.isFinity()) return FPNumber.ZERO;

  if (assetAddress !== XOR.address) {
    return fpBalance.max(FPNumber.ZERO);
  }

  if (!fee.isFinity() || !FPNumber.gt(fee, FPNumber.ZERO)) {
    return FPNumber.ZERO;
  }

  const margin = FPNumber.fromCodecValue(SORA_NATIVE_MAX_FEE_MARGIN_CODEC, decimals);
  return fpBalance.sub(fee).sub(margin).max(FPNumber.ZERO);
};

/**
 * Keeps the MAX action visible whenever it can apply a positive spendable balance.
 */
export const isWalletSendMaxAvailable = ({
  maxAmount,
  shouldBalanceBeHidden,
}: WalletSendMaxAvailabilityParams): boolean => {
  return !shouldBalanceBeHidden && FPNumber.gt(maxAmount, FPNumber.ZERO);
};
