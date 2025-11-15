import type { FPNumber } from '@sora-substrate/math';

export type AccountLockedPool = {
  poolTokens: FPNumber;
  unlockingTimestamp: number;
  assetA: string;
  assetB: string;
};
