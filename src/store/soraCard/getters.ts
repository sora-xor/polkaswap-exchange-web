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
    // CHECKME: carefully check what each status defines.
    const { state } = soraCardGetterContext(args);
    const { kycStatus, verificationStatus } = state;

    if (!kycStatus) return null;
    if (!verificationStatus) return null;
    if (kycStatus === KycStatus.Started) return null;

    if (
      [KycStatus.Completed, KycStatus.Successful].includes(kycStatus) &&
      verificationStatus === VerificationStatus.Pending
    ) {
      return VerificationStatus.Pending;
    }

    if (
      [KycStatus.Completed, KycStatus.Successful].includes(kycStatus) &&
      verificationStatus === VerificationStatus.Accepted
    ) {
      return VerificationStatus.Accepted;
    }

    if ([KycStatus.Failed, KycStatus.Rejected].includes(kycStatus)) {
      return VerificationStatus.Rejected;
    }
  },
});

export default getters;
