import type { Subscription } from 'rxjs';
import { FPNumber } from '@sora-substrate/util';

export type PriceState = {
  price: string | undefined;
  priceReversed: string | undefined;
  euroBalance: string;
  totalXorBalance: FPNumber;
  xorToDeposit: FPNumber;
  totalXorBalanceUpdates: Nullable<Subscription>;
};

export type PricesPayload = Partial<{
  assetAAddress: string;
  assetBAddress: string;
  amountA: string;
  amountB: string;
}>;
