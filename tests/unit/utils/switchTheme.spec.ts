import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Theme } from '@/consts/theme';

const switchThemeMocks = vi.hoisted(() => ({
  setThemeMock: vi.fn(),
  updatePipThemeMock: vi.fn(),
  updateThemeMock: vi.fn(),
  listenForThemeChangesMock: vi.fn(),
  removeThemeListenerMock: vi.fn(),
}));

vi.mock('@/plugins/pinia', () => ({
  default: {},
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    setTheme: switchThemeMocks.setThemeMock,
  }),
}));

vi.mock('@/utils', () => ({
  updatePipTheme: switchThemeMocks.updatePipThemeMock,
}));

vi.mock('@/utils/telegram', () => ({
  tmaSdkService: {
    updateTheme: switchThemeMocks.updateThemeMock,
    listenForThemeChanges: switchThemeMocks.listenForThemeChangesMock,
    removeThemeListener: switchThemeMocks.removeThemeListenerMock,
  },
}));

describe('utils/switchTheme', () => {
  beforeEach(() => {
    vi.resetModules();
    switchThemeMocks.setThemeMock.mockReset();
    switchThemeMocks.updatePipThemeMock.mockReset();
    switchThemeMocks.updateThemeMock.mockReset();
    switchThemeMocks.listenForThemeChangesMock.mockReset();
    switchThemeMocks.removeThemeListenerMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('applies the selected theme and updates dependent integrations', async () => {
    const { applyTheme } = await import('@/utils/switchTheme');

    applyTheme(true);
    applyTheme(false);

    expect(switchThemeMocks.setThemeMock).toHaveBeenNthCalledWith(1, Theme.DARK);
    expect(switchThemeMocks.setThemeMock).toHaveBeenNthCalledWith(2, Theme.LIGHT);
    expect(switchThemeMocks.updatePipThemeMock).toHaveBeenCalledTimes(2);
    expect(switchThemeMocks.updateThemeMock).toHaveBeenCalledTimes(2);
  });

  it('registers the system theme listener once and reacts to media query changes', async () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const mediaQuery = {
      matches: true,
      addEventListener,
      removeEventListener,
    };

    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => mediaQuery),
      Telegram: { WebApp: { colorScheme: 'light' } },
    });

    const { detectSystemTheme } = await import('@/utils/switchTheme');

    detectSystemTheme(false);
    detectSystemTheme(false);

    expect(window.matchMedia).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(1);
    expect(switchThemeMocks.setThemeMock).toHaveBeenNthCalledWith(1, Theme.DARK);
    expect(switchThemeMocks.setThemeMock).toHaveBeenNthCalledWith(2, Theme.DARK);

    const themeChangeHandler = addEventListener.mock.calls[0]?.[1] as (event: { matches: boolean }) => void;
    themeChangeHandler({ matches: false });

    expect(switchThemeMocks.setThemeMock).toHaveBeenLastCalledWith(Theme.LIGHT);
  });

  it('uses Telegram theme overrides and removes both browser and TMA listeners', async () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const mediaQuery = {
      matches: false,
      addEventListener,
      removeEventListener,
    };

    vi.stubGlobal('window', {
      matchMedia: vi.fn(() => mediaQuery),
      Telegram: { WebApp: { colorScheme: 'dark' } },
    });

    const { detectSystemTheme, removeThemeListeners } = await import('@/utils/switchTheme');

    detectSystemTheme(true);

    expect(switchThemeMocks.setThemeMock).toHaveBeenNthCalledWith(1, Theme.LIGHT);
    expect(switchThemeMocks.setThemeMock).toHaveBeenNthCalledWith(2, Theme.DARK);
    expect(switchThemeMocks.listenForThemeChangesMock).toHaveBeenCalledTimes(1);

    const telegramThemeHandler = switchThemeMocks.listenForThemeChangesMock.mock.calls[0]?.[0] as (
      isDark: boolean
    ) => void;
    telegramThemeHandler(false);

    expect(switchThemeMocks.setThemeMock).toHaveBeenLastCalledWith(Theme.LIGHT);

    removeThemeListeners(true);

    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(switchThemeMocks.removeThemeListenerMock).toHaveBeenCalledTimes(1);

    detectSystemTheme(false);

    expect(window.matchMedia).toHaveBeenCalledTimes(2);
    expect(addEventListener).toHaveBeenCalledTimes(2);
  });
});
