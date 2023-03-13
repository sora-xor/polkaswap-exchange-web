import { KycStatus, VerificationStatus } from '@/types/card';
import { defineGetters } from 'direct-vuex';
import { soraCardGetterContext } from '.';

import { SoraCardState } from './types';

const getters = defineGetters<SoraCardState>()({
  accountAddress(...args): string {
    const { rootState } = soraCardGetterContext(args);
    return rootState.wallet.account.address;
  },
  isEuroBalanceEnough(...args): boolean {
    const { state } = soraCardGetterContext(args);
    const euroBalance = parseInt(state.euroBalance, 10);
    return euroBalance >= 95;
  },
  currentStatus(...args): Nullable<VerificationStatus> {
    // CHECKME: carefully check what each status defines. // TODO: [Tech] move this logic to backend
    const { state } = soraCardGetterContext(args);
    const { kycStatus, verificationStatus } = state;

    if (!kycStatus) return null;
    if (!verificationStatus) return null;
    if (kycStatus === KycStatus.Started) return null; // KYC was initiated

    // KycStatus.Completed means data was uploaded and verification started
    // KycStatus.Completed always implies VerificationStatus.Pending
    // KycStatus.Successful is final, it is not possible to have KycStatus.Successful and VerificationStatus.Pending
    if (kycStatus === KycStatus.Completed) {
      return VerificationStatus.Pending;
    }

    // VerificationStatus.Accepted is final and implies KycStatus.Successful
    // KycStatus.Completed and VerificationStatus.Accepted impossible
    if (kycStatus === KycStatus.Successful) {
      return VerificationStatus.Accepted;
    }
    
    // Both failed and rejected must be checked
    // failed - aborted by the user
    // rejected - verification failed
    if ([KycStatus.Failed, KycStatus.Rejected].includes(kycStatus)) {
      return VerificationStatus.Rejected;
    }

  },
});

export default getters;
