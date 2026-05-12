// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  app: path.join(repoRoot, 'src', 'App.vue'),
  bootstrap: path.join(repoRoot, 'src', 'app', 'bootstrap', 'index.ts'),
  currencyService: path.join(repoRoot, 'src', 'services', 'currency', 'index.ts'),
  referralsAdapter: path.join(repoRoot, 'src', 'adapters', 'wallet', 'referrals.ts'),
  supplyQuery: path.join(repoRoot, 'src', 'indexer', 'queries', 'asset', 'supply.ts'),
  pointSystem: path.join(repoRoot, 'src', 'consts', 'pointSystem.ts'),
  internalConnect: path.join(repoRoot, 'src', 'composables', 'useInternalConnect.ts'),
  moonpayBridge: path.join(repoRoot, 'src', 'composables', 'useMoonpayBridge.ts'),
  transaction: path.join(repoRoot, 'src', 'composables', 'useTransaction.ts'),
  walletPlugin: path.join(repoRoot, 'src', 'plugins', 'wallet.ts'),
  telegram: path.join(repoRoot, 'src', 'utils', 'telegram.ts'),
  ethBridge: path.join(repoRoot, 'src', 'utils', 'bridge', 'eth', 'index.ts'),
  evmBridge: path.join(repoRoot, 'src', 'utils', 'bridge', 'evm', 'index.ts'),
  subBridge: path.join(repoRoot, 'src', 'utils', 'bridge', 'sub', 'index.ts'),
  globalStyles: path.join(repoRoot, 'src', 'styles', 'index.ts'),
} as const;

