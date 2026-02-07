import { createApp, type App as VueApp } from 'vue';

import '@/compat/runtime-helpers';
import { installCompatWarningHandler } from '@/plugins/compatWarnings';
import pinia from '@/plugins/pinia';
import store from './store';
import App from './App.vue';
import i18n from './lang';
import installPlugins from './plugins';
import router from './router';
import { isHeadlessOrOfflineEnv } from '@/utils/env';
import { renderOfflineShell } from '@/utils/offlineShell';
import { registerPilotFeedbackBridge, registerTelemetryStub, trackEvent } from '@/utils/telemetry';

import './store/decorators';
import './styles';

async function bootstrapApp(): Promise<VueApp> {
  const app = createApp(App);

  installCompatWarningHandler(app);
  app.use(store.original);
  app.use(pinia);
  app.use(router);
  app.use(i18n);

  await installPlugins(app, { pinia });

  return app;
}

const resolveBuildVariant = (): string => {
  if (import.meta.env.VITE_DISABLE_COMPAT === 'true' || import.meta.env.VITE_DISABLE_COMPAT === true) {
    return 'vue3-native';
  }

  return 'compat';
};

const buildVariant = resolveBuildVariant();

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

if (isHeadlessOrOfflineEnv()) {
  const rendered = renderOfflineShell();

  if (rendered) {
    console.warn('[OfflineShell] active');
  } else {
    console.warn('[OfflineShell] skipped: #app container missing');
  }
} else {
  bootstrapApp()
    .then((app) => {
      app.mount('#app');
    })
    .catch((error) => {
      console.error('[bootstrap] Failed to mount application', error);
    });
}
