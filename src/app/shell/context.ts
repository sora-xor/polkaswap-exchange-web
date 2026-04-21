import { inject } from 'vue';

import type { useAppShell } from './useAppShell';

type AppShellContext = ReturnType<typeof useAppShell>;

const APP_SHELL_CONTEXT = Symbol('APP_SHELL_CONTEXT');

export const provideAppShellKey = APP_SHELL_CONTEXT;

/**
 * Accessor for app-shell state shared between the shell layout and overlay layers.
 */
export function useAppShellContext(): AppShellContext {
  const context = inject<AppShellContext>(APP_SHELL_CONTEXT);

  if (!context) {
    throw new Error('App shell context is not available.');
  }

  return context;
}
