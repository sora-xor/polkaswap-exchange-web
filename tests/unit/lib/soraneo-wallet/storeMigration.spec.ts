// @vitest-environment node
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const removedWalletStoreIndexFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'index.ts');
const removedWalletStoreModuleContextFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'moduleContext.ts'
);
const removedWalletStoreRegistryFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'registry.ts'
);
const removedWalletStoreWalletFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'wallet.ts');
const removedWalletStorePiniaFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'pinia.ts');
const removedWalletAccountStateFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'account',
  'state.ts'
);
const removedWalletAccountTypesFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'account',
  'types.ts'
);
const removedWalletAccountIndexFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'account',
  'index.ts'
);
const removedWalletSettingsStateFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'settings',
  'state.ts'
);
const removedWalletSettingsThemeFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'settings',
  'theme.ts'
);
const removedWalletSettingsTypesFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'settings',
  'types.ts'
);
const removedWalletSettingsIndexFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'settings',
  'index.ts'
);
const removedWalletTransactionsStateFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'transactions',
  'state.ts'
);
const removedWalletTransactionsTypesFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'transactions',
  'types.ts'
);
const removedWalletTransactionsIndexFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'transactions',
  'index.ts'
);
const removedWalletSubscriptionsIndexFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'subscriptions',
  'index.ts'
);
const removedWalletRouterIndexFile = path.join(
  repoRoot,
  'src',
  'lib',
  'soraneo-wallet',
  'src',
  'store',
  'router',
  'index.ts'
);
const removedWalletStoreHelpersFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'helpers.ts');
const removedWalletAccountStoreFiles = [
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'account', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'account', 'getters.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'account', 'mutations.ts'),
] as const;
const removedWalletSettingsStoreFiles = [
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'settings', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'settings', 'getters.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'settings', 'mutations.ts'),
] as const;
const removedWalletTransactionsStoreFiles = [
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'transactions', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'transactions', 'getters.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'transactions', 'mutations.ts'),
] as const;
const removedWalletSubscriptionsStoreFiles = [
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'state.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'subscriptions', 'types.ts'),
] as const;
const removedWalletRouterStoreFiles = [
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'actions.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'mutations.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'state.ts'),
  path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'store', 'router', 'types.ts'),
] as const;

const files = {
  tokenLogo: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'TokenLogo.vue'),
  walletAssetsHeadline: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'WalletAssetsHeadline.vue'
  ),
  transactionHashView: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'TransactionHashView.vue'
  ),
  walletConnection: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'WalletConnection.vue'),
  assetsFilter: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'shared', 'AssetsFilter.vue'),
  walletAccount: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'Account',
    'WalletAccount.vue'
  ),
  signatureOption: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'Account',
    'Settings',
    'SignatureOption.vue'
  ),
  confirmationOption: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'Account',
    'Settings',
    'ConfirmationOption.vue'
  ),
  createMstWalletDialog: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'MST',
    'CreateMstWalletDialog.vue'
  ),
  multisigCreateDialog: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'MST',
    'MultisigCreateDialog.vue'
  ),
  mstOnboardingDialog: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'MST',
    'MstOnboardingDialog.vue'
  ),
  multisigChangeNameDialog: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'MST',
    'MultisigChangeNameDialog.vue'
  ),
  infoLine: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'InfoLine.vue'),
  walletAdarTxDetails: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'WalletAdarTxDetails.vue'
  ),
  walletTransactionDetails: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'WalletTransactionDetails.vue'
  ),
  confirmDialog: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'ConfirmDialog.vue'),
  createNftToken: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'CreateNftToken.vue'),
  addAssetDetailsCard: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'AddAsset',
    'AddAssetDetailsCard.vue'
  ),
  addAssetTokenTab: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'AddAsset',
    'AddAssetTokenTab.vue'
  ),
  addressBookInput: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'AddressBook',
    'Input.vue'
  ),
  walletHistory: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'WalletHistory.vue'),
  walletSend: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'WalletSend.vue'),
  connectionView: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'Connection',
    'ConnectionView.vue'
  ),
  walletView: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'Wallet.vue'),
  walletAssetDetails: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'WalletAssetDetails.vue'
  ),
  walletAssets: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'WalletAssets.vue'),
  walletCore: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'core.ts'),
  walletIndex: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'index.ts'),
  walletMain: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'main.ts'),
  accountActionsComposable: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'composables',
    'useAccountActions.ts'
  ),
  walletTranslationComposable: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'composables',
    'useWalletTranslation.ts'
  ),
  addAssetComposable: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'composables', 'useAddAsset.ts'),
  loadingComposable: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'composables', 'useLoading.ts'),
  qrCodeParserComposable: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'composables',
    'useQrCodeParser.ts'
  ),
  themeProvider: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'ThemeProvider.vue'),
  settingsDialog: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'Account',
    'SettingsDialog.vue'
  ),
  formattedAmountComponent: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'FormattedAmount.vue'
  ),
  mstForgetDialog: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'components',
    'MST',
    'MstForgetDialog.vue'
  ),
  networkFeeWarning: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'NetworkFeeWarning.vue'),
  formattedAmountComposable: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'composables',
    'useFormattedAmount.ts'
  ),
  networkFeeWarningComposable: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'composables',
    'useNetworkFeeWarning.ts'
  ),
  operationsComposable: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'composables', 'useOperations.ts'),
  transactionComposable: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'composables', 'useTransaction.ts'),
  alertsService: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'services', 'alerts', 'index.ts'),
  currencyService: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'services', 'currency', 'index.ts'),
  indexerService: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'services', 'indexer', 'index.ts'),
  subsquidService: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'services',
    'indexer',
    'subsquid',
    'index.ts'
  ),
  subqueryService: path.join(
    repoRoot,
    'src',
    'lib',
    'soraneo-wallet',
    'src',
    'services',
    'indexer',
    'subquery',
    'index.ts'
  ),
  indexerParser: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'services', 'indexer', 'parser.ts'),
  transactionSignUtil: path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'util', 'index.ts'),
} as const;

const walletAppFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'App.vue');
const walletComponentsDir = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components');
const walletStoreDir = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'stores');
const removedWalletVuexFile = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'vuex.ts');
const removedWalletMixinsDir = path.join(repoRoot, 'src', 'lib', 'soraneo-wallet', 'src', 'components', 'mixins');

const collectWalletComponentFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return await collectWalletComponentFiles(fullPath);
      }

      return /\.(vue|ts)$/.test(entry.name) ? [fullPath] : [];
    })
  );

  return files.flat();
};

const collectWalletStoreFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return await collectWalletStoreFiles(fullPath);
      }

      return /\.(ts)$/.test(entry.name) ? [fullPath] : [];
    })
  );

  return files.flat();
};

describe('wallet store migration', () => {
  it('removes the vendored wallet vuex registry shim', async () => {
    await expect(stat(removedWalletVuexFile)).rejects.toBeDefined();
  });

  it('keeps the migrated wallet runtime off direct app-store helpers', async () => {
    const sources = await Promise.all(Object.values(files).map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain("from '@/utils/app-store'");
      expect(source).not.toContain('__PS_APP_STORE__');
    }
  });

  it('routes wallet runtime access through Pinia facades', async () => {
    const sources = Object.fromEntries(
      await Promise.all(
        Object.entries(files).map(async ([key, filePath]) => {
          return [key, await readFile(filePath, 'utf8')];
        })
      )
    ) as Record<keyof typeof files, string>;

    expect(sources.tokenLogo).toContain("from '@/stores/wallet'");
    expect(sources.walletAssetsHeadline).toContain("from '@/stores/settings'");
    expect(sources.transactionHashView).toContain("from '@/stores/settings'");
    expect(sources.walletConnection).toContain("from '@/platform/wallet/navigation'");
    expect(sources.walletConnection).not.toContain("from '@/stores/router'");
    expect(sources.walletConnection).toContain("from '@/stores/wallet'");
    expect(sources.assetsFilter).toContain("from '@/stores/settings'");
    expect(sources.walletAccount).toContain("from '@/stores/settings'");
    expect(sources.walletAccount).toContain("from '@/stores/wallet'");
    expect(sources.signatureOption).toContain("from '@/stores/wallet'");
    expect(sources.confirmationOption).toContain("from '@/stores/wallet'");
    expect(sources.createMstWalletDialog).toContain("from '@/stores/wallet'");
    expect(sources.multisigCreateDialog).not.toContain("from '@/stores/router'");
    expect(sources.multisigCreateDialog).toContain("from '@/stores/wallet'");
    expect(sources.mstOnboardingDialog).not.toContain("from '@/stores/router'");
    expect(sources.mstOnboardingDialog).toContain("from '@/platform/wallet/navigation'");
    expect(sources.mstOnboardingDialog).toContain("from '@/stores/settings'");
    expect(sources.multisigChangeNameDialog).not.toContain("from '@/stores/router'");
    expect(sources.multisigChangeNameDialog).toContain("from '@/stores/wallet'");
    expect(sources.addAssetComposable).not.toContain("from '@/stores/router'");
    expect(sources.addAssetComposable).toContain("from '@/stores/wallet'");
    expect(sources.qrCodeParserComposable).not.toContain("from '@/stores/router'");
    expect(sources.qrCodeParserComposable).toContain("from '@/stores/wallet'");
    expect(sources.walletView).not.toContain("from '@/stores/router'");
    expect(sources.walletView).toContain("from '@/platform/wallet/navigation'");
    expect(sources.walletView).toContain("from '@/stores/wallet'");
    expect(sources.walletAssets).not.toContain("from '@/stores/router'");
    expect(sources.walletAssets).toContain("from '@/stores/wallet'");
    expect(sources.walletAssetDetails).not.toContain("from '@/stores/router'");
    expect(sources.walletAssetDetails).toContain("from '@/platform/wallet/navigation'");
    expect(sources.walletAssetDetails).toContain("from '@/stores/wallet'");
    expect(sources.walletHistory).not.toContain("from '@/stores/router'");
    expect(sources.walletHistory).toContain("from '@/stores/wallet'");
    expect(sources.createNftToken).not.toContain("from '@/stores/router'");
    expect(sources.createNftToken).toContain("from '@/stores/wallet'");
    expect(sources.walletSend).not.toContain("from '@/stores/router'");
    expect(sources.walletSend).toContain("from '@/platform/wallet/navigation'");
    expect(sources.walletSend).toContain("from '@/stores/wallet'");
    expect(sources.walletIndex).not.toContain("from '@/store/instance'");
    expect(sources.walletIndex).not.toContain("from './store/instance'");
    expect(sources.walletIndex).not.toContain("from './store/runtime'");
    expect(sources.walletIndex).not.toContain('getWalletStore');
    expect(sources.walletIndex).not.toContain('setWalletStore');
    expect(sources.walletIndex).not.toContain('getWalletRuntimeStore');
    expect(sources.walletIndex).not.toContain('setWalletRuntimeStore');
    expect(sources.walletIndex).not.toContain('WalletCompatStore');
    expect(sources.walletIndex).not.toContain('isWalletStoreLike');
    expect(sources.walletIndex).not.toContain('resolveCompatStore');
    expect(sources.walletIndex).toContain("from './bootstrap'");
    expect(sources.walletIndex).not.toContain('dispatchCompatWalletAction');
    expect(sources.walletIndex).not.toContain('commitCompatWalletMutation');
    expect(sources.walletCore).not.toContain("from './vuex'");
    expect(sources.walletCore).not.toContain('vuex,');
    expect(sources.walletIndex).not.toContain('__PS_APP_STORE__');
    expect(sources.walletIndex).not.toContain('resolveWalletStorePair');
    expect(sources.walletIndex).not.toContain('WalletSourceStore');
    expect(sources.walletIndex).not.toContain('dispatch?.wallet');
    expect(sources.walletIndex).not.toContain('commit?.wallet');
    expect(sources.walletIndex).not.toContain('state?.wallet');
    expect(sources.walletIndex).not.toContain('getRootStore(');
    expect(sources.walletIndex).not.toContain('attachExternalStoreIfAvailable');
    expect(sources.walletIndex).not.toContain('let sourceStore');
    expect(sources.walletIndex).not.toContain('activeSourceStore');
    expect(sources.walletIndex).not.toContain('commit?.settings?.setWalletLoaded');
    expect(sources.walletIndex).not.toContain('Please provide vuex store.');
    expect(sources.walletIndex).not.toContain('Please provide a compatible store.');
    expect(sources.walletIndex).not.toContain('vuex,');
    expect(sources.walletMain).not.toContain('app.use(store.original)');
    expect(sources.walletTranslationComposable).toContain("from '@/stores/settings'");
    expect(sources.transactionComposable).not.toContain('this.$store');
    expect(sources.transactionComposable).toContain("from '@/stores/wallet'");
    expect(sources.transactionComposable).not.toContain('getWalletStore()');
    expect(sources.settingsDialog).toContain("from '@/stores/wallet'");
    expect(sources.formattedAmountComponent).toContain("from '@/stores/wallet'");
    expect(sources.mstForgetDialog).toContain("from '@/stores/wallet'");
    expect(sources.alertsService).toContain("from '@/plugins/pinia'");
    expect(sources.alertsService).toContain("from '@/stores/wallet'");
    expect(sources.currencyService).toContain("from '@/plugins/pinia'");
    expect(sources.currencyService).toContain("from '@/stores/wallet'");
    expect(sources.indexerService).toContain("from '@/plugins/pinia'");
    expect(sources.indexerService).toContain("from '@/stores/wallet'");
    expect(sources.subsquidService).toContain("from '@/plugins/pinia'");
    expect(sources.subsquidService).toContain("from '@/stores/wallet'");
    expect(sources.subqueryService).toContain("from '@/plugins/pinia'");
    expect(sources.subqueryService).toContain("from '@/stores/wallet'");
    expect(sources.indexerParser).toContain("from '@/plugins/pinia'");
    expect(sources.indexerParser).toContain("from '@/stores/wallet'");
    expect(sources.transactionSignUtil).toContain("from '@/plugins/pinia'");
    expect(sources.transactionSignUtil).toContain("from '@/stores/wallet'");
    expect(sources.alertsService).not.toContain('store/pinia');
    expect(sources.currencyService).not.toContain('store/pinia');
    expect(sources.indexerService).not.toContain('store/pinia');
    expect(sources.subsquidService).not.toContain('store/pinia');
    expect(sources.subqueryService).not.toContain('store/pinia');
    expect(sources.indexerParser).not.toContain('store/pinia');
    expect(sources.transactionSignUtil).not.toContain('store/pinia');
  });

  it('keeps migrated wallet composables on the Pinia wallet facade instead of wallet-local helper mappers', async () => {
    const piniaWalletComposableFiles = [
      files.accountActionsComposable,
      files.addAssetComposable,
      files.formattedAmountComposable,
      files.networkFeeWarningComposable,
      files.operationsComposable,
      files.qrCodeParserComposable,
      files.transactionComposable,
    ];
    const sources = await Promise.all(piniaWalletComposableFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).toContain("from '@/stores/wallet'");
      expect(source).not.toContain('store/helpers');
      expect(source).not.toContain('/store/router/types');
      expect(source).not.toContain('/store/account/types');
      expect(source).not.toContain('mapState(');
      expect(source).not.toContain('mapGetters(');
      expect(source).not.toContain('mapMutations(');
      expect(source).not.toContain('mapActions(');
    }

    const loadingSource = await readFile(files.loadingComposable, 'utf8');

    expect(loadingSource).not.toContain('store/helpers');
    expect(loadingSource).not.toContain('/store/router/types');
    expect(loadingSource).not.toContain('/store/account/types');
    expect(loadingSource).not.toContain('mapState(');
    expect(loadingSource).not.toContain('mapGetters(');
    expect(loadingSource).not.toContain('mapMutations(');
    expect(loadingSource).not.toContain('mapActions(');
  });

  it('keeps migrated wallet components on direct Pinia wallet access instead of wallet-local helper mappers', async () => {
    const componentFiles = [
      walletAppFile,
      files.infoLine,
      files.walletAdarTxDetails,
      files.walletTransactionDetails,
      files.confirmDialog,
      files.createNftToken,
      files.addAssetDetailsCard,
      files.addAssetTokenTab,
      files.addressBookInput,
      files.walletHistory,
      files.walletSend,
      files.connectionView,
      files.walletView,
      files.walletAssetDetails,
      files.walletAssets,
    ];
    const sources = await Promise.all(componentFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).toContain("from '@/stores/wallet'");
      expect(source).not.toContain('store/helpers');
      expect(source).not.toContain('mapState(');
      expect(source).not.toContain('mapGetters(');
      expect(source).not.toContain('mapMutations(');
      expect(source).not.toContain('mapActions(');
    }

    expect(sources[0]).toContain("from './bootstrap'");
    expect(sources[0]).not.toContain("from './index'");
  });

  it('removes the dead internal wallet store wrapper entry from src/', async () => {
    await expect(stat(removedWalletStoreIndexFile)).rejects.toBeDefined();
  });

  it('removes the dead wallet-local helper mapper entry from src/', async () => {
    await expect(stat(removedWalletStoreHelpersFile)).rejects.toBeDefined();
  });

  it('removes the dead wallet-local Pinia resolver entry from src/', async () => {
    await expect(stat(removedWalletStorePiniaFile)).rejects.toBeDefined();
  });

  it('removes the dead vendored wallet state/type/theme files from src/', async () => {
    for (const file of [
      removedWalletAccountStateFile,
      removedWalletAccountTypesFile,
      removedWalletSettingsStateFile,
      removedWalletSettingsThemeFile,
      removedWalletSettingsTypesFile,
      removedWalletTransactionsStateFile,
      removedWalletTransactionsTypesFile,
    ]) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead wallet-local moduleContext and module wrapper entries from src/', async () => {
    await expect(stat(removedWalletStoreModuleContextFile)).rejects.toBeDefined();
    await expect(stat(removedWalletStoreRegistryFile)).rejects.toBeDefined();
    await expect(stat(removedWalletStoreWalletFile)).rejects.toBeDefined();
    await expect(stat(removedWalletAccountIndexFile)).rejects.toBeDefined();
    await expect(stat(removedWalletSettingsIndexFile)).rejects.toBeDefined();
    await expect(stat(removedWalletTransactionsIndexFile)).rejects.toBeDefined();
    await expect(stat(removedWalletSubscriptionsIndexFile)).rejects.toBeDefined();
    await expect(stat(removedWalletRouterIndexFile)).rejects.toBeDefined();
  });

  it('removes the dead vendored wallet vuex-shaped action/getter/mutation files from src/', async () => {
    for (const file of [
      ...removedWalletAccountStoreFiles,
      ...removedWalletSettingsStoreFiles,
      ...removedWalletTransactionsStoreFiles,
      ...removedWalletSubscriptionsStoreFiles,
      ...removedWalletRouterStoreFiles,
    ]) {
      await expect(stat(file)).rejects.toBeDefined();
    }
  });

  it('removes the dead vendored wallet mixin directory from src/', async () => {
    await expect(stat(removedWalletMixinsDir)).rejects.toBeDefined();
  });

  it('keeps wallet components and composables off direct vuex helpers', async () => {
    const componentFiles = await collectWalletComponentFiles(walletComponentsDir);
    const sources = await Promise.all([walletAppFile, ...componentFiles].map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain("from 'vuex'");
      expect(source).not.toContain('from "vuex"');
      expect(source).not.toContain('useStore()');
    }
  });

  it('keeps wallet-local store files off no-op compat helper wrappers', async () => {
    const storeFiles = await collectWalletStoreFiles(walletStoreDir);
    const sources = await Promise.all(storeFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain('createWalletActionContext(');
      expect(source).not.toContain('createWalletGetterContext(');
      expect(source).not.toContain("from '@/stores/compat/module-helpers'");
      expect(source).not.toContain("from '@/stores/compat/module-context'");
      expect(source).not.toContain("from '@/stores/compat/vuex-compat'");
      expect(source).not.toContain('localModuleActionContext(');
      expect(source).not.toContain('localModuleGetterContext(');
      expect(source).not.toContain('defineModule(');
      expect(source).not.toContain('defineActions(');
      expect(source).not.toContain('defineGetters(');
      expect(source).not.toContain('defineMutations(');
    }
  });

  it('keeps migrated wallet readers on Pinia wallet facades instead of getWalletStore', async () => {
    const readerFiles = [
      files.themeProvider,
      files.settingsDialog,
      files.formattedAmountComponent,
      files.mstForgetDialog,
      files.networkFeeWarning,
      files.formattedAmountComposable,
      files.networkFeeWarningComposable,
      files.operationsComposable,
      files.transactionComposable,
    ];

    const sources = await Promise.all(readerFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).toContain("from '@/stores/wallet'");
      expect(source).not.toContain('getWalletStore(');
    }
  });

  it('keeps migrated wallet components off direct compat-wallet access', async () => {
    const componentFiles = [files.settingsDialog, files.formattedAmountComponent, files.mstForgetDialog];
    const sources = await Promise.all(componentFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain('store.state.wallet');
      expect(source).not.toContain('store.getters.wallet');
      expect(source).not.toContain('store.dispatch.wallet');
      expect(source).not.toContain('store.commit.wallet');
    }
  });

  it('keeps migrated wallet services off direct compat-store reads', async () => {
    const serviceFiles = [
      files.alertsService,
      files.currencyService,
      files.indexerService,
      files.subsquidService,
      files.subqueryService,
      files.indexerParser,
      files.transactionSignUtil,
    ];

    const sources = await Promise.all(serviceFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain('getWalletStore(');
      expect(source).not.toContain('store.state.wallet');
      expect(source).not.toContain("store.getters['wallet/");
      expect(source).not.toContain('commit.wallet');
      expect(source).not.toContain('dispatch.wallet');
    }
  });

  it('keeps live wallet source off the deleted vendored store subtree', async () => {
    const sourceFiles = [
      files.walletIndex,
      walletAppFile,
      files.connectionView,
      files.walletView,
      files.walletAssets,
      files.walletHistory,
      files.walletSend,
    ];
    const sources = await Promise.all(sourceFiles.map((filePath) => readFile(filePath, 'utf8')));

    for (const source of sources) {
      expect(source).not.toContain('/src/store/');
      expect(source).not.toContain('/store/router/types');
      expect(source).not.toContain('/store/account/types');
    }
  });
});
