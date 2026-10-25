import { BridgeChildPages, PageNames } from '@/consts/navigation';
import { getReferralActionParam } from '@/shared/navigation/referralAction';

import type { Nullable } from '@/types/common';

type RedirectDecision = {
  name: PageNames;
  callNext: boolean;
  path?: string;
  params?: Record<string, string>;
};

type InvitationDecision = {
  persistReferral?: string;
  redirect?: RedirectDecision;
};
type MaybePromise<T> = T | Promise<T>;

const normalizeReferrerParam = (value: unknown): Nullable<string> => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }

  return typeof value === 'string' ? value : null;
};

export const shouldResetBridgeHistory = (prev: Nullable<PageNames>, current: PageNames): boolean => {
  return prev !== PageNames.BridgeTransaction && current === PageNames.BridgeTransactionsHistory;
};

export const resolveInvitationDecision = async ({
  isInvitationRoute,
  referrerParam,
  isLoggedIn,
  validateAddress,
}: {
  isInvitationRoute: boolean;
  referrerParam: unknown;
  isLoggedIn: boolean;
  validateAddress: (address?: Nullable<string>) => MaybePromise<boolean>;
}): Promise<InvitationDecision> => {
  if (!isInvitationRoute) {
    return {};
  }

  const address = normalizeReferrerParam(referrerParam);
  const decision: InvitationDecision = {};

  if (await validateAddress(address)) {
    decision.persistReferral = address as string;
  }

  if (isLoggedIn) {
    decision.redirect = {
      name: PageNames.ReferralProgram,
      callNext: false,
    };
  }

  return decision;
};

export const resolveAuthRedirect = ({
  requiresAuth,
  current,
  isLoggedIn,
}: {
  requiresAuth: boolean;
  current: PageNames;
  isLoggedIn: boolean;
}): RedirectDecision | undefined => {
  if (!requiresAuth || isLoggedIn) {
    return undefined;
  }

  const target = BridgeChildPages.includes(current) ? PageNames.Bridge : PageNames.Wallet;

  return {
    name: target,
    callNext: true,
    path: target === PageNames.Bridge ? '/bridge/' : undefined,
  };
};

export const resolveReferralActionRedirect = ({
  current,
  allowNavigation,
}: {
  current: PageNames;
  allowNavigation: boolean;
}): RedirectDecision | undefined => {
  if (allowNavigation) {
    return undefined;
  }

  if (current !== PageNames.ReferralBonding && current !== PageNames.ReferralUnbonding) {
    return undefined;
  }

  return {
    name: PageNames.ReferralProgram,
    callNext: true,
    params: {
      referrerAddress: getReferralActionParam(current),
    },
  };
};
