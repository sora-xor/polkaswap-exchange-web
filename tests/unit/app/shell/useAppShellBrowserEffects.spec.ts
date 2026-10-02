import { ref } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAppShellBrowserEffects } from '@/app/shell/useAppShellBrowserEffects';

describe('createAppShellBrowserEffects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('wires and tears down browser-global shell listeners', () => {
    const closeMenu = vi.fn();
    const settingsStore = {
      setScreenBreakpointClass: vi.fn(),
      showOrientationWarning: vi.fn(),
      hideOrientationWarning: vi.fn(),
    };
    const showErrorLocalStorageExceed = ref(false);
    const effects = createAppShellBrowserEffects({
      settingsStore,
      showErrorLocalStorageExceed,
      closeMenu,
    });

    effects.subscribeOnScreenSize();
    effects.subscribeOnKeyboard();

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeMenu).toHaveBeenCalledTimes(2);
    expect(settingsStore.setScreenBreakpointClass).toHaveBeenCalledWith(window.innerWidth);

    effects.unsubscribeFromScreenSize();
    effects.unsubscribeFromKeyboard();
    closeMenu.mockClear();

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(closeMenu).not.toHaveBeenCalled();
  });

  it('tracks orientation warning listeners as the viewport enters and leaves mobile', () => {
    vi.stubGlobal('matchMedia', undefined);
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    const settingsStore = {
      setScreenBreakpointClass: vi.fn(),
      showOrientationWarning: vi.fn(),
      hideOrientationWarning: vi.fn(),
    };
    const effects = createAppShellBrowserEffects({
      settingsStore,
      showErrorLocalStorageExceed: ref(false),
      closeMenu: vi.fn(),
    });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    effects.subscribeOnScreenSize();
    effects.subscribeOnScreenOrientation();
    settingsStore.hideOrientationWarning.mockClear();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 480 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 320 });
    window.dispatchEvent(new Event('resize'));
    expect(settingsStore.showOrientationWarning).toHaveBeenCalled();

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    window.dispatchEvent(new Event('resize'));
    expect(settingsStore.hideOrientationWarning).toHaveBeenCalled();

    effects.unsubscribeFromScreenOrientation();
    effects.unsubscribeFromScreenSize();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });

  it('uses viewport orientation despite a landscape physical screen and responds to viewport rotation', () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    const physicalScreen = { orientation: { type: 'landscape-primary', addEventListener: vi.fn() } };
    vi.stubGlobal('screen', physicalScreen);
    const matchMedia = vi.fn(() => ({ matches: window.innerWidth > window.innerHeight }));
    vi.stubGlobal('matchMedia', matchMedia);
    const settingsStore = {
      setScreenBreakpointClass: vi.fn(),
      showOrientationWarning: vi.fn(),
      hideOrientationWarning: vi.fn(),
    };
    const effects = createAppShellBrowserEffects({
      settingsStore,
      showErrorLocalStorageExceed: ref(false),
      closeMenu: vi.fn(),
    });
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
      effects.subscribeOnScreenSize();
      effects.subscribeOnScreenOrientation();
      expect(matchMedia).toHaveBeenCalledWith('(orientation: landscape)');
      expect(settingsStore.showOrientationWarning).not.toHaveBeenCalled();
      expect(settingsStore.hideOrientationWarning).toHaveBeenCalled();
      expect(physicalScreen.orientation.addEventListener).not.toHaveBeenCalled();

      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 320 });
      window.dispatchEvent(new Event('resize'));
      expect(settingsStore.showOrientationWarning).toHaveBeenCalled();

      settingsStore.showOrientationWarning.mockClear();
      settingsStore.hideOrientationWarning.mockClear();
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
      window.dispatchEvent(new Event('resize'));
      expect(settingsStore.showOrientationWarning).not.toHaveBeenCalled();
      expect(settingsStore.hideOrientationWarning).toHaveBeenCalled();

      effects.unsubscribeFromScreenOrientation();
      effects.unsubscribeFromScreenSize();
      settingsStore.hideOrientationWarning.mockClear();
      window.dispatchEvent(new Event('resize'));
      expect(settingsStore.hideOrientationWarning).not.toHaveBeenCalled();
    } finally {
      effects.unsubscribeFromScreenOrientation();
      effects.unsubscribeFromScreenSize();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
    }
  });
});
