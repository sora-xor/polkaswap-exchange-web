import storage from '@/utils/storage';

import type { ReferralsState } from './types';

export function initialState(): ReferralsState {
  return {
    referrer: '',
    referrerSubscription: null,
    invitedUsers: [],
    invitedUsersSubscription: null,
    amount: '',
    storageReferrer: storage.get('storageReferral') || '', // storageReferrer
    isReferrerApproved: false,
  };
}

const state = initialState();

export default state;
