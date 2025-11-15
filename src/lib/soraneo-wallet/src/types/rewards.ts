import type { Asset } from '@sora-substrate/sdk/build/assets/types';

export interface RewardsAmountHeaderItem {
  asset: Asset;
  amount: string;
}
