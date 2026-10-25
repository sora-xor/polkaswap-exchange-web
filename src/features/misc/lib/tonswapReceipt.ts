import { FPNumber } from '@sora-substrate/sdk';

import type { TonswapBurnAllocation } from './tonswapBurn';

/** Parses an exact positive campaign amount without accepting exponents or excess precision. */
export function parseTonswapPreviewAmount(value: string): FPNumber | null {
  if (value.length > 97 || !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value)) return null;
  const amount = new FPNumber(value);
  return amount.isFinity() && amount.gt(FPNumber.ZERO) ? amount : null;
}

/**
 * Exports only public evidence from a finalized allocation. The receipt cannot
 * authorize a claim: the participant must retain control of the signing wallet.
 */
export function createTonswapReceipt(allocation: TonswapBurnAllocation): string {
  if (
    !allocation.address ||
    !/^0x[\da-f]{64}$/i.test(allocation.txHash) ||
    !Number.isSafeInteger(allocation.blockHeight) ||
    allocation.blockHeight < 0 ||
    !Number.isSafeInteger(allocation.extrinsicIndex) ||
    allocation.extrinsicIndex < 0
  ) {
    throw new Error('Invalid finalized TONSWAP receipt');
  }
  const amounts = [allocation.amount, allocation.eligible, allocation.excess, allocation.reward];
  if (amounts.some((value) => !value.isFinity() || value.lt(FPNumber.ZERO))) {
    throw new Error('Invalid TONSWAP receipt amounts');
  }
  return JSON.stringify(
    {
      schema: 'polkaswap.tonswap-burn-receipt',
      version: 1,
      network: 'SORA mainnet',
      campaign: 'tonswap-xor-burn',
      signingSoraAddress: allocation.address,
      transactionHash: allocation.txHash,
      blockHeight: allocation.blockHeight,
      extrinsicIndex: allocation.extrinsicIndex,
      xorBurned: allocation.amount.toString(),
      eligibleXor: allocation.eligible.toString(),
      unrewardedXor: allocation.excess.toString(),
      tsReserved: allocation.reward.toString(),
      status: allocation.reward.isZero() ? 'no-ts-allocation' : 'reserved-for-launch',
      campaignUrl: 'https://tonswap.org/ts',
      claimWebsite: 'https://tonswap.org',
      notice:
        'XOR was irreversibly burned. TS is not delivered by this receipt. Claims are planned to open at launch. Keep control of the signing SORA wallet; this public receipt alone cannot authorize a claim.',
    },
    null,
    2
  );
}
