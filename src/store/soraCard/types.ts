import type { Subscription } from 'rxjs';
import { FPNumber } from '@sora-substrate/util';
import { CardIssueStatus } from '@/types/card';

export type SoraCardState = {
  userKycStatus: CardIssueStatus | undefined;
  euroBalance: string;
  totalXorBalance: FPNumber;
  xorToDeposit: FPNumber;
  totalXorBalanceUpdates: Nullable<Subscription>;
};
