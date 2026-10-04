import { FPNumber } from '@sora-substrate/sdk';

import { getTonswapCurrentRate, TONSWAP_XOR_CAP, type TonswapBurnAllocations } from './tonswapBurn';

/** One verified reading of the TONSWAP campaign, shared by the Burn page and the sidebar. */
export type TonswapCampaignSummary = {
  /** XOR is still eligible for TS, so a burn made now can still earn a reward. */
  live: boolean;
  /** Marginal TS per XOR for the next burn. */
  rate: FPNumber;
  /** XOR counted towards the cap so far. */
  burned: FPNumber;
  /** XOR that can still earn TS before the cap. */
  remaining: FPNumber;
  /** TS reserved by every counted burn. */
  reserved: FPNumber;
  /** Share of the cap already burned, from 0 to 100. */
  percent: FPNumber;
  /** Last finalized block covered by the reading. */
  indexedThroughBlock: number;
};

const HUNDRED = new FPNumber('100');
const CAP = new FPNumber(TONSWAP_XOR_CAP);

/**
 * Condenses a complete allocation into what the UI shows. Call it only with a fresh, verified snapshot: a stale
 * snapshot says nothing about whether burning is open now, so the caller must not summarize it.
 */
export function summarizeTonswapCampaign(
  allocation: TonswapBurnAllocations,
  indexedThroughBlock: number
): TonswapCampaignSummary {
  const burned = allocation.totalEligible;
  return {
    live: allocation.remaining.gt(FPNumber.ZERO),
    rate: getTonswapCurrentRate(burned),
    burned,
    remaining: allocation.remaining,
    reserved: allocation.totalReward,
    percent: burned.mul(HUNDRED).div(CAP),
    indexedThroughBlock,
  };
}
