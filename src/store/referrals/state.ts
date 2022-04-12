import storage from '@/utils/storage';
import type { ReferralsState } from './types';

export function initialState(): ReferralsState {
  return {
    referrer: '',
    invitedUsers: [],
    invitedUsersSubscription: null,
    amount: '',
    storageReferrer: storage.get('storageReferral') || '',
  };
}

const state = initialState();

export default state;
