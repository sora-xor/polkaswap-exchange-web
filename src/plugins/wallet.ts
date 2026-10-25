import { registerGlobalPinia, resolveGlobalPinia } from './pinia';
import { createAsyncComponent } from '@/shared/ui/async';
import type { Pinia } from 'pinia';
import type { App, Component } from 'vue';

type WalletInstallContext = {
  pinia?: unknown;
};

type WalletPluginsModule = typeof import('@/lib/soraneo-wallet/src/plugins');

let walletPluginsModulePromise: Promise<WalletPluginsModule> | null = null;

const loadWalletPluginsModule = (): Promise<WalletPluginsModule> => {
  walletPluginsModulePromise ??= import('@/lib/soraneo-wallet/src/plugins');
  return walletPluginsModulePromise;
};

const isPiniaInstance = (value: unknown): value is Pinia => {
  return Boolean(value) && typeof value === 'object' && '_s' in (value as Record<string, unknown>);
};

const toKebabCase = (name: string): string => {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();
};

const registerIfAbsent = (app: App, name: string, component: Component): void => {
  if (!app.component(name)) {
    app.component(name, component);
  }
};

const walletComponents = {
  SoraWallet: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/SoraWallet.vue')),
  WalletAccount: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/Account/WalletAccount.vue')),
  WalletAvatar: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/Account/WalletAvatar.vue')),
  WalletBase: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/WalletBase.vue')),
  WalletFee: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/WalletFee.vue')),
  AccountCard: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/Account/AccountCard.vue')),
  AccountConfirmationOption: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/Account/Settings/ConfirmationOption.vue')
  ),
  AddressBookInput: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/AddressBook/Input.vue')),
  AssetsFilter: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/shared/AssetsFilter.vue')),
  AssetList: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/AssetList.vue')),
  AssetListItem: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/AssetListItem.vue')),
  AddAssetDetailsCard: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue')
  ),
  ConfirmDialog: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/ConfirmDialog.vue')),
  TokenAddress: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/TokenAddress.vue')),
  SearchInput: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/Input/SearchInput.vue')),
  InfoLine: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/InfoLine.vue')),
  FormattedAmount: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/FormattedAmount.vue')),
  FormattedAmountWithFiatValue: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue')
  ),
  FileUploader: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/FileUploader.vue')),
  TransactionHashView: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/TransactionHashView.vue')
  ),
  NetworkFeeWarning: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/NetworkFeeWarning.vue')),
  TokenLogo: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/TokenLogo.vue')),
  NftDetails: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/NftDetails.vue')),
  HistoryPagination: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/HistoryPagination.vue')),
  DialogBase: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/DialogBase.vue')),
  NotificationProvider: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/NotificationProvider.vue')
  ),
  NotificationEnablingPage: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/NotificationEnablingPage.vue')
  ),
  SimpleNotification: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/SimpleNotification.vue')),
  ConnectionItems: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/Connection/List/ConnectionItems.vue')
  ),
  SyntheticSwitcher: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/shared/SyntheticSwitcher.vue')
  ),
  ExternalLink: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue')),
  FormattedAddress: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue')
  ),
  AccountConnectionList: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/Connection/List/Account.vue')
  ),
  ExtensionConnectionList: createAsyncComponent(
    () => import('@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue')
  ),
  ConnectionView: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue')),
  PinIcon: createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/PinIcon.vue')),
} satisfies Record<string, Component>;

const registerWalletComponents = (app: App, components?: Record<string, Component>): void => {
  if (!components) return;

  Object.entries(components).forEach(([name, component]) => {
    registerIfAbsent(app, name, component);
    registerIfAbsent(app, toKebabCase(name), component);
  });
};

const scheduleRuntimePluginInstall = (callback: FnWithoutArgs): void => {
  if (typeof window === 'undefined') {
    callback();
    return;
  }

  const browserWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  };

  if (typeof browserWindow.requestIdleCallback === 'function') {
    browserWindow.requestIdleCallback(callback, { timeout: 2_000 });
    return;
  }

  window.setTimeout(callback, 0);
};

const installWalletRuntimePlugins = (app: App): void => {
  scheduleRuntimePluginInstall(() => {
    void loadWalletPluginsModule()
      .then(({ default: installWalletPlugins }) => {
        installWalletPlugins(app);
      })
      .catch((error) => {
        console.warn('[plugins] wallet runtime plugin install skipped', error);
      });
  });
};

export function install(app: App, context: WalletInstallContext = {}): void {
  const pinia = isPiniaInstance(context.pinia) ? context.pinia : resolveGlobalPinia();
  registerGlobalPinia(pinia);

  registerWalletComponents(app, walletComponents);
  installWalletRuntimePlugins(app);
}
