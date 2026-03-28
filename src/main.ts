import { createApp, type App as VueApp } from 'vue';

import pinia from '@/plugins/pinia';
import App from './App.vue';
import i18n from './lang';
import installPlugins from './plugins';
import router from './router';
import { shouldRenderOfflineShell } from '@/utils/env';
import { renderOfflineShell } from '@/utils/offlineShell';
import { registerW3mMessageGuard } from '@/security/w3mMessageGuard';
import { APP_BUILD_VARIANT, registerPilotFeedbackBridge, registerTelemetryStub, trackEvent } from '@/utils/telemetry';
import { installConsoleWarningFilter } from '@/utils/consoleWarnings';
import { installVueErrorHandler } from '@/utils/vueErrorHandler';

import './styles';

registerW3mMessageGuard();
installConsoleWarningFilter();

async function bootstrapApp(): Promise<VueApp> {
  const app = createApp(App);

  installVueErrorHandler(app);
  app.use(pinia);
  app.use(router);
  app.use(i18n);

  await installPlugins(app, { pinia });

  return app;
}

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
} else {
  bootstrapApp()
    .then(async (app) => {
      await router.isReady();
      app.mount('#app');
    })
    .catch((error) => {
      console.error('[bootstrap] Failed to mount application', error);
    });
}
