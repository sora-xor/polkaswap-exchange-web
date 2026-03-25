import { useReferralsStore } from '@/stores/referrals';

export const persistReferralAddress = (address: string): void => {
  try {
    useReferralsStore().setStorageReferrer(address);
  } catch {
    console.warn('[wallet-adapter] referrals.setStorageReferrer missing');
  }
};
