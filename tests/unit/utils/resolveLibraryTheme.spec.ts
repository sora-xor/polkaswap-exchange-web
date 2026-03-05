import { describe, expect, it } from 'vitest';

import { Theme } from '@/consts/theme';
import { resolveLibraryDesignSystem, resolveLibraryTheme } from '@/utils/resolveLibraryTheme';

describe('resolveLibraryTheme', () => {
  it('prefers root libraryTheme getter when available', () => {
    const theme = resolveLibraryTheme({
      getters: {
        libraryTheme: Theme.DARK,
        wallet: { settings: { libraryTheme: Theme.LIGHT } },
      },
      state: {
        wallet: { settings: { theme: Theme.LIGHT } },
      },
    });

    expect(theme).toBe(Theme.DARK);
  });

  it('falls back to wallet/settings getter and then state theme', () => {
    expect(
      resolveLibraryTheme({
        getters: {
          wallet: { settings: { libraryTheme: Theme.DARK } },
        },
      })
    ).toBe(Theme.DARK);

    expect(
      resolveLibraryTheme({
        state: {
          wallet: { settings: { theme: Theme.DARK } },
        },
      })
    ).toBe(Theme.DARK);
  });

  it('defaults to light when no valid theme is available', () => {
    const theme = resolveLibraryTheme({
      getters: { libraryTheme: '' },
      state: { wallet: { settings: { theme: null } } },
    });

    expect(theme).toBe(Theme.LIGHT);
  });
});

describe('resolveLibraryDesignSystem', () => {
  it('uses a valid root design-system getter first', () => {
    const designSystem = resolveLibraryDesignSystem({
      getters: {
        libraryDesignSystem: { theme: Theme.DARK },
      },
    });

    expect(designSystem).toEqual({ theme: Theme.DARK });
  });

  it('falls back to wallet design-system getter', () => {
    const designSystem = resolveLibraryDesignSystem({
      getters: {
        wallet: {
          settings: {
            libraryDesignSystem: { theme: Theme.DARK },
          },
        },
      },
    });

    expect(designSystem).toEqual({ theme: Theme.DARK });
  });

  it('builds design-system payload from resolved theme as final fallback', () => {
    const designSystem = resolveLibraryDesignSystem({
      state: {
        wallet: { settings: { theme: Theme.DARK } },
      },
    });

    expect(designSystem).toEqual({ theme: Theme.DARK });
  });
});
