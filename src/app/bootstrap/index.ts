import { createApp, type App as VueApp } from 'vue';

import { installRuntimePlugins, installStartupPlugins } from '@/plugins';
import { createAsyncComponent, installViteCssPreloadErrorHandler, loadAsyncImportWithRetry } from '@/shared/ui/async';
import { shouldRenderOfflineShell } from '@/utils/env';
import { renderOfflineShell } from '@/utils/offlineShell';
import { registerW3mMessageGuard } from '@/security/w3mMessageGuard';
import { APP_BUILD_VARIANT, registerPilotFeedbackBridge, registerTelemetryStub, trackEvent } from '@/utils/telemetry';
import { installConsoleWarningFilter } from '@/utils/consoleWarnings';
import { installVueErrorHandler } from '@/utils/vueErrorHandler';
import { updateDocumentTitle } from '@/utils/documentTitle';

type AppShellModule = typeof import('@/app/shell/AppShell.vue');
type AgentTradingModule = typeof import('@/features/agent-trading');
type LangModule = typeof import('@/lang');
type PiniaModule = typeof import('@/plugins/pinia');
type RouterModule = typeof import('@/app/router');
type SupportedLocale = Parameters<LangModule['setI18nLocale']>[0];

type PreparedRuntime = {
  router: RouterModule['default'];
};

type AgentInstallStage = 'agent-api' | 'webmcp';

let appShellModulePromise: Promise<AppShellModule> | null = null;
let agentTradingModulePromise: Promise<AgentTradingModule> | null = null;
let langModulePromise: Promise<LangModule> | null = null;
let piniaModulePromise: Promise<PiniaModule> | null = null;
let routerModulePromise: Promise<RouterModule> | null = null;

const loadAppShell = (): Promise<AppShellModule> => {
  appShellModulePromise ??= loadAsyncImportWithRetry(() => import('@/app/shell/AppShell.vue'));
  return appShellModulePromise;
};

const loadAgentTrading = (): Promise<AgentTradingModule> => {
  agentTradingModulePromise ??= loadAsyncImportWithRetry(() => import('@/features/agent-trading'));
  return agentTradingModulePromise;
};

const loadLang = (): Promise<LangModule> => {
  langModulePromise ??= loadAsyncImportWithRetry(() => import('@/lang'));
  return langModulePromise;
};

const loadPinia = (): Promise<PiniaModule> => {
  piniaModulePromise ??= loadAsyncImportWithRetry(() => import('@/plugins/pinia'));
  return piniaModulePromise;
};

const loadRouter = (): Promise<RouterModule> => {
  routerModulePromise ??= loadAsyncImportWithRetry(() => import('@/app/router'));
  return routerModulePromise;
};

const AppShell = createAsyncComponent(loadAppShell);

/**
 * Publishes a stable, non-sensitive bootstrap failure for same-origin agent
 * diagnostics without exposing the caught error or runtime configuration.
 */
function emitAgentInstallFailure(stage: AgentInstallStage): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('polkaswap-agent-install-failed', {
      detail: {
        stage,
        code: stage === 'webmcp' ? 'WEBMCP_INSTALL_FAILED' : 'AGENT_API_INSTALL_FAILED',
      },
    })
  );
}

/**
 * Creates the app instance with the app-owned shell and global providers.
 */
export function bootstrapApp(): VueApp {
  const app = createApp(AppShell);

  installVueErrorHandler(app);
  installStartupPlugins();

  return app;
}

/**
 * Loads runtime-only plugins and the app shell chunk after the tiny bootstrap
 * entry is already executing, keeping global UI and wallet code out of entry.
 */
export async function prepareAppRuntime(app: VueApp): Promise<PreparedRuntime> {
  const [{ default: pinia }, { default: router }, { default: i18n, getLocale, setI18nLocale }] = await Promise.all([
    loadPinia(),
    loadRouter(),
    loadLang(),
  ]);

  app.use(pinia);
  app.use(router);
  app.use(i18n);

  await Promise.all([
    installRuntimePlugins(app, { pinia }),
    loadAppShell(),
    setI18nLocale(getLocale() as SupportedLocale),
  ]);
  try {
    const { installPolkaswapAgentApi, registerPolkaswapWebMcpTools } = await loadAgentTrading();
    const agent = installPolkaswapAgentApi({ pinia });
    void registerPolkaswapWebMcpTools(agent).catch((error) => {
      emitAgentInstallFailure('webmcp');
      console.warn('[bootstrap] Polkaswap WebMCP install skipped', error);
    });
  } catch (error) {
    emitAgentInstallFailure('agent-api');
    console.warn('[bootstrap] Polkaswap agent API install skipped', error);
  }
  await updateDocumentTitle();

  return { router };
}

/**
 * Mounts the statically-hosted application while preserving offline-shell,
 * telemetry, and IPFS-specific startup behavior.
 */
export async function mountApp(): Promise<void> {
  registerW3mMessageGuard();
  installConsoleWarningFilter();
  installViteCssPreloadErrorHandler();

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
    const { router } = await prepareAppRuntime(app);
    app.mount('#app');
    void router
      .isReady()
      .then(() => updateDocumentTitle())
      .catch((error) => {
        console.error('[bootstrap] Failed during router readiness', error);
      });
  } catch (error) {
    console.error('[bootstrap] Failed to mount application', error);
  }
}
