import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

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
 */
export const getWalletSendMaxAmount = ({ assetAddress, balance, decimals, fee }: WalletSendMaxParams): FPNumber => {
  const fpBalance = FPNumber.fromCodecValue(balance, decimals);

  if (assetAddress !== XOR.address) {
    return fpBalance.max(FPNumber.ZERO);
  }

  if (fee.isZero()) {
    return FPNumber.ZERO;
  }

  return fpBalance.sub(fee).max(FPNumber.ZERO);
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
