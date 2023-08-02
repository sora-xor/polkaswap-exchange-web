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
    // CHECKME: carefully check what each status defines. // TODO: [CARD] move this logic to backend
    const { state } = soraCardGetterContext(args);
    const { kycStatus, verificationStatus } = state;

    if ([kycStatus, verificationStatus].includes(VerificationStatus.Rejected)) {
      return VerificationStatus.Rejected;
    }

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
  },
});

export default getters;
