import storage from '@/utils/storage';
import type { ReferralsState } from './types';

export function initialState(): ReferralsState {
  return {
    referral: '',
    invitedUsers: [],
    invitedUsersSubscription: null,
    amount: '',
    storageReferral: storage.get('storageReferral') || '',
  };
}

const state = initialState();

export default state;
