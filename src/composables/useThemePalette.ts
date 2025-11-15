import { computed } from 'vue';

import { Theme } from '@/consts/theme';
import { useSettingsStore } from '@/stores/settings';
import { getCssVariableValue as css } from '@/utils';

export function createThemePalette() {
  return {
    color: {
      theme: {
        accent: css('--s-color-theme-accent'),
        accentHover: css('--s-color-theme-accent-hover'),
      },
      base: {
        content: {
          primary: css('--s-color-base-content-primary'),
          secondary: css('--s-color-base-content-secondary'),
          tertiary: css('--s-color-base-content-tertiary'),
        },
        border: {
          secondary: css('--s-color-base-border-secondary'),
        },
        onAccent: css('--s-color-base-on-accent'),
      },
      utility: {
        body: css('--s-color-utility-body'),
      },
      status: {
        success: css('--s-color-status-success'),
        error: css('--s-color-status-error'),
        warning: css('--s-color-status-warning'),
        info: css('--s-color-status-info'),
      },
    },
    border: {
      radius: {
        mini: css('--s-border-radius-mini'),
      },
    },
    shadow: {
      dialog: css('--s-shadow-dialog'),
    },
  } as const;
}

export type ThemePalette = ReturnType<typeof createThemePalette> | null;

/**
 * Exposes theme-related palette values sourced from the design system
 * CSS custom properties. The palette updates whenever the wallet
 * library theme getter changes.
 */
export function useThemePalette() {
  const settingsStore = useSettingsStore();
  const libraryTheme = computed(() => settingsStore.libraryTheme as Theme | undefined);

  const theme = computed<ThemePalette>(() => (libraryTheme.value ? createThemePalette() : null));

  return {
    libraryTheme,
    theme,
  };
}

export type ThemePaletteComposable = ReturnType<typeof useThemePalette>;
