import { resolveDialogVisibilityOnRouteChange } from './resolveDialogVisibilityOnRouteChange';
import { resolveMenuVisibilityOnBreakpointChange } from './resolveMenuVisibilityOnBreakpointChange';

type VisibilitySetter = ((flag: boolean) => unknown) | undefined;

/**
 * Describes one overlay visibility flag together with its mutation setter.
 */
export interface ScopedDialogVisibilityBinding {
  isVisible: boolean;
  setVisibility: VisibilitySetter;
}

interface Web3DialogVisibilityState {
  soraAccountDialogVisibility?: boolean;
  selectProviderDialogVisibility?: boolean;
  selectNetworkDialogVisibility?: boolean;
  selectSubNodeDialogVisibility?: boolean;
  subAccountDialogVisibility?: boolean;
}

interface SettingsDialogVisibilityState {
  selectNodeDialogVisibility?: boolean;
  selectIndexerDialogVisibility?: boolean;
}

interface DialogVisibilityState {
  web3?: Web3DialogVisibilityState;
  settings?: SettingsDialogVisibilityState;
}

export interface RouteScopedDialogVisibilitySetters {
  setSoraAccountDialogVisibility?: VisibilitySetter;
  setSelectProviderDialogVisibility?: VisibilitySetter;
  setSelectNetworkDialogVisibility?: VisibilitySetter;
  setSelectSubNodeDialogVisibility?: VisibilitySetter;
  setSubAccountDialogVisibility?: VisibilitySetter;
  setSelectNodeDialogVisibility?: VisibilitySetter;
  setSelectIndexerDialogVisibility?: VisibilitySetter;
}

export interface BreakpointScopedDialogVisibilitySetters {
  setSelectNodeDialogVisibility?: VisibilitySetter;
  setSelectIndexerDialogVisibility?: VisibilitySetter;
}

/**
 * Creates route-scoped overlay bindings used for hash-navigation teardown.
 */
export function createRouteScopedDialogBindings(
  state: DialogVisibilityState,
  setters: RouteScopedDialogVisibilitySetters
): ScopedDialogVisibilityBinding[] {
  return [
    {
      isVisible: Boolean(state.web3?.soraAccountDialogVisibility),
      setVisibility: setters.setSoraAccountDialogVisibility,
    },
    {
      isVisible: Boolean(state.web3?.selectProviderDialogVisibility),
      setVisibility: setters.setSelectProviderDialogVisibility,
    },
    {
      isVisible: Boolean(state.web3?.selectNetworkDialogVisibility),
      setVisibility: setters.setSelectNetworkDialogVisibility,
    },
    {
      isVisible: Boolean(state.web3?.selectSubNodeDialogVisibility),
      setVisibility: setters.setSelectSubNodeDialogVisibility,
    },
    {
      isVisible: Boolean(state.web3?.subAccountDialogVisibility),
      setVisibility: setters.setSubAccountDialogVisibility,
    },
    {
      isVisible: Boolean(state.settings?.selectNodeDialogVisibility),
      setVisibility: setters.setSelectNodeDialogVisibility,
    },
    {
      isVisible: Boolean(state.settings?.selectIndexerDialogVisibility),
      setVisibility: setters.setSelectIndexerDialogVisibility,
    },
  ];
}

/**
 * Creates breakpoint-scoped overlay bindings used for responsive-class teardown.
 */
export function createBreakpointScopedDialogBindings(
  state: DialogVisibilityState,
  setters: BreakpointScopedDialogVisibilitySetters
): ScopedDialogVisibilityBinding[] {
  return [
    {
      isVisible: Boolean(state.settings?.selectNodeDialogVisibility),
      setVisibility: setters.setSelectNodeDialogVisibility,
    },
    {
      isVisible: Boolean(state.settings?.selectIndexerDialogVisibility),
      setVisibility: setters.setSelectIndexerDialogVisibility,
    },
  ];
}

/**
 * Closes visible route-scoped overlays when route hashes change.
 */
export function syncRouteScopedDialogVisibility(
  prevPath: string,
  nextPath: string,
  bindings: ScopedDialogVisibilityBinding[]
): void {
  for (const { isVisible, setVisibility } of bindings) {
    const nextVisibility = resolveDialogVisibilityOnRouteChange(isVisible, prevPath, nextPath);
    if (nextVisibility !== isVisible && typeof setVisibility === 'function') {
      setVisibility(nextVisibility);
    }
  }
}

/**
 * Closes visible breakpoint-scoped overlays when breakpoint class changes.
 */
export function syncBreakpointScopedDialogVisibility(
  prevClass: string,
  nextClass: string,
  bindings: ScopedDialogVisibilityBinding[]
): void {
  for (const { isVisible, setVisibility } of bindings) {
    const nextVisibility = resolveMenuVisibilityOnBreakpointChange(isVisible, prevClass, nextClass);
    if (nextVisibility !== isVisible && typeof setVisibility === 'function') {
      setVisibility(nextVisibility);
    }
  }
}
