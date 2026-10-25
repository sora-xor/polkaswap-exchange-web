import { resolveDialogVisibilityOnRouteChange } from './policies/resolveDialogVisibilityOnRouteChange';

export type DialogVisibilitySetter = (visible: boolean) => void;

export type DialogVisibilityBinding = {
  readonly isVisible: boolean;
  readonly setVisibility?: DialogVisibilitySetter;
};

const isDialogVisibilitySetter = (value: unknown): value is DialogVisibilitySetter => typeof value === 'function';

/**
 * Applies the app-shell route transition dialog policy and calls the setter only when state changes.
 */
export const syncRouteScopedDialogVisibility = (
  { isVisible, setVisibility }: DialogVisibilityBinding,
  previousFullPath: string | undefined,
  nextFullPath: string | undefined
): boolean => {
  const nextVisibility = resolveDialogVisibilityOnRouteChange(isVisible, previousFullPath, nextFullPath);

  if (nextVisibility === isVisible) {
    return false;
  }

  if (!isDialogVisibilitySetter(setVisibility)) {
    return false;
  }

  setVisibility(nextVisibility);

  return true;
};

/**
 * Closes visible shell dialogs when the responsive layout crosses a breakpoint boundary.
 */
export const closeVisibleDialog = ({ isVisible, setVisibility }: DialogVisibilityBinding): boolean => {
  if (!isVisible) {
    return false;
  }

  if (!isDialogVisibilitySetter(setVisibility)) {
    return false;
  }

  setVisibility(false);

  return true;
};
