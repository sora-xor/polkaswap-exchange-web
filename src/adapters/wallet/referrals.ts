import { withAppStore } from '@/utils/app-store';

type ReferrerSetter = (address: string) => void;

const getSetter = (): ReferrerSetter | undefined =>
  withAppStore((store) => {
    const setter = store?.commit?.referrals?.setStorageReferrer;

    if (typeof setter === 'function') {
      return setter as ReferrerSetter;
    }

    return undefined;
  });

export const persistReferralAddress = (address: string): void => {
  const setter = getSetter();

  if (!setter) {
    console.warn('[wallet-adapter] referrals.setStorageReferrer missing');
    return;
  }

  setter(address);
};
