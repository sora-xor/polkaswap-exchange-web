import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils', () => ({
  getCssVariableValue: (variable: string) => `css-${variable}`,
}));

const settingsStoreMock = {
  libraryTheme: undefined as unknown,
};

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

import { useThemePalette } from '@/composables/useThemePalette';

describe('useThemePalette', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    settingsStoreMock.libraryTheme = undefined;
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('returns null palette when the library theme is not ready', () => {
    const { theme } = useThemePalette();

    expect(theme.value).toBeNull();
  });

  it('builds palette values from CSS variables once the theme is ready', () => {
    settingsStoreMock.libraryTheme = {} as never;

    const { theme } = useThemePalette();

    expect(theme.value).not.toBeNull();
    expect(theme.value?.color.theme.accent).toBe('css---s-color-theme-accent');
    expect(theme.value?.shadow.dialog).toBe('css---s-shadow-dialog');
  });
});
