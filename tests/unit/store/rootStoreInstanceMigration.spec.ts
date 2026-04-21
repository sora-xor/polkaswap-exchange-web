// @vitest-environment node
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  web3Store: path.join(repoRoot, 'src', 'stores', 'web3', 'index.ts'),
} as const;
const removedLegacyStoreRoot = path.join(repoRoot, 'src', 'store');
const removedStoresCompatRoot = path.join(repoRoot, 'src', 'stores', 'compat');
const removedRootStoreBootstrapFile = path.join(repoRoot, 'src', 'store', 'index.ts');
const removedRootStoreInstanceFile = path.join(repoRoot, 'src', 'store', 'instance.ts');
const removedModuleHelpersShimFile = path.join(repoRoot, 'src', 'store', 'module-helpers.ts');
const removedModuleContextShimFile = path.join(repoRoot, 'src', 'store', 'module-context.ts');
const removedVuexCompatShimFile = path.join(repoRoot, 'src', 'store', 'vuex-compat.ts');
const removedDirectVuexShimFile = path.join(repoRoot, 'src', 'store', 'direct-vuex.ts');
const removedStoreContextFile = path.join(repoRoot, 'src', 'store', 'context.ts');
const removedLegacyContextFile = path.join(repoRoot, 'src', 'store', 'legacy-context.ts');
const removedLegacyBridgeFile = path.join(repoRoot, 'src', 'store', 'legacy-bridge.ts');
const removedLegacyRouterStoreFile = path.join(repoRoot, 'src', 'store', 'router', 'index.ts');
const removedLegacyRouterTypesFile = path.join(repoRoot, 'src', 'store', 'router', 'types.ts');
const removedLegacyStoreConstsFile = path.join(repoRoot, 'src', 'store', 'consts.ts');
const removedWalletCompatAdapterFile = path.join(repoRoot, 'src', 'stores', 'wallet', 'compat.ts');
const removedWalletStoreRuntimeFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'runtime.ts');
const removedWalletLegacyModuleFiles = [
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'account', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'account', 'getters.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'account', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'settings', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'settings', 'getters.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'settings', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'transactions', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'transactions', 'getters.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'transactions', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'state.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'types.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'state.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'types.ts'),
] as const;
const bridgeStoreFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'index.ts');
const settingsStoreFile = path.join(repoRoot, 'src', 'stores', 'settings', 'index.ts');
const bridgeHistoryStoreFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'history.ts');
const bridgeFormStoreFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'form.ts');
const bridgeTransactionsStoreFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'transactions.ts');
const bridgeSyncCompatFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'sync.ts');
const subBridgeReducersFile = path.join(repoRoot, 'src', 'utils', 'bridge', 'sub', 'classes', 'reducers.ts');
const web3TypesFile = path.join(repoRoot, 'src', 'stores', 'web3', 'types.ts');
const bridgeAssetsFile = path.join(repoRoot, 'src', 'stores', 'bridge', 'assets.ts');
const routerNavigationAdapterFile = path.join(repoRoot, 'src', 'adapters', 'router', 'navigation.ts');
const removedLegacyReferralsFiles = [
  path.join(repoRoot, 'src', 'store', 'referrals', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'referrals', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'referrals', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'referrals', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'referrals', 'types.ts'),
] as const;
const removedLegacyDashboardFiles = [
  path.join(repoRoot, 'src', 'store', 'dashboard', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'dashboard', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'dashboard', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'dashboard', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'dashboard', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'dashboard', 'types.ts'),
] as const;
const removedLegacyMoonpayFiles = [
  path.join(repoRoot, 'src', 'store', 'moonpay', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'moonpay', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'moonpay', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'moonpay', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'moonpay', 'types.ts'),
] as const;
const removedLegacyAssetsFiles = [
  path.join(repoRoot, 'src', 'store', 'assets', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'assets', 'types.ts'),
] as const;
const removedLegacySettingsFiles = [
  path.join(repoRoot, 'src', 'store', 'settings', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'settings', 'types.ts'),
] as const;
const removedLegacyAddLiquidityFiles = [
  path.join(repoRoot, 'src', 'store', 'addLiquidity', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'addLiquidity', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'addLiquidity', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'addLiquidity', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'addLiquidity', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'addLiquidity', 'types.ts'),
] as const;
const removedLegacyRemoveLiquidityFiles = [
  path.join(repoRoot, 'src', 'store', 'removeLiquidity', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'removeLiquidity', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'removeLiquidity', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'removeLiquidity', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'removeLiquidity', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'removeLiquidity', 'types.ts'),
] as const;
const removedLegacyPoolFiles = [
  path.join(repoRoot, 'src', 'store', 'pool', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'pool', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'pool', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'pool', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'pool', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'pool', 'types.ts'),
] as const;
const removedLegacyDemeterFarmingFiles = [
  path.join(repoRoot, 'src', 'store', 'demeterFarming', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'demeterFarming', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'demeterFarming', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'demeterFarming', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'demeterFarming', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'demeterFarming', 'types.ts'),
] as const;
const removedLegacyOrderBookFiles = [
  path.join(repoRoot, 'src', 'store', 'orderBook', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'orderBook', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'orderBook', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'orderBook', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'orderBook', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'orderBook', 'types.ts'),
] as const;
const removedLegacyStakingFiles = [
  path.join(repoRoot, 'src', 'store', 'staking', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'staking', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'staking', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'staking', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'staking', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'staking', 'types.ts'),
] as const;
const removedLegacyRewardsFiles = [
  path.join(repoRoot, 'src', 'store', 'rewards', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'rewards', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'rewards', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'rewards', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'rewards', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'rewards', 'types.ts'),
] as const;
const removedLegacyVaultFiles = [
  path.join(repoRoot, 'src', 'store', 'vault', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'vault', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'vault', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'vault', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'vault', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'vault', 'types.ts'),
] as const;
const removedLegacyWeb3Files = [
  path.join(repoRoot, 'src', 'store', 'web3', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'web3', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'web3', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'web3', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'web3', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'web3', 'types.ts'),
] as const;
const removedStoresCompatFiles = [
  path.join(repoRoot, 'src', 'stores', 'compat', 'direct-vuex.ts'),
  path.join(repoRoot, 'src', 'stores', 'compat', 'module-context.ts'),
  path.join(repoRoot, 'src', 'stores', 'compat', 'module-helpers.ts'),
  path.join(repoRoot, 'src', 'stores', 'compat', 'vuex-compat.ts'),
] as const;
const liveCompatBoundaryFiles = [
  path.join(repoRoot, 'src', 'stores', 'web3', 'mutations.ts'),
  path.join(repoRoot, 'src', 'utils', 'bridge', 'eth', 'classes', 'history.ts'),
  path.join(repoRoot, 'src', 'utils', 'bridge', 'sub', 'classes', 'history.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'util', 'index.ts'),
] as const;
const runtimeStoreTypeFiles = [
  path.join(repoRoot, 'src', 'stores', 'dashboard', 'index.ts'),
  path.join(repoRoot, 'src', 'stores', 'moonpay', 'index.ts'),
  path.join(repoRoot, 'src', 'stores', 'orderBook', 'index.ts'),
  path.join(repoRoot, 'src', 'stores', 'rewards', 'index.ts'),
  path.join(repoRoot, 'src', 'stores', 'staking', 'index.ts'),
  path.join(repoRoot, 'src', 'stores', 'vault', 'index.ts'),
  path.join(repoRoot, 'src', 'stores', 'web3', 'mutations.ts'),
  path.join(repoRoot, 'src', 'features', 'rewards', 'pages', 'RewardsPage.vue'),
  path.join(repoRoot, 'src', 'composables', 'useMoonpayBridge.ts'),
  path.join(repoRoot, 'src', 'utils', 'bridge', 'eth', 'classes', 'history.ts'),
  path.join(repoRoot, 'src', 'utils', 'bridge', 'sub', 'classes', 'history.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'util', 'index.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'SelectAsset.vue'),
] as const;
const removedBridgeModuleFiles = [
  path.join(repoRoot, 'src', 'store', 'app-store-bridge.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'actions.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'getters.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'index.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'mutations.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'state.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'types.ts'),
  path.join(repoRoot, 'src', 'store', 'bridge', 'utils.ts'),
] as const;

describe('root store instance migration', () => {
  it('removes the legacy root-store bootstrap entrypoint', async () => {
    await expect(stat(removedRootStoreBootstrapFile)).rejects.toBeDefined();
  });

  it('removes the legacy src/store tree from runtime source', async () => {
    await expect(stat(removedLegacyStoreRoot)).rejects.toBeDefined();
  });

  it('removes the dead app-side stores/compat bridge tree from src/', async () => {
    await expect(stat(removedStoresCompatRoot)).rejects.toBeDefined();

    for (const file of removedStoresCompatFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the legacy root-store instance helper from src/', async () => {
    await expect(stat(removedRootStoreInstanceFile)).rejects.toBeDefined();
  });

  it('removes the dead wallet compat adapter and wallet runtime contract files from src/', async () => {
    await expect(stat(removedWalletCompatAdapterFile)).rejects.toBeDefined();
    await expect(stat(removedWalletStoreRuntimeFile)).rejects.toBeDefined();
  });

  it('removes the dead vendored wallet vuex-shaped module files from src/', async () => {
    for (const file of removedWalletLegacyModuleFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the legacy module-helpers shim from src/', async () => {
    await expect(stat(removedModuleHelpersShimFile)).rejects.toBeDefined();
  });

  it('removes the legacy module-context, vuex-compat, and direct-vuex shims from src/', async () => {
    await expect(stat(removedModuleContextShimFile)).rejects.toBeDefined();
    await expect(stat(removedVuexCompatShimFile)).rejects.toBeDefined();
    await expect(stat(removedDirectVuexShimFile)).rejects.toBeDefined();
  });

  it('removes the remaining store context and legacy bridge facades from src/', async () => {
    await expect(stat(removedStoreContextFile)).rejects.toBeDefined();
    await expect(stat(removedLegacyContextFile)).rejects.toBeDefined();
    await expect(stat(removedLegacyBridgeFile)).rejects.toBeDefined();
  });

  it('removes the dead legacy router store re-export files from src/', async () => {
    await expect(stat(removedLegacyRouterStoreFile)).rejects.toBeDefined();
    await expect(stat(removedLegacyRouterTypesFile)).rejects.toBeDefined();
  });

  it('removes the dead legacy referrals store module from src/', async () => {
    for (const file of removedLegacyReferralsFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy dashboard store module from src/', async () => {
    for (const file of removedLegacyDashboardFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy moonpay store module from src/', async () => {
    for (const file of removedLegacyMoonpayFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy assets store facade from src/', async () => {
    for (const file of removedLegacyAssetsFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy settings store facade from src/', async () => {
    for (const file of removedLegacySettingsFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy add-liquidity store module from src/', async () => {
    for (const file of removedLegacyAddLiquidityFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy remove-liquidity store module from src/', async () => {
    for (const file of removedLegacyRemoveLiquidityFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy pool store module from src/', async () => {
    for (const file of removedLegacyPoolFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy demeter-farming store module from src/', async () => {
    for (const file of removedLegacyDemeterFarmingFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy order-book store module from src/', async () => {
    for (const file of removedLegacyOrderBookFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy staking store module from src/', async () => {
    for (const file of removedLegacyStakingFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the final legacy rewards store module from src/', async () => {
    for (const file of removedLegacyRewardsFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the final legacy vault store module from src/', async () => {
    for (const file of removedLegacyVaultFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the final legacy web3 store module from src/', async () => {
    for (const file of removedLegacyWeb3Files) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead legacy store consts enum from src/', async () => {
    await expect(stat(removedLegacyStoreConstsFile)).rejects.toBeDefined();
  });

  it('keeps the web3 Pinia facade off direct root-store read helpers', async () => {
    const source = await readFile(files.web3Store, 'utf8');

    expect(source).not.toContain("from '@/store/instance'");
    expect(source).not.toContain('accessRootStore(');
    expect(source).not.toContain('getRootStore(');
    expect(source).not.toContain('runRootCommit(');
    expect(source).not.toContain('runRootDispatch(');
    expect(source).not.toContain('syncFromLegacyStore(');
    expect(source).not.toContain('subscribe((mutation');
    expect(source).not.toContain("mutation.type.startsWith('web3/')");
    expect(source).not.toContain('store.state.web3');
    expect(source).not.toContain('store.getters.web3');
  });

  it('keeps runtime-facing store state and type imports on src/stores/** shims', async () => {
    const [web3StoreSource, web3TypesSource, ...otherSources] = await Promise.all([
      readFile(files.web3Store, 'utf8'),
      readFile(web3TypesFile, 'utf8'),
      ...runtimeStoreTypeFiles.map((file) => readFile(file, 'utf8')),
    ]);

    expect(web3StoreSource).toContain("from '@/stores/web3/types'");
    expect(web3StoreSource).toContain("from '@/stores/web3/state'");
    expect(web3StoreSource).toContain("from '@/stores/web3/mutations'");
    expect(web3StoreSource).not.toContain("from '@/store/web3/types'");
    expect(web3StoreSource).not.toContain("from '@/store/web3/state'");
    expect(web3StoreSource).not.toContain("from '@/store/web3/mutations'");
    expect(web3TypesSource).not.toContain("from '@/store/");

    for (const source of otherSources) {
      expect(source).not.toContain("from '@/store/");
      expect(source).not.toContain('store/direct-vuex');
      expect(source).not.toContain("from '@/store/rewards/types'");
      expect(source).not.toContain("from '@/store/rewards/state'");
      expect(source).not.toContain("from '@/store/orderBook/types'");
      expect(source).not.toContain("from '@/store/moonpay/types'");
      expect(source).not.toContain("from '@/store/staking/types'");
      expect(source).not.toContain("from '@/store/vault/types'");
      expect(source).not.toContain("from '@/store/dashboard/types'");
      expect(source).not.toContain("from '@/store/module-helpers'");
      expect(source).not.toContain("from '@/store/module-context'");
      expect(source).not.toContain("from '@/store/vuex-compat'");
      expect(source).not.toContain("from '@/store/router/types'");
    }
  });

  it('keeps live runtime files off direct stores-compat imports outside the compat layer', async () => {
    const sources = await Promise.all(liveCompatBoundaryFiles.map((file) => readFile(file, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain("from '@/stores/compat/");
      expect(source).not.toContain('defineMutations(');
    }
  });

  it('keeps the bridge Pinia facade off direct root-store read helpers', async () => {
    const source = await readFile(bridgeStoreFile, 'utf8');

    expect(source).not.toContain('accessRootStore(');
    expect(source).not.toContain('getRootStore(');
    expect(source).not.toContain('state?.bridge');
    expect(source).not.toContain('commit?.bridge');
    expect(source).not.toContain('dispatch?.bridge');
    expect(source).not.toContain("from '@/store/bridge");
    expect(source).not.toContain('store.getters.web3');
    expect(source).not.toContain('async runLegacyAction');
    expect(source).not.toContain('runLegacyMutation(');
    expect(source).not.toContain("runLegacyAction('updateBridgeHistory'");
    expect(source).not.toContain("runLegacyAction('updateInternalHistory'");
    expect(source).not.toContain("runLegacyAction('updateExternalHistory'");
    expect(source).not.toContain("runLegacyAction('updateExternalBalance'");
    expect(source).not.toContain("runLegacyAction('generateHistoryItem'");
    expect(source).not.toContain("runLegacyAction('removeHistory'");
    expect(source).not.toContain("runLegacyAction('getEthBridgeHistoryInstance'");
    expect(source).not.toContain("runLegacyAction('signEthBridgeOutgoingEvm'");
    expect(source).not.toContain("runLegacyAction('signEthBridgeIncomingEvm'");
    expect(source).not.toContain("runLegacyAction('updateOutgoingMaxLimit'");
    expect(source).not.toContain("runLegacyAction('subscribeOnBlockUpdates'");
    expect(source).not.toContain("runLegacyAction('resetBridgeForm'");
    expect(source).not.toContain("runLegacyAction('setSendedAmount'");
    expect(source).not.toContain("runLegacyAction('setReceivedAmount'");
    expect(source).not.toContain("runLegacyAction('switchDirection'");
    expect(source).not.toContain("runLegacyAction('setAssetAddress'");
    expect(source).not.toContain("runLegacyAction('handleBridgeTransaction'");
  });

  it('removes the coarse root-store bridge mutation subscriber from the bridge Pinia facade', async () => {
    const source = await readFile(bridgeStoreFile, 'utf8');

    expect(source).not.toContain('DIRECT_LEGACY_BRIDGE_MUTATION_TYPES');
    expect(source).not.toContain('BRIDGE_LEGACY_SYNC_SUBSCRIPTIONS');
    expect(source).not.toContain('subscribe((mutation');
    expect(source).not.toContain("mutation.type.startsWith('bridge/')");
  });

  it('moves bridge asset helpers onto the Pinia bridge domain', async () => {
    const source = await readFile(bridgeAssetsFile, 'utf8');

    expect(source).toContain("from '@/stores/assets'");
    expect(source).not.toContain("from '@/store/bridge");
  });

  it('keeps the router navigation adapter on the Pinia router store instead of the root-store helper', async () => {
    const source = await readFile(routerNavigationAdapterFile, 'utf8');

    expect(source).toContain("from '@/stores/router'");
    expect(source).not.toContain("from '@/store/instance'");
    expect(source).not.toContain('getRootStore(');
  });

  it('removes the legacy root-store bridge module files', async () => {
    for (const file of removedBridgeModuleFiles) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('keeps the app settings Pinia store on the wallet Pinia facade instead of the root-store helper', async () => {
    const source = await readFile(settingsStoreFile, 'utf8');

    expect(source).toContain("from '@/stores/wallet'");
    expect(source).not.toContain("from '@/store/instance'");
    expect(source).not.toContain('getRootStore(');
  });

  it('removes the bridge facade sub-stores and sync helper in favor of the canonical bridge Pinia store', async () => {
    await expect(stat(bridgeHistoryStoreFile)).rejects.toBeDefined();
    await expect(stat(bridgeFormStoreFile)).rejects.toBeDefined();
    await expect(stat(bridgeTransactionsStoreFile)).rejects.toBeDefined();
    await expect(stat(bridgeSyncCompatFile)).rejects.toBeDefined();
  });

  it('keeps sub-bridge signing hooks off the legacy bridge mutation type string', async () => {
    const source = await readFile(subBridgeReducersFile, 'utf8');

    expect(source).toContain('BridgeTransactionSignDialogMode.Bridge');
    expect(source).not.toContain('bridge/setSignTxDialogVisibility');
  });
});
