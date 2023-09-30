import { defineGetters } from 'direct-vuex';

import { KycStatus, VerificationStatus } from '@/types/card';

import { SoraCardState } from './types';

import { soraCardGetterContext } from '.';

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
    const { state } = soraCardGetterContext(args);
    const { kycStatus, verificationStatus } = state;

    if (verificationStatus === VerificationStatus.Accepted) {
      return VerificationStatus.Accepted;
    } else if (kycStatus === KycStatus.Completed) {
      return VerificationStatus.Pending;
    } else if (kycStatus === KycStatus.Retry) {
      return VerificationStatus.Rejected;
    } else if (kycStatus === KycStatus.Rejected) {
      return VerificationStatus.Rejected;
    } else if (kycStatus === KycStatus.Started) {
      return null;
    } else if (kycStatus === KycStatus.Failed) {
      return null;
    } else {
      return null;
    }

    // if ([kycStatus, verificationStatus].includes(VerificationStatus.Rejected)) {
    //   return VerificationStatus.Rejected;
    // }

    // if (!kycStatus) return null;
    // if (!verificationStatus) return null;
    // if (kycStatus === KycStatus.Started) return null;

    // if (
    //   [KycStatus.Completed, KycStatus.Successful].includes(kycStatus) &&
    //   verificationStatus === VerificationStatus.Pending
    // ) {
    //   return VerificationStatus.Pending;
    // }

    // if (
    //   [KycStatus.Completed, KycStatus.Successful].includes(kycStatus) &&
    //   verificationStatus === VerificationStatus.Accepted
    // ) {
    //   return VerificationStatus.Accepted;
    // }
  },
});

export default getters;
