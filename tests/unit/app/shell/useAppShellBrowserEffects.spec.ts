import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { createAppShellBrowserEffects } from '@/app/shell/useAppShellBrowserEffects';

describe('createAppShellBrowserEffects', () => {
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
});
