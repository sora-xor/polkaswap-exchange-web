import { PageNames } from '@/consts';

/**
 * Keeps the first-launch app disclaimer scoped to the swap route until the user accepts it.
 * After acceptance, the current visibility is preserved so manual open/close still works.
 */
export function resolveDisclaimerVisibilityOnRouteChange(
  currentVisibility: boolean,
  userDisclaimerApproved: boolean,
  routeName: unknown
): boolean {
  if (userDisclaimerApproved) {
    return currentVisibility;
  }

  return routeName === PageNames.Swap;
}
