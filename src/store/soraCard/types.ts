import type { Subscription } from 'rxjs';
import { FPNumber } from '@sora-substrate/util';

export type SoraCardState = {
  euroBalance: string;
  totalXorBalance: FPNumber;
  xorToDeposit: FPNumber;
  totalXorBalanceUpdates: Nullable<Subscription>;
};
