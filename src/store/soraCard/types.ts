import type { Subscription } from 'rxjs';
import { FPNumber } from '@sora-substrate/util';
import { KycStatus, VerificationStatus } from '@/types/card';

export type SoraCardState = {
  kycStatus: Nullable<KycStatus>;
  verificationStatus: Nullable<VerificationStatus>;
  euroBalance: string;
  totalXorBalance: FPNumber;
  xorToDeposit: FPNumber;
  totalXorBalanceUpdates: Nullable<Subscription>;
};
