import { PageNames } from '@/consts';
import { resolveAuthRedirect, resolveInvitationDecision, shouldResetBridgeHistory } from '@/router/guards/decisions';

import type { Nullable } from '@/types/common';
import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';

interface RouteTrackerParams {
  prev: Nullable<PageNames>;
  current: PageNames;
}

export interface NavigationGuardServices {
  routerStore: {
    setRoute: (params: RouteTrackerParams) => void;
  };
  walletStore: {
    isLoggedIn: boolean;
  };
  bridgeHistoryStore: {
    resetHistoryPage: () => void;
  };
  syncRoute: (params: RouteTrackerParams) => void;
  persistReferral: (address: string) => void;
  validateAddress: (address?: Nullable<string>) => boolean;
  updateDocumentTitle: (to: RouteLocationNormalized) => void;
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
  return (to, from, next) => {
    const prev = normalizeRouteName(from.name);
    const current = normalizeRouteName(to.name);
    const isInvitationRoute = hasMetaFlag(to, 'isInvitationRoute');
    const requiresAuth = hasMetaFlag(to, 'requiresAuth');

    const setRoute = (name: PageNames, shouldNavigate = true) => {
      const params = { prev, current: name };
      services.routerStore.setRoute(params);
      services.syncRoute(params);
      if (shouldNavigate) {
        next({ name });
      } else {
        next();
      }
      services.updateDocumentTitle(to);
    };

    if (!current) {
      setRoute(PageNames.Swap, true);
      return;
    }

    if (shouldResetBridgeHistory(prev, current)) {
      services.bridgeHistoryStore.resetHistoryPage();
    }

    const invitationDecision = resolveInvitationDecision({
      isInvitationRoute,
      referrerParam: to.params.referrerAddress,
      isLoggedIn: services.walletStore.isLoggedIn,
      validateAddress: services.validateAddress,
    });

    if (invitationDecision.persistReferral) {
      services.persistReferral(invitationDecision.persistReferral);
    }

    if (invitationDecision.redirect) {
      setRoute(invitationDecision.redirect.name, invitationDecision.redirect.callNext);
      return;
    }

    const authRedirect = resolveAuthRedirect({
      requiresAuth,
      current,
      isLoggedIn: services.walletStore.isLoggedIn,
    });

    if (authRedirect) {
      setRoute(authRedirect.name, authRedirect.callNext);
      return;
    }

    setRoute(current, false);
  };
};
