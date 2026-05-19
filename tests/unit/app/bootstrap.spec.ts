import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const appMocks = vi.hoisted(() => {
  const app = {
    use: vi.fn(),
    mount: vi.fn(),
  };

  return {
    app,
    createApp: vi.fn(() => app),
  };
});

const pluginMocks = vi.hoisted(() => ({
  pinia: { name: 'pinia-plugin' },
  i18n: { name: 'i18n-plugin' },
  getLocale: vi.fn(() => 'en'),
  setI18nLocale: vi.fn(() => Promise.resolve()),
  installRuntimePlugins: vi.fn(() => Promise.resolve()),
  installStartupPlugins: vi.fn(),
}));

const envMocks = vi.hoisted(() => ({
  shouldRenderOfflineShell: vi.fn(() => false),
  renderOfflineShell: vi.fn(() => false),
}));

const agentTradingMocks = vi.hoisted(() => ({
  installPolkaswapAgentApi: vi.fn(),
}));

const securityMocks = vi.hoisted(() => ({
  registerW3mMessageGuard: vi.fn(),
}));

const telemetryMocks = vi.hoisted(() => ({
  APP_BUILD_VARIANT: 'vue3-native',
  registerPilotFeedbackBridge: vi.fn(),
  registerTelemetryStub: vi.fn(),
  trackEvent: vi.fn(),
}));

const consoleFilterMocks = vi.hoisted(() => ({
  installConsoleWarningFilter: vi.fn(),
}));

const errorHandlerMocks = vi.hoisted(() => ({
  installVueErrorHandler: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  router: {
    isReady: vi.fn(() => Promise.resolve()),
  },
}));

const shellMocks = vi.hoisted(() => {
  const AppShell = { name: 'AsyncAppShellStub' };

  return {
    AppShell,
    createAsyncComponent: vi.fn(() => AppShell),
    installViteCssPreloadErrorHandler: vi.fn(),
    loadAsyncImportWithRetry: vi.fn((loader: () => Promise<unknown>) => loader()),
  };
});

vi.mock('vue', () => ({
  createApp: appMocks.createApp,
}));

vi.mock('@/plugins/pinia', () => ({
  default: pluginMocks.pinia,
}));

vi.mock('@/lang', () => ({
  getLocale: pluginMocks.getLocale,
  setI18nLocale: pluginMocks.setI18nLocale,
  default: pluginMocks.i18n,
}));

vi.mock('@/plugins', () => ({
  installRuntimePlugins: pluginMocks.installRuntimePlugins,
  installStartupPlugins: pluginMocks.installStartupPlugins,
}));

vi.mock('@/utils/env', () => ({
  shouldRenderOfflineShell: envMocks.shouldRenderOfflineShell,
}));

vi.mock('@/utils/offlineShell', () => ({
  renderOfflineShell: envMocks.renderOfflineShell,
}));

vi.mock('@/features/agent-trading', () => ({
  installPolkaswapAgentApi: agentTradingMocks.installPolkaswapAgentApi,
}));

vi.mock('@/security/w3mMessageGuard', () => ({
  registerW3mMessageGuard: securityMocks.registerW3mMessageGuard,
}));

vi.mock('@/utils/telemetry', () => ({
  APP_BUILD_VARIANT: telemetryMocks.APP_BUILD_VARIANT,
  registerPilotFeedbackBridge: telemetryMocks.registerPilotFeedbackBridge,
  registerTelemetryStub: telemetryMocks.registerTelemetryStub,
  trackEvent: telemetryMocks.trackEvent,
}));

vi.mock('@/utils/consoleWarnings', () => ({
  installConsoleWarningFilter: consoleFilterMocks.installConsoleWarningFilter,
}));

vi.mock('@/utils/vueErrorHandler', () => ({
  installVueErrorHandler: errorHandlerMocks.installVueErrorHandler,
}));

vi.mock('@/utils/documentTitle', () => ({
  updateDocumentTitle: vi.fn(),
}));

vi.mock('@/shared/ui/async', () => ({
  createAsyncComponent: shellMocks.createAsyncComponent,
  installViteCssPreloadErrorHandler: shellMocks.installViteCssPreloadErrorHandler,
  loadAsyncImportWithRetry: shellMocks.loadAsyncImportWithRetry,
}));

vi.mock('@/app/shell/AppShell.vue', () => ({
  default: shellMocks.AppShell,
}));

vi.mock('@/app/router', () => ({
  default: routerMocks.router,
}));

import { bootstrapApp, mountApp, prepareAppRuntime } from '@/app/bootstrap';

