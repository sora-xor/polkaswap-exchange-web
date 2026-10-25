import { describe, expect, it, vi } from 'vitest';

import {
  createBreakpointScopedDialogBindings,
  createRouteScopedDialogBindings,
  syncBreakpointScopedDialogVisibility,
  syncRouteScopedDialogVisibility,
} from '@/views/utils/syncScopedDialogVisibility';

describe('createRouteScopedDialogBindings', () => {
  it('maps route-scoped web3 and footer settings dialog state to setters', () => {
    const setSoraAccountDialogVisibility = vi.fn();
    const setSelectProviderDialogVisibility = vi.fn();
    const setSelectNetworkDialogVisibility = vi.fn();
    const setSelectSubNodeDialogVisibility = vi.fn();
    const setSubAccountDialogVisibility = vi.fn();
    const setSelectNodeDialogVisibility = vi.fn();
    const setSelectIndexerDialogVisibility = vi.fn();

    const bindings = createRouteScopedDialogBindings(
      {
        web3: {
          soraAccountDialogVisibility: true,
          selectProviderDialogVisibility: false,
          selectNetworkDialogVisibility: true,
          selectSubNodeDialogVisibility: false,
          subAccountDialogVisibility: true,
        },
        settings: {
          selectNodeDialogVisibility: true,
          selectIndexerDialogVisibility: false,
        },
      },
      {
        setSoraAccountDialogVisibility,
        setSelectProviderDialogVisibility,
        setSelectNetworkDialogVisibility,
        setSelectSubNodeDialogVisibility,
        setSubAccountDialogVisibility,
        setSelectNodeDialogVisibility,
        setSelectIndexerDialogVisibility,
      }
    );

    expect(bindings).toEqual([
      { isVisible: true, setVisibility: setSoraAccountDialogVisibility },
      { isVisible: false, setVisibility: setSelectProviderDialogVisibility },
      { isVisible: true, setVisibility: setSelectNetworkDialogVisibility },
      { isVisible: false, setVisibility: setSelectSubNodeDialogVisibility },
      { isVisible: true, setVisibility: setSubAccountDialogVisibility },
      { isVisible: true, setVisibility: setSelectNodeDialogVisibility },
      { isVisible: false, setVisibility: setSelectIndexerDialogVisibility },
    ]);
  });

  it('defaults missing route-scoped visibility values to false', () => {
    const bindings = createRouteScopedDialogBindings({}, {});

    expect(bindings).toHaveLength(7);
    expect(bindings.every((binding) => binding.isVisible === false)).toBe(true);
  });
});

describe('createBreakpointScopedDialogBindings', () => {
  it('maps footer dialog state to breakpoint-scoped setters', () => {
    const setSelectNodeDialogVisibility = vi.fn();
    const setSelectIndexerDialogVisibility = vi.fn();

    const bindings = createBreakpointScopedDialogBindings(
      {
        settings: {
          selectNodeDialogVisibility: true,
          selectIndexerDialogVisibility: false,
        },
      },
      {
        setSelectNodeDialogVisibility,
        setSelectIndexerDialogVisibility,
      }
    );

    expect(bindings).toEqual([
      { isVisible: true, setVisibility: setSelectNodeDialogVisibility },
      { isVisible: false, setVisibility: setSelectIndexerDialogVisibility },
    ]);
  });

  it('defaults missing breakpoint-scoped visibility values to false', () => {
    const bindings = createBreakpointScopedDialogBindings({}, {});

    expect(bindings).toEqual([
      { isVisible: false, setVisibility: undefined },
      { isVisible: false, setVisibility: undefined },
    ]);
  });
});

describe('syncRouteScopedDialogVisibility', () => {
  it('closes only visible dialogs when route changes', () => {
    const closeVisible = vi.fn();
    const keepHidden = vi.fn();

    syncRouteScopedDialogVisibility('/swap', '/bridge', [
      { isVisible: true, setVisibility: closeVisible },
      { isVisible: false, setVisibility: keepHidden },
    ]);

    expect(closeVisible).toHaveBeenCalledTimes(1);
    expect(closeVisible).toHaveBeenCalledWith(false);
    expect(keepHidden).not.toHaveBeenCalled();
  });

  it('does not call setters when route does not change', () => {
    const setter = vi.fn();

    syncRouteScopedDialogVisibility('/swap', '/swap', [{ isVisible: true, setVisibility: setter }]);

    expect(setter).not.toHaveBeenCalled();
  });

  it('ignores non-function setters', () => {
    expect(() => {
      syncRouteScopedDialogVisibility('/swap', '/bridge', [{ isVisible: true, setVisibility: undefined }]);
    }).not.toThrow();
  });
});

describe('syncBreakpointScopedDialogVisibility', () => {
  it('closes visible dialogs on breakpoint changes', () => {
    const setNodeDialogVisibility = vi.fn();
    const setIndexerDialogVisibility = vi.fn();

    syncBreakpointScopedDialogVisibility('mobile', 'desktop', [
      { isVisible: true, setVisibility: setNodeDialogVisibility },
      { isVisible: true, setVisibility: setIndexerDialogVisibility },
    ]);

    expect(setNodeDialogVisibility).toHaveBeenCalledTimes(1);
    expect(setNodeDialogVisibility).toHaveBeenCalledWith(false);
    expect(setIndexerDialogVisibility).toHaveBeenCalledTimes(1);
    expect(setIndexerDialogVisibility).toHaveBeenCalledWith(false);
  });

  it('does not call setters when breakpoint class does not change', () => {
    const setter = vi.fn();

    syncBreakpointScopedDialogVisibility('mobile', 'mobile', [{ isVisible: true, setVisibility: setter }]);

    expect(setter).not.toHaveBeenCalled();
  });
});