const mainFile = path.join(repoRoot, 'src', 'main.ts');

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('app-level store migration', () => {
  it('keeps app shell helpers off direct root-store imports', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('import store from');
    }
  });

  it('routes active runtime access through Pinia facades instead of app-store helpers', async () => {
    const [
      appSource,
      bootstrapSource,
      currencyServiceSource,
      referralsAdapterSource,
      supplyQuerySource,
      pointSystemSource,
      internalConnectSource,
      moonpayBridgeSource,
      transactionSource,
      walletPluginSource,
      telegramSource,
      ethBridgeSource,
      evmBridgeSource,
      subBridgeSource,
      globalStylesSource,
    ] = await Promise.all(Object.values(files).map(readSource));

    expect(appSource).not.toContain("from '@/utils/app-store'");
    expect(appSource).toContain("from '@/app/shell/AppShell.vue'");
    expect(appSource).not.toContain("from '@/stores/");
    expect(appSource).not.toContain("from '@/shims/");
    expect(appSource).not.toContain("from '@/lib/soraneo-wallet/src/api'");
    expect(appSource).not.toContain("from '@/lib/soraneo-wallet/src/bootstrap'");
    expect(appSource).not.toContain("from '@/lib/soraneo-wallet/src/services/alerts'");
    expect(appSource).not.toContain("from '@tests/stubs/walletRuntime'");
    expect(appSource).not.toContain('./store/settings/types');
    expect(appSource).not.toContain('./store/web3/types');
    expect(bootstrapSource).not.toContain("from '@/plugins/pinia'");
    expect(bootstrapSource).toContain("piniaModulePromise ??= import('@/plugins/pinia');");
    expect(bootstrapSource).toContain("from '@/plugins'");
    expect(bootstrapSource).not.toContain("from '@/lang'");
    expect(bootstrapSource).toContain("langModulePromise ??= import('@/lang');");
    expect(bootstrapSource).not.toContain("from '@/app/router'");
    expect(bootstrapSource).toContain("routerModulePromise ??= import('@/app/router');");
    expect(bootstrapSource).toContain("appShellModulePromise ??= import('@/app/shell/AppShell.vue');");
    expect(bootstrapSource).toContain('const AppShell = createAsyncComponent(loadAppShell);');
    expect(bootstrapSource).toContain('setI18nLocale(getLocale() as any)');
    expect(bootstrapSource).not.toContain("import AppShell from '@/app/shell/AppShell.vue';");
    expect(bootstrapSource).not.toContain("from '@/utils/app-store'");
    expect(bootstrapSource).not.toContain("from '@/lib/soraneo-wallet/src/api'");
    expect(bootstrapSource).not.toContain("from '@/lib/soraneo-wallet/src/bootstrap'");
    expect(bootstrapSource).not.toContain("from '@/lib/soraneo-wallet/src/services/alerts'");
    expect(bootstrapSource).not.toContain("from '@tests/stubs/walletRuntime'");
    expect(currencyServiceSource).toContain("from '@/stores/settings'");
    expect(currencyServiceSource).not.toContain("from '@/utils/app-store'");
    expect(referralsAdapterSource).toContain("from '@/stores/referrals'");
    expect(referralsAdapterSource).not.toContain("from '@/utils/app-store'");
    expect(supplyQuerySource).toContain("from '@/stores/settings'");
    expect(supplyQuerySource).not.toContain("from '@/utils/app-store'");
    expect(pointSystemSource).toContain("from '@/stores/assets'");
    expect(pointSystemSource).not.toContain("from '@/utils/app-store'");
    expect(internalConnectSource).toContain("from '@/stores/web3'");
    expect(internalConnectSource).toContain("from '@/stores/wallet'");
    expect(moonpayBridgeSource).toContain("from '@/stores/moonpay'");
    expect(moonpayBridgeSource).toContain("from '@/stores/web3'");
    expect(moonpayBridgeSource).not.toContain("from '@/store/moonpay/types'");
    expect(transactionSource).toContain("from '@/stores/wallet'");
    expect(transactionSource).not.toContain("from '@/utils/app-store'");
    expect(walletPluginSource).not.toContain("from '@/utils/app-store'");
    expect(walletPluginSource).not.toContain("from '@/stores/wallet/compat'");
    expect(walletPluginSource).not.toContain('isWalletStoreLike');
    expect(walletPluginSource).not.toContain('createWalletCompatAdapter');
    expect(walletPluginSource).not.toContain('@/lib/soraneo-wallet/lib/soraneo-wallet-web.css');
    expect(globalStylesSource).not.toContain('@/lib/soraneo-wallet/lib/soraneo-wallet-web.css');
    expect(telegramSource).toContain("from '@/stores/settings'");
    expect(telegramSource).toContain("from '@/stores/wallet'");
    expect(telegramSource).toContain("from '@/stores/referrals'");
    expect(telegramSource).not.toContain("from '@/utils/app-store'");
    expect(ethBridgeSource).toContain("from '@/stores/bridge'");
    expect(ethBridgeSource).not.toContain("from '@/utils/app-store'");
    expect(evmBridgeSource).toContain("from '@/stores/bridge'");
    expect(evmBridgeSource).not.toContain("from '@/utils/app-store'");
    expect(subBridgeSource).toContain("from '@/stores/bridge'");
    expect(subBridgeSource).not.toContain("from '@/utils/app-store'");
  });

  it('keeps the app bootstrap routed through the app-owned bootstrap module', async () => {
    const [mainSource, bootstrapSource] = await Promise.all([readSource(mainFile), readSource(files.bootstrap)]);

    expect(mainSource).not.toContain("import store from './store'");
    expect(mainSource).not.toContain('app.use(store.original)');
    expect(mainSource).not.toContain('store: store.original');
    expect(mainSource).toContain("from '@/app/bootstrap'");
    expect(mainSource).toContain('void mountApp()');
    expect(mainSource).not.toContain('await router.isReady()');
    expect(bootstrapSource).toContain('installStartupPlugins()');
    expect(bootstrapSource).toContain('installRuntimePlugins(app, { pinia })');
    expect(bootstrapSource).toContain('void router.isReady().catch(');
  });
});
