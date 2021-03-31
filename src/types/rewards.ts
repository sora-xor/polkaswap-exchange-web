import { KnownSymbols } from '@sora-substrate/util'

export interface RewardsAmountHeaderItem {
  amount: string;
  symbol: KnownSymbols;
}

export interface RewardsAmountTableItem extends RewardsAmountHeaderItem {
  title?: string;
}
