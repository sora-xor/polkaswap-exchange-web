import { createApp, type App as VueApp } from 'vue';

import pinia from '@/plugins/pinia';
import i18n from '@/lang';
import installPlugins from '@/plugins';
import { shouldRenderOfflineShell } from '@/utils/env';
import { renderOfflineShell } from '@/utils/offlineShell';
import { registerW3mMessageGuard } from '@/security/w3mMessageGuard';
import { APP_BUILD_VARIANT, registerPilotFeedbackBridge, registerTelemetryStub, trackEvent } from '@/utils/telemetry';
import { installConsoleWarningFilter } from '@/utils/consoleWarnings';
import { installVueErrorHandler } from '@/utils/vueErrorHandler';

import AppShell from '@/app/shell/AppShell.vue';
import router from '@/app/router';

/**
 * Creates the app instance with the app-owned shell and global providers.
 */
export function bootstrapApp(): VueApp {
  const app = createApp(AppShell);

  installVueErrorHandler(app);
  app.use(pinia);
  app.use(router);
  app.use(i18n);

  installPlugins(app, { pinia });

  return app;
}

/**
 * Mounts the statically-hosted application while preserving offline-shell,
 * telemetry, and IPFS-specific startup behavior.
 */
export function mountApp(): void {
  registerW3mMessageGuard();
  installConsoleWarningFilter();

  const buildVariant = APP_BUILD_VARIANT;

  if (typeof window !== 'undefined') {
    registerTelemetryStub(window.location?.search);
    registerPilotFeedbackBridge();
    window.__PS_BUILD_VARIANT__ = buildVariant;
    if (window.location?.search?.includes('ipfs-check')) {
      window.__PS_IPFS_CHECK__ = true;
    }
  }

  trackEvent('build_variant_selected', {
    variant: buildVariant,
    environment: import.meta.env.MODE,
    timestamp: Date.now(),
  });

  if (shouldRenderOfflineShell()) {
    const rendered = renderOfflineShell();

    if (rendered) {
      console.warn('[OfflineShell] active');
    } else {
      console.warn('[OfflineShell] skipped: #app container missing');
    }
    return;
  }

  try {
    const app = bootstrapApp();
    app.mount('#app');
    void router.isReady().catch((error) => {
      console.error('[bootstrap] Failed during router readiness', error);
    });
  } catch (error) {
    console.error('[bootstrap] Failed to mount application', error);
  }
}
