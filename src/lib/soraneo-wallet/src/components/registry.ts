import type { AsyncComponentLoader } from 'vue';

import { createAsyncComponent } from '@/router/lazy';

const lazyComponent = <T>(loader: AsyncComponentLoader<T>) => createAsyncComponent(loader);

export const SoraWallet = lazyComponent(() => import('../SoraWallet.vue'));
export const WalletAccount = lazyComponent(() => import('./Account/WalletAccount.vue'));
export const WalletAvatar = lazyComponent(() => import('./Account/WalletAvatar.vue'));
export const WalletBase = lazyComponent(() => import('./WalletBase.vue'));
export const WalletFee = lazyComponent(() => import('./WalletFee.vue'));
export const AccountCard = lazyComponent(() => import('./Account/AccountCard.vue'));
export const AccountConfirmationOption = lazyComponent(() => import('./Account/Settings/ConfirmationOption.vue'));
export const AddressBookInput = lazyComponent(() => import('./AddressBook/Input.vue'));
export const AssetsFilter = lazyComponent(() => import('./shared/AssetsFilter.vue'));
export const AssetList = lazyComponent(() => import('./AssetList.vue'));
export const AssetListItem = lazyComponent(() => import('./AssetListItem.vue'));
export const AddAssetDetailsCard = lazyComponent(() => import('./AddAsset/AddAssetDetailsCard.vue'));
export const ConfirmDialog = lazyComponent(() => import('./ConfirmDialog.vue'));
export const TokenAddress = lazyComponent(() => import('./TokenAddress.vue'));
export const SearchInput = lazyComponent(() => import('./Input/SearchInput.vue'));
export const InfoLine = lazyComponent(() => import('./InfoLine.vue'));
export const FormattedAmount = lazyComponent(() => import('./FormattedAmount.vue'));
export const FormattedAmountWithFiatValue = lazyComponent(() => import('./FormattedAmountWithFiatValue.vue'));
export const FileUploader = lazyComponent(() => import('./FileUploader.vue'));
export const TransactionHashView = lazyComponent(() => import('./TransactionHashView.vue'));
export const NetworkFeeWarning = lazyComponent(() => import('./NetworkFeeWarning.vue'));
export const TokenLogo = lazyComponent(() => import('./TokenLogo.vue'));
export const NftDetails = lazyComponent(() => import('./NftDetails.vue'));
export const HistoryPagination = lazyComponent(() => import('./HistoryPagination.vue'));
export const DialogBase = lazyComponent(() => import('./DialogBase.vue'));
export const NotificationProvider = lazyComponent(() => import('./NotificationProvider.vue'));
export const NotificationEnablingPage = lazyComponent(() => import('./NotificationEnablingPage.vue'));
export const SimpleNotification = lazyComponent(() => import('./SimpleNotification.vue'));
export const ConnectionItems = lazyComponent(() => import('./Connection/List/ConnectionItems.vue'));
export const SyntheticSwitcher = lazyComponent(() => import('./shared/SyntheticSwitcher.vue'));
export const ExternalLink = lazyComponent(() => import('./shared/ExternalLink.vue'));
export const FormattedAddress = lazyComponent(() => import('./shared/FormattedAddress.vue'));
export const AccountConnectionList = lazyComponent(() => import('./Connection/List/Account.vue'));
export const ExtensionConnectionList = lazyComponent(() => import('./Connection/List/Extension.vue'));
export const ConnectionView = lazyComponent(() => import('./Connection/ConnectionView.vue'));
export const PinIcon = lazyComponent(() => import('./PinIcon.vue'));

/**
 * Public registry of wallet Vue components that host application code can
 * consume without routing imports through the package-style `@wallet` entry.
 */
export const components = {
  SoraWallet,
  WalletAccount,
  WalletAvatar,
  WalletBase,
  WalletFee,
  AccountCard,
  AccountConfirmationOption,
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
};