describe('app bootstrap', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();

    appMocks.app.use.mockReturnThis();
    appMocks.createApp.mockReturnValue(appMocks.app);
    envMocks.shouldRenderOfflineShell.mockReturnValue(false);
    envMocks.renderOfflineShell.mockReturnValue(false);
    routerMocks.router.isReady.mockReturnValue(Promise.resolve());

    window.history.replaceState({}, '', '/');
    delete (window as Window & typeof globalThis & { __PS_BUILD_VARIANT__?: string }).__PS_BUILD_VARIANT__;
    delete (window as Window & typeof globalThis & { __PS_IPFS_CHECK__?: boolean }).__PS_IPFS_CHECK__;
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('creates the app shell and installs global providers', () => {
    const app = bootstrapApp();

    expect(app).toBe(appMocks.app);
    expect(appMocks.createApp).toHaveBeenCalledWith(shellMocks.AppShell);
    expect(errorHandlerMocks.installVueErrorHandler).toHaveBeenCalledWith(appMocks.app);
    expect(appMocks.app.use).not.toHaveBeenCalled();
    expect(pluginMocks.installStartupPlugins).toHaveBeenCalledTimes(1);
    expect(pluginMocks.installRuntimePlugins).not.toHaveBeenCalled();
  });

  it('loads runtime plugins and preloads the app shell before mounting', async () => {
    await prepareAppRuntime(appMocks.app as any);

    expect(appMocks.app.use).toHaveBeenCalledWith(pluginMocks.pinia);
    expect(appMocks.app.use).toHaveBeenCalledWith(routerMocks.router);
    expect(appMocks.app.use).toHaveBeenCalledWith(pluginMocks.i18n);
    expect(pluginMocks.installRuntimePlugins).toHaveBeenCalledWith(appMocks.app, { pinia: pluginMocks.pinia });
    expect(pluginMocks.setI18nLocale).toHaveBeenCalledWith('en');
    expect(agentTradingMocks.installPolkaswapAgentApi).toHaveBeenCalledWith({ pinia: pluginMocks.pinia });
  });

  it('renders the offline shell and skips mounting when the runtime is offline', async () => {
    envMocks.shouldRenderOfflineShell.mockReturnValue(true);
    envMocks.renderOfflineShell.mockReturnValue(true);
    window.history.replaceState({}, '', '/?ipfs-check=1');

    await mountApp();

    expect(securityMocks.registerW3mMessageGuard).toHaveBeenCalledTimes(1);
    expect(consoleFilterMocks.installConsoleWarningFilter).toHaveBeenCalledTimes(1);
    expect(shellMocks.installViteCssPreloadErrorHandler).toHaveBeenCalledTimes(1);
    expect(telemetryMocks.registerTelemetryStub).toHaveBeenCalledWith('?ipfs-check=1');
    expect(telemetryMocks.registerPilotFeedbackBridge).toHaveBeenCalledTimes(1);
    expect(telemetryMocks.trackEvent).toHaveBeenCalledWith(
      'build_variant_selected',
      expect.objectContaining({
        variant: telemetryMocks.APP_BUILD_VARIANT,
        environment: expect.any(String),
        timestamp: expect.any(Number),
      })
    );
    expect(window.__PS_BUILD_VARIANT__).toBe(telemetryMocks.APP_BUILD_VARIANT);
    expect(window.__PS_IPFS_CHECK__).toBe(true);
    expect(appMocks.createApp).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[OfflineShell] active');
  });

  it('warns when offline shell rendering is requested but the app container is missing', async () => {
    envMocks.shouldRenderOfflineShell.mockReturnValue(true);
    envMocks.renderOfflineShell.mockReturnValue(false);

    await mountApp();

    expect(appMocks.createApp).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('[OfflineShell] skipped: #app container missing');
  });

  it('mounts the app and reports router readiness failures', async () => {
    const routerError = new Error('router not ready');
    routerMocks.router.isReady.mockReturnValue(Promise.reject(routerError));

    await mountApp();
    await Promise.resolve();
    await Promise.resolve();

    expect(pluginMocks.installRuntimePlugins).toHaveBeenCalledWith(appMocks.app, { pinia: pluginMocks.pinia });
    expect(appMocks.app.mount).toHaveBeenCalledWith('#app');
    expect(errorSpy).toHaveBeenCalledWith('[bootstrap] Failed during router readiness', routerError);
  });

  it('catches app mounting failures', async () => {
    const mountError = new Error('mount failed');
    appMocks.app.mount.mockImplementationOnce(() => {
      throw mountError;
    });

    await mountApp();

    expect(errorSpy).toHaveBeenCalledWith('[bootstrap] Failed to mount application', mountError);
  });
});
