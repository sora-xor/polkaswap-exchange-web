import installWalletPlugins from '@/lib/soraneo-wallet/src/plugins';
import AccountCard from '@/lib/soraneo-wallet/src/components/Account/AccountCard.vue';
import ConfirmationOption from '@/lib/soraneo-wallet/src/components/Account/Settings/ConfirmationOption.vue';
import WalletAccount from '@/lib/soraneo-wallet/src/components/Account/WalletAccount.vue';
import WalletAvatar from '@/lib/soraneo-wallet/src/components/Account/WalletAvatar.vue';
import AddressBookInput from '@/lib/soraneo-wallet/src/components/AddressBook/Input.vue';
import AddAssetDetailsCard from '@/lib/soraneo-wallet/src/components/AddAsset/AddAssetDetailsCard.vue';
import AssetList from '@/lib/soraneo-wallet/src/components/AssetList.vue';
import AssetListItem from '@/lib/soraneo-wallet/src/components/AssetListItem.vue';
import ConfirmDialog from '@/lib/soraneo-wallet/src/components/ConfirmDialog.vue';
import ConnectionView from '@/lib/soraneo-wallet/src/components/Connection/ConnectionView.vue';
import AccountConnectionList from '@/lib/soraneo-wallet/src/components/Connection/List/Account.vue';
import ConnectionItems from '@/lib/soraneo-wallet/src/components/Connection/List/ConnectionItems.vue';
import ExtensionConnectionList from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue';
import DialogBase from '@/lib/soraneo-wallet/src/components/DialogBase.vue';
import FileUploader from '@/lib/soraneo-wallet/src/components/FileUploader.vue';
import FormattedAmount from '@/lib/soraneo-wallet/src/components/FormattedAmount.vue';
import FormattedAmountWithFiatValue from '@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue';
import HistoryPagination from '@/lib/soraneo-wallet/src/components/HistoryPagination.vue';
import InfoLine from '@/lib/soraneo-wallet/src/components/InfoLine.vue';
import NetworkFeeWarning from '@/lib/soraneo-wallet/src/components/NetworkFeeWarning.vue';
import NftDetails from '@/lib/soraneo-wallet/src/components/NftDetails.vue';
import NotificationEnablingPage from '@/lib/soraneo-wallet/src/components/NotificationEnablingPage.vue';
import NotificationProvider from '@/lib/soraneo-wallet/src/components/NotificationProvider.vue';
import PinIcon from '@/lib/soraneo-wallet/src/components/PinIcon.vue';
import SearchInput from '@/lib/soraneo-wallet/src/components/Input/SearchInput.vue';
import SimpleNotification from '@/lib/soraneo-wallet/src/components/SimpleNotification.vue';
import TokenAddress from '@/lib/soraneo-wallet/src/components/TokenAddress.vue';
import TokenLogo from '@/lib/soraneo-wallet/src/components/TokenLogo.vue';
import TransactionHashView from '@/lib/soraneo-wallet/src/components/TransactionHashView.vue';
import WalletBase from '@/lib/soraneo-wallet/src/components/WalletBase.vue';
import WalletFee from '@/lib/soraneo-wallet/src/components/WalletFee.vue';
import ExternalLink from '@/lib/soraneo-wallet/src/components/shared/ExternalLink.vue';
import FormattedAddress from '@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue';
import AssetsFilter from '@/lib/soraneo-wallet/src/components/shared/AssetsFilter.vue';
import SyntheticSwitcher from '@/lib/soraneo-wallet/src/components/shared/SyntheticSwitcher.vue';
import { registerGlobalPinia, resolveGlobalPinia } from './pinia';
import { createAsyncComponent } from '@/shared/ui/async';
import type { Pinia } from 'pinia';
import type { App, Component } from 'vue';

type WalletInstallContext = {
  pinia?: unknown;
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
  WalletAccount,
  WalletAvatar,
  WalletBase,
  WalletFee,
  AccountCard,
  AccountConfirmationOption: ConfirmationOption,
  AddressBookInput,
  AssetsFilter,
  AssetList,
  AssetListItem,
  AddAssetDetailsCard,
  ConfirmDialog,
  TokenAddress,
  SearchInput,
  InfoLine,
  FormattedAmount,
  FormattedAmountWithFiatValue,
  FileUploader,
  TransactionHashView,
  NetworkFeeWarning,
  TokenLogo,
  NftDetails,
  HistoryPagination,
  DialogBase,
  NotificationProvider,
  NotificationEnablingPage,
  SimpleNotification,
  ConnectionItems,
  SyntheticSwitcher,
  ExternalLink,
  FormattedAddress,
  AccountConnectionList,
  ExtensionConnectionList,
  ConnectionView,
  PinIcon,
} satisfies Record<string, Component>;

const registerWalletComponents = (app: App, components?: Record<string, Component>): void => {
  if (!components) return;

  Object.entries(components).forEach(([name, component]) => {
    registerIfAbsent(app, name, component);
    registerIfAbsent(app, toKebabCase(name), component);
  });
};

export function install(app: App, context: WalletInstallContext = {}): void {
  const pinia = isPiniaInstance(context.pinia) ? context.pinia : resolveGlobalPinia();
  registerGlobalPinia(pinia);

  installWalletPlugins(app);
  registerWalletComponents(app, walletComponents);
}
