import { defineGetters } from 'direct-vuex';

import { KycStatus, VerificationStatus } from '@/types/card';

import { SoraCardState } from './types';

import { soraCardGetterContext } from '.';

const getters = defineGetters<SoraCardState>()({
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
    }

    switch (kycStatus) {
      case KycStatus.Completed:
        return VerificationStatus.Pending;
      case KycStatus.Retry:
        return VerificationStatus.Rejected;
      case KycStatus.Rejected:
        return VerificationStatus.Rejected;
      case KycStatus.Started:
        return null;
      case KycStatus.Failed:
        return null;
      default:
        return null;
    }
  },
});

export default getters;
