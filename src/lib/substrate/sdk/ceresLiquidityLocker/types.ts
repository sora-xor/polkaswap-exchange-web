import type { FPNumber } from '@/lib/substrate/math';

export type AccountLockedPool = {
  poolTokens: FPNumber;
  unlockingTimestamp: number;
  assetA: string;
  assetB: string;
};
