import { PageNames } from '@/consts/navigation';

import type { Nullable } from '@/types/common';

export type ReferralActionPageName = PageNames.ReferralBonding | PageNames.ReferralUnbonding;

const REFERRAL_ACTION_PARAMS: Record<ReferralActionPageName, string> = {
  [PageNames.ReferralBonding]: 'bond',
  [PageNames.ReferralUnbonding]: 'unbond',
};

let pendingReferralActionNavigation: Nullable<ReferralActionPageName> = null;

export const isReferralActionPage = (value: unknown): value is ReferralActionPageName => {
  return value === PageNames.ReferralBonding || value === PageNames.ReferralUnbonding;
};

export const getReferralActionParam = (name: ReferralActionPageName): string => {
  return REFERRAL_ACTION_PARAMS[name];
};

export const markPendingReferralActionNavigation = (name: ReferralActionPageName): void => {
  pendingReferralActionNavigation = name;
};

export const consumePendingReferralActionNavigation = (name: ReferralActionPageName): boolean => {
  const isAllowed = pendingReferralActionNavigation === name;
  pendingReferralActionNavigation = null;
  return isAllowed;
};

export const clearPendingReferralActionNavigation = (): void => {
  pendingReferralActionNavigation = null;
};
