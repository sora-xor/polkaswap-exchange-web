import { FPNumber } from '@sora-substrate/util';

import { KycStatus, VerificationStatus, UserInfo, AttemptCounter, Fees } from '@/types/card';

import type { Subscription } from 'rxjs';

export type SoraCardState = {
  kycStatus: Nullable<KycStatus>;
  verificationStatus: Nullable<VerificationStatus>;
  euroBalance: string;
  wasEuroBalanceLoaded: boolean;
  totalXorBalance: FPNumber;
  xorToDeposit: FPNumber;
  totalXorBalanceUpdates: Nullable<Subscription>;
  authLogin: any;
  wantsToPassKycAgain: boolean;
  rejectReason: Nullable<string>;
  userInfo: UserInfo;
  attemptCounter: AttemptCounter;
  fees: Fees;
};
