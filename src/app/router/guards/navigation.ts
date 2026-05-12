import { PageNames } from '@/consts/navigation';
import {
  resolveAuthRedirect,
  resolveInvitationDecision,
  resolveReferralActionRedirect,
  shouldResetBridgeHistory,
} from '@/app/router/guards/decisions';
import { consumePendingReferralActionNavigation, isReferralActionPage } from '@/shared/navigation/referralAction';

import type { Nullable } from '@/types/common';
import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';

interface RouteTrackerParams {
  prev: Nullable<PageNames>;
  current: PageNames;
}

export interface NavigationGuardServices {
  setRoute: (params: RouteTrackerParams) => void;
  walletStore?: {
    isLoggedIn: boolean;
  };
  getWalletStore?: () => { isLoggedIn: boolean } | Promise<{ isLoggedIn: boolean }>;
  resetBridgeHistoryPage: () => void | Promise<void>;
  persistReferral: (address: string) => void | Promise<void>;
  validateAddress: (address?: Nullable<string>) => boolean | Promise<boolean>;
  updateDocumentTitle: (to: RouteLocationNormalized) => void | Promise<void>;
}

const hasMetaFlag = (to: RouteLocationNormalized, key: string): boolean => {
  return to.matched.some((record) => Boolean(record.meta?.[key]));
};

const normalizeRouteName = (value: unknown): Nullable<PageNames> => {
  return typeof value === 'string' && value.length > 0 ? (value as PageNames) : null;
};

/**
 * Factory for the global beforeEach guard so navigation logic stays testable and store-agnostic.
 */
export const createBeforeEachGuard = (services: NavigationGuardServices): NavigationGuardWithThis<undefined> => {
  return async (to, from, next) => {
    const prev = normalizeRouteName(from.name);
    const current = normalizeRouteName(to.name);
    const isInvitationRoute = hasMetaFlag(to, 'isInvitationRoute');
    const requiresAuth = hasMetaFlag(to, 'requiresAuth');

    const setRoute = (
      name: PageNames,
      shouldNavigate = true,
      routeParams?: Record<string, string>,
      routePath?: string
    ) => {
      const routeState = { prev, current: name };
      services.setRoute(routeState);
      if (shouldNavigate) {
        if (routePath) {
          next({ path: routePath });
        } else {
          next(routeParams ? { name, params: routeParams } : { name });
        }
      } else {
        next();
      }
      void services.updateDocumentTitle(to);
    };
    let walletAuthStatePromise: Promise<{ isLoggedIn: boolean }> | null = null;
    const getWalletAuthState = async (): Promise<{ isLoggedIn: boolean }> => {
      if (walletAuthStatePromise) return walletAuthStatePromise;

      if (services.walletStore) return services.walletStore;
      if (services.getWalletStore) {
        walletAuthStatePromise = Promise.resolve(services.getWalletStore());
        return walletAuthStatePromise;
      }
      return { isLoggedIn: false };
    };

    if (!current) {
      setRoute(PageNames.Swap, true);
      return;
    }

    if (shouldResetBridgeHistory(prev, current)) {
      await services.resetBridgeHistoryPage();
    }

    const invitationAuthState = isInvitationRoute ? await getWalletAuthState() : { isLoggedIn: false };
    const invitationDecision = await resolveInvitationDecision({
      isInvitationRoute,
      referrerParam: to.params.referrerAddress,
      isLoggedIn: invitationAuthState.isLoggedIn,
      validateAddress: services.validateAddress,
    });

    if (invitationDecision.persistReferral) {
      await services.persistReferral(invitationDecision.persistReferral);
    }

    if (invitationDecision.redirect) {
      setRoute(
        invitationDecision.redirect.name,
        invitationDecision.redirect.callNext,
        invitationDecision.redirect.params,
        invitationDecision.redirect.path
      );
      return;
    }

    const referralActionRedirect = resolveReferralActionRedirect({
      current,
      allowNavigation: isReferralActionPage(current) ? consumePendingReferralActionNavigation(current) : false,
    });

    if (referralActionRedirect) {
      setRoute(
        referralActionRedirect.name,
        referralActionRedirect.callNext,
        referralActionRedirect.params,
        referralActionRedirect.path
      );
      return;
    }

    const authState = requiresAuth ? await getWalletAuthState() : { isLoggedIn: false };
    const authRedirect = resolveAuthRedirect({
      requiresAuth,
      current,
      isLoggedIn: authState.isLoggedIn,
    });

    if (authRedirect) {
      setRoute(authRedirect.name, authRedirect.callNext, authRedirect.params, authRedirect.path);
      return;
    }

    setRoute(current, false);
  };
};
