import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';

import '@/compat/runtime-helpers';
import App from './App.vue';
import i18n from './lang';
import installPlugins from './plugins';
import router from './router';
import store from './store';
import { isHeadlessOrOfflineEnv } from '@/utils/env';
import { renderOfflineShell } from '@/utils/offlineShell';
import { trackEvent } from '@/utils/telemetry';

import './store/decorators';
import './styles';

function bootstrapApp(): VueApp {
  const app = createApp(App);
  const pinia = createPinia();

  app.use(store.original);
  app.use(pinia);
  app.use(router);
  app.use(i18n);

  installPlugins(app, { pinia });

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
  const app = bootstrapApp();
  app.mount('#app');
}
