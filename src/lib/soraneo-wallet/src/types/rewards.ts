import type { Asset } from '@/lib/substrate/sdk/assets/types';

export interface RewardsAmountHeaderItem {
  asset: Asset;
  amount: string;
}
