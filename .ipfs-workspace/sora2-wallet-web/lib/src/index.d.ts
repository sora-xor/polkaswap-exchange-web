/**
 * Entry point for the SORA wallet Vue plugin. This module wires together the
 * public API surface that host applications rely on: the plugin installer,
 * exported components, Vuex helpers, and utility functions.
 */
import { type Pinia } from 'pinia';
import { api, connection } from './api';
import WalletAvatar from './components/Account/WalletAvatar.vue';
import AddAssetDetailsCard from './components/AddAsset/AddAssetDetailsCard.vue';
import AddressBookInput from './components/AddressBook/Input.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import ConnectionView from './components/Connection/ConnectionView.vue';
import AccountConnectionList from './components/Connection/List/Account.vue';
import ConnectionItems from './components/Connection/List/ConnectionItems.vue';
import ExtensionConnectionList from './components/Connection/List/Extension.vue';
import FileUploader from './components/FileUploader.vue';
import FormattedAmount from './components/FormattedAmount.vue';
import FormattedAmountWithFiatValue from './components/FormattedAmountWithFiatValue.vue';
import InfoLine from './components/InfoLine.vue';
import SearchInput from './components/Input/SearchInput.vue';
import CameraPermissionMixin from './components/mixins/CameraPermissionMixin';
import CopyAddressMixin from './components/mixins/CopyAddressMixin';
import FormattedAmountMixin from './components/mixins/FormattedAmountMixin';
import LoadingMixin from './components/mixins/LoadingMixin';
import NetworkFeeWarningMixin from './components/mixins/NetworkFeeWarningMixin';
import NotificationMixin from './components/mixins/NotificationMixin';
import NumberFormatterMixin from './components/mixins/NumberFormatterMixin';
import PaginationSearchMixin from './components/mixins/PaginationSearchMixin';
import TransactionMixin from './components/mixins/TransactionMixin';
import TranslationMixin from './components/mixins/TranslationMixin';
import NftDetails from './components/NftDetails.vue';
import PinIcon from './components/PinIcon.vue';
import ExternalLink from './components/shared/ExternalLink.vue';
import WalletFee from './components/WalletFee.vue';
import * as WALLET_CONSTS from './consts';
import en from './lang/en';
import AlertsApiService from './services/alerts';
import { getCurrentIndexer } from './services/indexer';
import * as SUBQUERY_TYPES from './services/indexer/subquery/types';
import { historyElementsFilter } from './services/indexer/subsquid/queries/historyElements';
import * as SUBSQUID_TYPES from './services/indexer/subsquid/types';
import * as INDEXER_TYPES from './services/indexer/types';
import * as WC from './services/walletconnect';
import SoraWallet from './SoraWallet.vue';
import internalStore from './store';
import * as VUEX_TYPES from './store/types';
import { attachDecorator, createDecoratorsObject, VuexOperation } from './store/util';
import * as WALLET_TYPES from './types/common';
import {
  getExplorerLinks,
  groupRewardsByAssetsList,
  formatAccountAddress,
  validateAddress,
  beforeTransactionSign,
  getAssetsSubset,
} from './util';
import * as accountUtils from './util/account';
import { ScriptLoader } from './util/scriptLoader';
import { storage, runtimeStorage, settingsStorage } from './util/storage';
import type { Plugin } from 'vue';
type Store = typeof internalStore;
type PluginOptions = {
  store: Store;
  pinia?: Pinia;
};
/**
 * Vue plugin definition that registers the wallet into the host application.
 * The plugin expects a Vuex store so it can connect the internal modules.
 */
declare const SoraWalletElements: Plugin<PluginOptions>;
/**
 * Lazily bootstraps the wallet core by waiting for the store and keyring to
 * initialize, then fetching runtime data and applying permission overrides.
 * The function is idempotent so subsequent calls resolve immediately.
 */
declare const waitForCore: ({ withoutStore, permissions }?: WALLET_CONSTS.WalletInitOptions) => Promise<void>;
/**
 * Public initializer that brings the wallet online. Consumers should await
 * this function before interacting with any wallet services.
 */
declare function initWallet(options?: WALLET_CONSTS.WalletInitOptions): Promise<void>;
/**
 * Public registry of Vue components that can be consumed individually by the
 * host application when the full plugin is not desired.
 */
declare const components: {
  SoraWallet: typeof SoraWallet;
  WalletAccount: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        polkadotAccount?: Nullable<WALLET_TYPES.PolkadotJsAccount>;
        withIdentity?: boolean;
        chainApi?: Nullable<import('@sora-substrate/sdk').WithConnectionApi>;
      }> &
        Readonly<{
          onIdentity?: ((identity: Nullable<WALLET_TYPES.AccountIdentity>) => any) | undefined;
        }>,
      {
        account: import('vue').ComputedRef<Nullable<WALLET_TYPES.PolkadotJsAccount>>;
        address: import('vue').ComputedRef<string>;
        name: import('vue').ComputedRef<string>;
        identity: import('vue').ComputedRef<Nullable<WALLET_TYPES.AccountIdentity>>;
      },
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {} & {
        identity: (identity: Nullable<WALLET_TYPES.AccountIdentity>) => any;
      },
      import('vue').PublicProps,
      {
        polkadotAccount: WALLET_TYPES.PolkadotJsAccount | null;
        withIdentity: boolean;
        chainApi: import('@sora-substrate/sdk').WithConnectionApi | null;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        polkadotAccount?: Nullable<WALLET_TYPES.PolkadotJsAccount>;
        withIdentity?: boolean;
        chainApi?: Nullable<import('@sora-substrate/sdk').WithConnectionApi>;
      }> &
        Readonly<{
          onIdentity?: ((identity: Nullable<WALLET_TYPES.AccountIdentity>) => any) | undefined;
        }>,
      {
        account: import('vue').ComputedRef<Nullable<WALLET_TYPES.PolkadotJsAccount>>;
        address: import('vue').ComputedRef<string>;
        name: import('vue').ComputedRef<string>;
        identity: import('vue').ComputedRef<Nullable<WALLET_TYPES.AccountIdentity>>;
      },
      {},
      {},
      {},
      {
        polkadotAccount: WALLET_TYPES.PolkadotJsAccount | null;
        withIdentity: boolean;
        chainApi: import('@sora-substrate/sdk').WithConnectionApi | null;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      polkadotAccount?: Nullable<WALLET_TYPES.PolkadotJsAccount>;
      withIdentity?: boolean;
      chainApi?: Nullable<import('@sora-substrate/sdk').WithConnectionApi>;
    }> &
      Readonly<{
        onIdentity?: ((identity: Nullable<WALLET_TYPES.AccountIdentity>) => any) | undefined;
      }>,
    {
      account: import('vue').ComputedRef<Nullable<WALLET_TYPES.PolkadotJsAccount>>;
      address: import('vue').ComputedRef<string>;
      name: import('vue').ComputedRef<string>;
      identity: import('vue').ComputedRef<Nullable<WALLET_TYPES.AccountIdentity>>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      identity: (identity: Nullable<WALLET_TYPES.AccountIdentity>) => any;
    },
    string,
    {
      polkadotAccount: WALLET_TYPES.PolkadotJsAccount | null;
      withIdentity: boolean;
      chainApi: import('@sora-substrate/sdk').WithConnectionApi | null;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        default?: (props: {}) => any;
      };
    });
  WalletAvatar: typeof WalletAvatar;
  WalletBase: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        title?: string;
        tooltip?: string;
        titleCenter?: boolean;
        showBack?: boolean;
        showClose?: boolean;
        showHeader?: boolean;
        resetFocus?: string;
      }> &
        Readonly<{
          onBack?: (() => any) | undefined;
          onClose?: (() => any) | undefined;
        }>,
      {
        setFocusToHeader: () => void;
      },
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {} & {
        back: () => any;
        close: () => any;
      },
      import('vue').PublicProps,
      {
        title: string;
        tooltip: string;
        titleCenter: boolean;
        showBack: boolean;
        showClose: boolean;
        showHeader: boolean;
        resetFocus: string;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        title?: string;
        tooltip?: string;
        titleCenter?: boolean;
        showBack?: boolean;
        showClose?: boolean;
        showHeader?: boolean;
        resetFocus?: string;
      }> &
        Readonly<{
          onBack?: (() => any) | undefined;
          onClose?: (() => any) | undefined;
        }>,
      {
        setFocusToHeader: () => void;
      },
      {},
      {},
      {},
      {
        title: string;
        tooltip: string;
        titleCenter: boolean;
        showBack: boolean;
        showClose: boolean;
        showHeader: boolean;
        resetFocus: string;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      title?: string;
      tooltip?: string;
      titleCenter?: boolean;
      showBack?: boolean;
      showClose?: boolean;
      showHeader?: boolean;
      resetFocus?: string;
    }> &
      Readonly<{
        onBack?: (() => any) | undefined;
        onClose?: (() => any) | undefined;
      }>,
    {
      setFocusToHeader: () => void;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      back: () => any;
      close: () => any;
    },
    string,
    {
      title: string;
      tooltip: string;
      titleCenter: boolean;
      showBack: boolean;
      showClose: boolean;
      showHeader: boolean;
      resetFocus: string;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        actions?: (props: {}) => any;
      } & {
        default?: (props: {}) => any;
      };
    });
  WalletFee: typeof WalletFee;
  AccountCard: any;
  AccountConfirmationOption: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        withHint?: boolean;
      }> &
        Readonly<{}>,
      {
        model: import('vue').WritableComputedRef<boolean, boolean>;
      },
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {},
      import('vue').PublicProps,
      {
        withHint: boolean;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        withHint?: boolean;
      }> &
        Readonly<{}>,
      {
        model: import('vue').WritableComputedRef<boolean, boolean>;
      },
      {},
      {},
      {},
      {
        withHint: boolean;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      withHint?: boolean;
    }> &
      Readonly<{}>,
    {
      model: import('vue').WritableComputedRef<boolean, boolean>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    {
      withHint: boolean;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        default?: (props: {}) => any;
      };
    });
  AddressBookInput: typeof AddressBookInput;
  AssetsFilter: import('vue').DefineComponent<
    {
      modelValue?: boolean;
      showOnlyVerifiedSwitch?: boolean;
    },
    {
      resetFilter: () => void;
      selectedFilter: import('vue').WritableComputedRef<WALLET_TYPES.FilterOptions, WALLET_TYPES.FilterOptions>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      'update:modelValue': (value: boolean) => any;
    },
    string,
    import('vue').PublicProps,
    Readonly<{
      modelValue?: boolean;
      showOnlyVerifiedSwitch?: boolean;
    }> &
      Readonly<{
        'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
      }>,
    {
      modelValue: boolean;
      showOnlyVerifiedSwitch: boolean;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  AssetList: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        assets?: import('@sora-substrate/sdk/build/assets/types').Asset[];
        size?: number;
        divider?: boolean;
        withClickableLogo?: boolean;
        selected?: import('@sora-substrate/sdk/build/assets/types').Asset[];
        selectable?: boolean;
        pinnable?: boolean;
        pinned?: import('@sora-substrate/sdk/build/assets/types').Asset[];
        withFiat?: boolean;
        withTabindex?: boolean;
      }> &
        Readonly<{}>,
      {
        wrap: any;
        barSize: import('vue').Ref<number, number>;
        barMove: import('vue').Ref<number, number>;
        scrollHeight: import('vue').Ref<number, number>;
        forwardedSlots: import('vue').ComputedRef<string[]>;
        wrapListeners: (
          asset: import('@sora-substrate/sdk/build/assets/types').Asset
        ) => Record<string, (...args: unknown[]) => void>;
        isEmptyList: import('vue').ComputedRef<boolean>;
        itemHeightValue: import('vue').ComputedRef<number>;
        gutterOffset: import('vue').ComputedRef<number>;
        style: import('vue').ComputedRef<{
          height: string;
          marginRight: string;
        }>;
        handleScroll: () => void;
        scrollTo: (value: number) => void;
        isSelected: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => boolean;
      },
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {},
      import('vue').PublicProps,
      {
        assets: import('@sora-substrate/sdk/build/assets/types').Asset[];
        size: number;
        withClickableLogo: boolean;
        selected: import('@sora-substrate/sdk/build/assets/types').Asset[];
        selectable: boolean;
        pinnable: boolean;
        pinned: import('@sora-substrate/sdk/build/assets/types').Asset[];
        withFiat: boolean;
        withTabindex: boolean;
        divider: boolean;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        assets?: import('@sora-substrate/sdk/build/assets/types').Asset[];
        size?: number;
        divider?: boolean;
        withClickableLogo?: boolean;
        selected?: import('@sora-substrate/sdk/build/assets/types').Asset[];
        selectable?: boolean;
        pinnable?: boolean;
        pinned?: import('@sora-substrate/sdk/build/assets/types').Asset[];
        withFiat?: boolean;
        withTabindex?: boolean;
      }> &
        Readonly<{}>,
      {
        wrap: any;
        barSize: import('vue').Ref<number, number>;
        barMove: import('vue').Ref<number, number>;
        scrollHeight: import('vue').Ref<number, number>;
        forwardedSlots: import('vue').ComputedRef<string[]>;
        wrapListeners: (
          asset: import('@sora-substrate/sdk/build/assets/types').Asset
        ) => Record<string, (...args: unknown[]) => void>;
        isEmptyList: import('vue').ComputedRef<boolean>;
        itemHeightValue: import('vue').ComputedRef<number>;
        gutterOffset: import('vue').ComputedRef<number>;
        style: import('vue').ComputedRef<{
          height: string;
          marginRight: string;
        }>;
        handleScroll: () => void;
        scrollTo: (value: number) => void;
        isSelected: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => boolean;
      },
      {},
      {},
      {},
      {
        assets: import('@sora-substrate/sdk/build/assets/types').Asset[];
        size: number;
        withClickableLogo: boolean;
        selected: import('@sora-substrate/sdk/build/assets/types').Asset[];
        selectable: boolean;
        pinnable: boolean;
        pinned: import('@sora-substrate/sdk/build/assets/types').Asset[];
        withFiat: boolean;
        withTabindex: boolean;
        divider: boolean;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      assets?: import('@sora-substrate/sdk/build/assets/types').Asset[];
      size?: number;
      divider?: boolean;
      withClickableLogo?: boolean;
      selected?: import('@sora-substrate/sdk/build/assets/types').Asset[];
      selectable?: boolean;
      pinnable?: boolean;
      pinned?: import('@sora-substrate/sdk/build/assets/types').Asset[];
      withFiat?: boolean;
      withTabindex?: boolean;
    }> &
      Readonly<{}>,
    {
      wrap: any;
      barSize: import('vue').Ref<number, number>;
      barMove: import('vue').Ref<number, number>;
      scrollHeight: import('vue').Ref<number, number>;
      forwardedSlots: import('vue').ComputedRef<string[]>;
      wrapListeners: (
        asset: import('@sora-substrate/sdk/build/assets/types').Asset
      ) => Record<string, (...args: unknown[]) => void>;
      isEmptyList: import('vue').ComputedRef<boolean>;
      itemHeightValue: import('vue').ComputedRef<number>;
      gutterOffset: import('vue').ComputedRef<number>;
      style: import('vue').ComputedRef<{
        height: string;
        marginRight: string;
      }>;
      handleScroll: () => void;
      scrollTo: (value: number) => void;
      isSelected: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => boolean;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    {
      assets: import('@sora-substrate/sdk/build/assets/types').Asset[];
      size: number;
      withClickableLogo: boolean;
      selected: import('@sora-substrate/sdk/build/assets/types').Asset[];
      selectable: boolean;
      pinnable: boolean;
      pinned: import('@sora-substrate/sdk/build/assets/types').Asset[];
      withFiat: boolean;
      withTabindex: boolean;
      divider: boolean;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        [x: string]: ((props: any) => any) | undefined;
      } & {
        'list-empty'?: (props: {}) => any;
      };
    });
  AssetListItem: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        asset: import('@sora-substrate/sdk/build/assets/types').Asset;
        withClickableLogo?: boolean;
        selected?: boolean;
        selectable?: boolean;
        pinnable?: boolean;
        pinned?: boolean;
        withFiat?: boolean;
        withTabindex?: boolean;
      }> &
        Readonly<{
          'onShow-details'?: ((asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any) | undefined;
          onPin?: ((asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any) | undefined;
        }>,
      {
        handleIconClick: (event: Event) => void;
        pin: (event: Event) => void;
      },
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {} & {
        'show-details': (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any;
        pin: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any;
      },
      import('vue').PublicProps,
      {
        withClickableLogo: boolean;
        selected: boolean;
        selectable: boolean;
        pinnable: boolean;
        pinned: boolean;
        withFiat: boolean;
        withTabindex: boolean;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        asset: import('@sora-substrate/sdk/build/assets/types').Asset;
        withClickableLogo?: boolean;
        selected?: boolean;
        selectable?: boolean;
        pinnable?: boolean;
        pinned?: boolean;
        withFiat?: boolean;
        withTabindex?: boolean;
      }> &
        Readonly<{
          'onShow-details'?: ((asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any) | undefined;
          onPin?: ((asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any) | undefined;
        }>,
      {
        handleIconClick: (event: Event) => void;
        pin: (event: Event) => void;
      },
      {},
      {},
      {},
      {
        withClickableLogo: boolean;
        selected: boolean;
        selectable: boolean;
        pinnable: boolean;
        pinned: boolean;
        withFiat: boolean;
        withTabindex: boolean;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      asset: import('@sora-substrate/sdk/build/assets/types').Asset;
      withClickableLogo?: boolean;
      selected?: boolean;
      selectable?: boolean;
      pinnable?: boolean;
      pinned?: boolean;
      withFiat?: boolean;
      withTabindex?: boolean;
    }> &
      Readonly<{
        'onShow-details'?: ((asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any) | undefined;
        onPin?: ((asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any) | undefined;
      }>,
    {
      handleIconClick: (event: Event) => void;
      pin: (event: Event) => void;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      'show-details': (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any;
      pin: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => any;
    },
    string,
    {
      withClickableLogo: boolean;
      selected: boolean;
      selectable: boolean;
      pinnable: boolean;
      pinned: boolean;
      withFiat: boolean;
      withTabindex: boolean;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        value?: (props: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          isMintable: boolean;
          content?: string;
          description?: string;
          type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
        }) => any;
      } & {
        append?: (props: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          isMintable: boolean;
          content?: string;
          description?: string;
          type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
        }) => any;
      } & {
        default?: (props: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          isMintable: boolean;
          content?: string;
          description?: string;
          type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
        }) => any;
      };
    });
  AddAssetDetailsCard: typeof AddAssetDetailsCard;
  ConfirmDialog: typeof ConfirmDialog;
  TokenAddress: import('vue').DefineComponent<
    {
      name?: string;
      symbol?: string;
      address?: string;
      externalAddress?: string;
      external?: boolean;
      showName?: boolean;
      symbols?: number | string;
      symbolsOffset?: number | string;
    },
    {
      tokenAddress: import('vue').ComputedRef<string>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    import('vue').PublicProps,
    Readonly<{
      name?: string;
      symbol?: string;
      address?: string;
      externalAddress?: string;
      external?: boolean;
      showName?: boolean;
      symbols?: number | string;
      symbolsOffset?: number | string;
    }> &
      Readonly<{}>,
    {
      symbol: string;
      address: string;
      name: string;
      symbols: number | string;
      symbolsOffset: number | string;
      externalAddress: string;
      external: boolean;
      showName: boolean;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  SearchInput: typeof SearchInput;
  InfoLine: typeof InfoLine;
  FormattedAmount: typeof FormattedAmount;
  FormattedAmountWithFiatValue: typeof FormattedAmountWithFiatValue;
  FileUploader: typeof FileUploader;
  TransactionHashView: import('vue').DefineComponent<
    {
      value: string;
      type: WALLET_CONSTS.HashType;
      translation: string;
      hash?: string;
      block?: string;
    },
    {
      handleCopyAddress: (address: string, event?: PointerEvent | MouseEvent | undefined) => Promise<void>;
      copyTooltip: (tooltipCopyValue?: string) => string;
      getExplorerTranslation: (type: WALLET_CONSTS.ExplorerType) => 'Polkadot' | 'SORAScan' | 'Subscan' | '';
      handleOpenEtherscan: () => void;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    import('vue').PublicProps,
    Readonly<{
      value: string;
      type: WALLET_CONSTS.HashType;
      translation: string;
      hash?: string;
      block?: string;
    }> &
      Readonly<{}>,
    {
      block: string;
      hash: string;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  NetworkFeeWarning: import('vue').DefineComponent<
    {
      fee?: string;
      symbol?: string;
      payoff?: boolean;
    },
    {
      hidePopup: import('vue').Ref<boolean, boolean>;
      handleConfirm: () => Promise<void>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      confirm: () => any;
    },
    string,
    import('vue').PublicProps,
    Readonly<{
      fee?: string;
      symbol?: string;
      payoff?: boolean;
    }> &
      Readonly<{
        onConfirm?: (() => any) | undefined;
      }>,
    {
      symbol: string;
      fee: string;
      payoff: boolean;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  TokenLogo: import('vue').DefineComponent<
    {
      tokenSymbol?: string;
      token?: Nullable<
        | import('@sora-substrate/sdk/build/assets/types').AccountAsset
        | import('@sora-substrate/sdk/build/assets/types').Asset
      >;
      size?: WALLET_CONSTS.LogoSize;
      withClickableLogo?: boolean;
    },
    {
      iconStyles: import('vue').ComputedRef<import('vue').CSSProperties>;
      iconClasses: import('vue').ComputedRef<string[]>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    import('vue').PublicProps,
    Readonly<{
      tokenSymbol?: string;
      token?: Nullable<
        | import('@sora-substrate/sdk/build/assets/types').AccountAsset
        | import('@sora-substrate/sdk/build/assets/types').Asset
      >;
      size?: WALLET_CONSTS.LogoSize;
      withClickableLogo?: boolean;
    }> &
      Readonly<{}>,
    {
      token:
        | import('@sora-substrate/sdk/build/assets/types').Asset
        | import('@sora-substrate/sdk/build/assets/types').AccountAsset
        | null;
      tokenSymbol: string;
      size: WALLET_CONSTS.LogoSize;
      withClickableLogo: boolean;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  NftDetails: typeof NftDetails;
  HistoryPagination: import('vue').DefineComponent<
    {
      currentPage?: number;
      pageAmount?: number;
      total?: number;
      loading?: boolean;
      lastPage?: number;
    },
    {
      handlePaginationClick: (button: WALLET_CONSTS.PaginationButton) => void;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      'pagination-click': (value: WALLET_CONSTS.PaginationButton) => any;
    },
    string,
    import('vue').PublicProps,
    Readonly<{
      currentPage?: number;
      pageAmount?: number;
      total?: number;
      loading?: boolean;
      lastPage?: number;
    }> &
      Readonly<{
        'onPagination-click'?: ((value: WALLET_CONSTS.PaginationButton) => any) | undefined;
      }>,
    {
      loading: boolean;
      total: number;
      pageAmount: number;
      currentPage: number;
      lastPage: number;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  DialogBase: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        visible: boolean;
        customClass?: string;
        title?: string;
        tooltip?: string;
        width?: string;
        showBack?: boolean;
        showCloseButton?: boolean;
      }> &
        Readonly<{
          onBack?: (() => any) | undefined;
          onClose?: (() => any) | undefined;
          'onUpdate:visible'?: ((value: boolean) => any) | undefined;
        }>,
      {},
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {} & {
        back: () => any;
        close: () => any;
        'update:visible': (value: boolean) => any;
      },
      import('vue').PublicProps,
      {
        title: string;
        tooltip: string;
        width: string;
        showBack: boolean;
        visible: boolean;
        customClass: string;
        showCloseButton: boolean;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        visible: boolean;
        customClass?: string;
        title?: string;
        tooltip?: string;
        width?: string;
        showBack?: boolean;
        showCloseButton?: boolean;
      }> &
        Readonly<{
          onBack?: (() => any) | undefined;
          onClose?: (() => any) | undefined;
          'onUpdate:visible'?: ((value: boolean) => any) | undefined;
        }>,
      {},
      {},
      {},
      {},
      {
        title: string;
        tooltip: string;
        width: string;
        showBack: boolean;
        visible: boolean;
        customClass: string;
        showCloseButton: boolean;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      visible: boolean;
      customClass?: string;
      title?: string;
      tooltip?: string;
      width?: string;
      showBack?: boolean;
      showCloseButton?: boolean;
    }> &
      Readonly<{
        onBack?: (() => any) | undefined;
        onClose?: (() => any) | undefined;
        'onUpdate:visible'?: ((value: boolean) => any) | undefined;
      }>,
    {},
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      back: () => any;
      close: () => any;
      'update:visible': (value: boolean) => any;
    },
    string,
    {
      title: string;
      tooltip: string;
      width: string;
      showBack: boolean;
      visible: boolean;
      customClass: string;
      showCloseButton: boolean;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        title?: (props: {}) => any;
      } & {
        'header-actions'?: (props: {}) => any;
      } & {
        default?: (props: {}) => any;
      } & {
        footer?: (props: {}) => any;
      };
    });
  NotificationEnablingPage: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{}> & Readonly<{}>,
      {},
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {},
      import('vue').PublicProps,
      {},
      true,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{}> & Readonly<{}>,
      {},
      {},
      {},
      {},
      {}
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{}> & Readonly<{}>,
    {},
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    {},
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        default?: (props: {}) => any;
      };
    });
  SimpleNotification: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<{
        success?: boolean;
        loading?: boolean;
        optional?: boolean;
        modalContent?: boolean;
        buttonText?: string;
        modelValue?: boolean;
      }> &
        Readonly<{
          'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
        }>,
      {},
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {} & {
        'update:modelValue': (value: boolean) => any;
      },
      import('vue').PublicProps,
      {
        loading: boolean;
        success: boolean;
        modelValue: boolean;
        optional: boolean;
        modalContent: boolean;
        buttonText: string;
      },
      false,
      {},
      {},
      import('vue').GlobalComponents,
      import('vue').GlobalDirectives,
      string,
      {},
      any,
      import('vue').ComponentProvideOptions,
      {
        P: {};
        B: {};
        D: {};
        C: {};
        M: {};
        Defaults: {};
      },
      Readonly<{
        success?: boolean;
        loading?: boolean;
        optional?: boolean;
        modalContent?: boolean;
        buttonText?: string;
        modelValue?: boolean;
      }> &
        Readonly<{
          'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
        }>,
      {},
      {},
      {},
      {},
      {
        loading: boolean;
        success: boolean;
        modelValue: boolean;
        optional: boolean;
        modalContent: boolean;
        buttonText: string;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<{
      success?: boolean;
      loading?: boolean;
      optional?: boolean;
      modalContent?: boolean;
      buttonText?: string;
      modelValue?: boolean;
    }> &
      Readonly<{
        'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
      }>,
    {},
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      'update:modelValue': (value: boolean) => any;
    },
    string,
    {
      loading: boolean;
      success: boolean;
      modelValue: boolean;
      optional: boolean;
      modalContent: boolean;
      buttonText: string;
    },
    {},
    string,
    {},
    import('vue').GlobalComponents,
    import('vue').GlobalDirectives,
    string,
    import('vue').ComponentProvideOptions
  > &
    import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps &
    (new () => {
      $slots: {
        title?: (props: {}) => any;
      } & {
        text?: (props: {}) => any;
      } & {
        default?: (props: {}) => any;
      };
    });
  ConnectionItems: typeof ConnectionItems;
  SyntheticSwitcher: import('vue').DefineComponent<
    {
      modelValue?: boolean;
    },
    {
      model: import('vue').WritableComputedRef<boolean, boolean>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {} & {
      'update:modelValue': (value: boolean) => any;
    },
    string,
    import('vue').PublicProps,
    Readonly<{
      modelValue?: boolean;
    }> &
      Readonly<{
        'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
      }>,
    {
      modelValue: boolean;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  ExternalLink: typeof ExternalLink;
  FormattedAddress: import('vue').DefineComponent<
    {
      value?: string;
      tooltipText?: string;
      symbols?: number | string;
      offset?: number | string;
      symbolsOffset?: number | string;
    },
    {
      handleCopyAddress: (address: string, event?: PointerEvent | MouseEvent | undefined) => Promise<void>;
      copyTooltip: (tooltipCopyValue?: string) => string;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {},
    string,
    import('vue').PublicProps,
    Readonly<{
      value?: string;
      tooltipText?: string;
      symbols?: number | string;
      offset?: number | string;
      symbolsOffset?: number | string;
    }> &
      Readonly<{}>,
    {
      value: string;
      tooltipText: string;
      symbols: number | string;
      offset: number | string;
      symbolsOffset: number | string;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    false,
    {},
    any
  >;
  AccountConnectionList: typeof AccountConnectionList;
  ExtensionConnectionList: typeof ExtensionConnectionList;
  ConnectionView: typeof ConnectionView;
  PinIcon: typeof PinIcon;
};
/**
 * Convenience export for the core mixins. These are kept separate so host
 * applications can register only the behaviors they need.
 */
declare const mixins: {
  NetworkFeeWarningMixin: typeof NetworkFeeWarningMixin;
  NumberFormatterMixin: typeof NumberFormatterMixin;
  FormattedAmountMixin: typeof FormattedAmountMixin;
  TransactionMixin: typeof TransactionMixin;
  TranslationMixin: typeof TranslationMixin;
  NotificationMixin: typeof NotificationMixin;
  LoadingMixin: typeof LoadingMixin;
  PaginationSearchMixin: typeof PaginationSearchMixin;
  CopyAddressMixin: typeof CopyAddressMixin;
  CameraPermissionMixin: typeof CameraPermissionMixin;
};
/**
 * Exposes Vuex utilities that allow consumers to interact with the wallet
 * store using decorators or manual module registration.
 */
declare const vuex: {
  walletModules: {
    wallet: {
      namespaced: true;
      modules: {
        account: {
          namespaced: true;
          state: import('./store/account/types').AccountState;
          mutations: {
            setFiatPriceObject(
              state: import('./store/account/types').AccountState,
              object: SUBQUERY_TYPES.FiatPriceObject
            ): void;
            updateFiatPriceObject(
              state: import('./store/account/types').AccountState,
              fiatPriceAndApyRecord?: SUBQUERY_TYPES.FiatPriceObject
            ): void;
            clearFiatPriceObject(state: import('./store/account/types').AccountState): void;
            setAlertSubject(
              state: import('./store/account/types').AccountState,
              alertSubject: import('rxjs').Subject<SUBQUERY_TYPES.FiatPriceObject>
            ): void;
            resetAlertSubscription(state: import('./store/account/types').AccountState): void;
            setFiatPriceSubscription(
              state: import('./store/account/types').AccountState,
              subscription: VoidFunction
            ): void;
            resetFiatPriceSubscription(state: import('./store/account/types').AccountState): void;
            setCeresFiatValuesUsage(state: import('./store/account/types').AccountState, flag: any): void;
            resetAccount(state: import('./store/account/types').AccountState): void;
            setAssetsSubscription(
              state: import('./store/account/types').AccountState,
              subscription: VoidFunction
            ): void;
            resetAssetsSubscription(state: import('./store/account/types').AccountState): void;
            setAccountAssetsSubscription(
              state: import('./store/account/types').AccountState,
              subscription: import('rxjs').Subscription
            ): void;
            resetAccountAssetsSubscription(state: import('./store/account/types').AccountState): void;
            syncWithStorage(state: import('./store/account/types').AccountState): void;
            setAssets(
              state: import('./store/account/types').AccountState,
              assets: Array<import('@sora-substrate/sdk/build/assets/types').Asset>
            ): void;
            setAccountAssets(
              state: import('./store/account/types').AccountState,
              accountAssets: Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>
            ): void;
            setPinnedAsset(
              state: import('./store/account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setMultiplePinnedAssets(
              state: import('./store/account/types').AccountState,
              pinnedAssetAddresses: string[]
            ): void;
            removePinnedAsset(
              state: import('./store/account/types').AccountState,
              pinnedAccountAsset: import('@sora-substrate/sdk/build/assets/types').AccountAsset
            ): void;
            setAssetToNotify(
              state: import('./store/account/types').AccountState,
              asset: import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem
            ): void;
            popAssetFromNotificationQueue(state: import('./store/account/types').AccountState): void;
            setWhitelist(
              state: import('./store/account/types').AccountState,
              whitelistArray: Array<import('@sora-substrate/sdk/build/assets/types').WhitelistArrayItem>
            ): void;
            setNftBlacklist(
              state: import('./store/account/types').AccountState,
              blacklistArray: import('@sora-substrate/sdk/build/assets/types').Blacklist
            ): void;
            clearWhitelist(state: import('./store/account/types').AccountState): void;
            clearBlacklist(state: import('./store/account/types').AccountState): void;
            setAvailableWallets(
              state: import('./store/account/types').AccountState,
              wallets: import('./services/wallet/types').Wallet[]
            ): void;
            setAccountPassphrase(
              state: import('./store/account/types').AccountState,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(state: import('./store/account/types').AccountState, address: string): void;
            setPasswordTimeout(state: import('./store/account/types').AccountState, timeout: number): void;
            setAccountPassphraseTimer(
              state: import('./store/account/types').AccountState,
              {
                address,
                timer,
              }: {
                address: string;
                timer: NodeJS.Timeout;
              }
            ): void;
            resetAccountPassphraseTimer(state: import('./store/account/types').AccountState, address: string): void;
            setIsDesktop(state: import('./store/account/types').AccountState, value: boolean): void;
            setAddressToBook(
              state: import('./store/account/types').AccountState,
              { address, name }: WALLET_TYPES.PolkadotJsAccount
            ): void;
            removeAddressFromBook(state: import('./store/account/types').AccountState, address: string): void;
            setIsMstAddressExist(state: import('./store/account/types').AccountState, isExist: boolean): void;
            setIsMST(state: import('./store/account/types').AccountState, isMST: boolean): void;
          };
          actions: {
            afterLogin(context: import('vuex').ActionContext<any, any>): Promise<void>;
            logout(context: import('vuex').ActionContext<any, any>): Promise<void>;
            checkWalletAvailability(context: import('vuex').ActionContext<any, any>): Promise<void>;
            checkConnectedAccountSource(context: import('vuex').ActionContext<any, any>, source: string): Promise<void>;
            updateAvailableWallets(context: import('vuex').ActionContext<any, any>): Promise<void>;
            loginAccount(
              context: import('vuex').ActionContext<any, any>,
              accountData: WALLET_TYPES.PolkadotJsAccount
            ): Promise<void>;
            renameAccount(
              context: import('vuex').ActionContext<any, any>,
              {
                address,
                name,
              }: {
                address: string;
                name: string;
              }
            ): Promise<void>;
            setAccountPassphrase(
              context: import('vuex').ActionContext<any, any>,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(context: import('vuex').ActionContext<any, any>, address: string): void;
            syncWithStorage(context: import('vuex').ActionContext<any, any>): Promise<void>;
            getAssets(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeOnAssets(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeOnAccountAssets(context: import('vuex').ActionContext<any, any>): Promise<void>;
            getWhitelist(context: import('vuex').ActionContext<any, any>): Promise<void>;
            getNftBlacklist(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeOnAlerts(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeOnFiatPrice(context: import('vuex').ActionContext<any, any>): Promise<void>;
            useCeresApiForFiatValues(context: import('vuex').ActionContext<any, any>, flag: boolean): Promise<void>;
            notifyOnDeposit(context: import('vuex').ActionContext<any, any>, data: any): Promise<void>;
            addAsset(_: import('vuex').ActionContext<any, any>, address?: string): Promise<void>;
            transfer(
              context: import('vuex').ActionContext<any, any>,
              {
                to,
                amount,
              }: {
                to: string;
                amount: string;
              }
            ): Promise<void>;
            getVestedTransferFee(
              context: import('vuex').ActionContext<any, any>,
              {
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
              }: import('./store/account/types').VestedTransferFeeParams
            ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
            vestedTransfer(
              context: import('vuex').ActionContext<any, any>,
              {
                to,
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
                start,
                current,
              }: import('./store/account/types').VestedTransferParams
            ): Promise<void>;
            resetAssetsSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetAccountAssetsSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetFiatPriceSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetAlertsSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
            initMultisigAddress(context: import('vuex').ActionContext<any, any>): void;
          };
          getters: {
            isLoggedIn(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): boolean;
            account(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): WALLET_TYPES.PolkadotJsAccount;
            assetsDataTable(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): WALLET_TYPES.AssetsTable;
            accountAssetsAddressTable(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): WALLET_TYPES.AccountAssetsTable;
            whitelist(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): import('@sora-substrate/sdk/build/assets/types').Whitelist;
            pinnedAssets(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk/build/assets/types').AccountAsset>;
            isAssetPinned(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (asset: import('@sora-substrate/sdk/build/assets/types').AccountAsset) => boolean;
            whitelistIdsBySymbol(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            getPassword(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (address: string) => Nullable<string>;
            blacklist(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): any;
            isConnectedAccount(
              state: import('./store/account/types').AccountState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): (account: WALLET_TYPES.PolkadotJsAccount) => boolean;
          };
        };
        router: {
          namespaced: true;
          state: import('./store/router/types').RouterState;
          mutations: {
            navigate(
              state: import('./store/router/types').RouterState,
              params: import('./store/router/types').Route
            ): void;
          };
          actions: {
            back(context: import('vuex').ActionContext<any, any>): Promise<void>;
            checkCurrentRoute(context: import('vuex').ActionContext<any, any>): Promise<void>;
          };
        };
        settings: {
          namespaced: true;
          state: import('./store/settings/types').SettingsState;
          mutations: {
            setIndexerType(
              state: import('./store/settings/types').SettingsState,
              indexerType: WALLET_CONSTS.IndexerType
            ): void;
            setIndexerStatus(
              state: import('./store/settings/types').SettingsState,
              {
                indexer,
                status,
              }: {
                indexer: WALLET_CONSTS.IndexerType;
                status: WALLET_TYPES.ConnectionStatus;
              }
            ): void;
            setIndexerEndpoint(
              state: import('./store/settings/types').SettingsState,
              {
                indexer,
                endpoint,
              }: {
                indexer: WALLET_CONSTS.IndexerType;
                endpoint: string;
              }
            ): void;
            setWalletLoaded(state: import('./store/settings/types').SettingsState, flag: boolean): void;
            setPermissions(
              state: import('./store/settings/types').SettingsState,
              permissions: WALLET_CONSTS.WalletPermissions
            ): void;
            setSoraNetwork(
              state: import('./store/settings/types').SettingsState,
              value: Nullable<WALLET_CONSTS.SoraNetwork>
            ): void;
            setNetworkFees(
              state: import('./store/settings/types').SettingsState,
              fees?: import('@sora-substrate/sdk').NetworkFeesObject
            ): void;
            updateNetworkFees(state: import('./store/settings/types').SettingsState, fees?: any): void;
            toggleHideBalance(state: import('./store/settings/types').SettingsState): void;
            setFilterOptions(
              state: import('./store/settings/types').SettingsState,
              filters: WALLET_CONSTS.WalletAssetFilters
            ): void;
            setAllowFeePopup(state: import('./store/settings/types').SettingsState, flag: boolean): void;
            setFeeMultiplier(state: import('./store/settings/types').SettingsState, multiplier: number): void;
            setRuntimeVersion(state: import('./store/settings/types').SettingsState, version: number): void;
            setBlockNumber(state: import('./store/settings/types').SettingsState, blockNumber: number): void;
            setBlockNumberSubscription(
              state: import('./store/settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetBlockNumberSubscription(state: import('./store/settings/types').SettingsState): void;
            setFeeMultiplierAndRuntimeSubscriptions(
              state: import('./store/settings/types').SettingsState,
              subscription: import('rxjs').Subscription
            ): void;
            resetFeeMultiplierAndRuntimeSubscriptions(state: import('./store/settings/types').SettingsState): void;
            setApiKeys(state: import('./store/settings/types').SettingsState, keys?: WALLET_TYPES.ApiKeysObject): void;
            setNftStorage(
              state: import('./store/settings/types').SettingsState,
              {
                marketplaceDid,
                ucan,
              }: {
                marketplaceDid?: string;
                ucan?: string;
              }
            ): void;
            setDepositNotifications(state: import('./store/settings/types').SettingsState, allow: boolean): void;
            addPriceAlert(state: import('./store/settings/types').SettingsState, alert: WALLET_TYPES.Alert): void;
            removePriceAlert(state: import('./store/settings/types').SettingsState, position: number): void;
            editPriceAlert(state: import('./store/settings/types').SettingsState, { alert, position }: any): void;
            setPriceAlertAsNotified(
              state: import('./store/settings/types').SettingsState,
              { position, value }: any
            ): void;
            setFiatCurrency(
              state: import('./store/settings/types').SettingsState,
              currency?: import('./types/currency').Currency
            ): void;
            setCurrencies(
              state: import('./store/settings/types').SettingsState,
              currencies: import('./types/currency').CurrencyFields[]
            ): void;
            updateFiatExchangeRates(
              state: import('./store/settings/types').SettingsState,
              newRates?: import('./types/currency').FiatExchangeRateObject
            ): void;
            setExchangeRateUnsubFn(state: import('./store/settings/types').SettingsState, unsubFn: VoidFunction): void;
            resetExchangeRateSubscription(state: import('./store/settings/types').SettingsState): void;
            setAssetsFilter(
              state: import('./store/settings/types').SettingsState,
              filter: WALLET_TYPES.FilterOptions
            ): void;
            setIsMstAvailable(state: import('./store/settings/types').SettingsState, isAvailable: boolean): void;
            setTheme(state: import('./store/settings/types').SettingsState, theme: WALLET_CONSTS.Theme): void;
          };
          actions: {
            setApiKeys(
              context: import('vuex').ActionContext<any, any>,
              keys: WALLET_TYPES.ApiKeysObject
            ): Promise<void>;
            createNftStorageInstance(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeOnFeeMultiplierAndRuntime(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetFeeMultiplierAndRuntimeSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeOnBlockNumber(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetBlockNumberSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
            selectIndexer(
              context: import('vuex').ActionContext<any, any>,
              indexerType?: WALLET_CONSTS.IndexerType
            ): Promise<void>;
            setIndexerStatus(
              context: import('vuex').ActionContext<any, any>,
              {
                indexer,
                status,
              }: {
                indexer: WALLET_CONSTS.IndexerType;
                status: WALLET_TYPES.ConnectionStatus;
              }
            ): Promise<void>;
            subscribeOnExchangeRatesApi(context: import('vuex').ActionContext<any, any>): Promise<void>;
            setTheme(context: import('vuex').ActionContext<any, any>, theme: WALLET_CONSTS.Theme): Promise<void>;
            toggleTheme(context: import('vuex').ActionContext<any, any>): Promise<void>;
          };
          getters: {
            currencySymbol(
              state: import('./store/settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): string;
            exchangeRate(
              state: import('./store/settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): number;
            libraryTheme(
              state: import('./store/settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): WALLET_CONSTS.Theme;
            libraryDesignSystem(
              state: import('./store/settings/types').SettingsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): WALLET_TYPES.LibraryDesignSystem;
          };
        };
        subscriptions: {
          namespaced: true;
          state: import('./store/subscriptions/types').SubscriptionsState;
          mutations: {
            setSubscription(
              state: import('./store/subscriptions/types').SubscriptionsState,
              newSubscription: Nullable<VoidFunction>
            ): void;
          };
          actions: {
            resetStorageUpdatesSubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
            subscribeToStorageUpdates(context: import('vuex').ActionContext<any, any>): Promise<void>;
            activateNetwokSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetNetworkSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
            activateIndexerSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetIndexerSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
            activateInternalSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetInternalSubscriptions(context: import('vuex').ActionContext<any, any>): Promise<void>;
          };
        };
        transactions: {
          namespaced: true;
          state: import('./store/transactions/types').TransactionsState;
          mutations: {
            setActiveTxsSubscription(
              state: import('./store/transactions/types').TransactionsState,
              subscription: NodeJS.Timeout | number
            ): void;
            resetActiveTxs(state: import('./store/transactions/types').TransactionsState): void;
            addActiveTx(state: import('./store/transactions/types').TransactionsState, id: string): void;
            removeActiveTxs(state: import('./store/transactions/types').TransactionsState, ids: Array<string>): void;
            removeHistoryByIds(state: import('./store/transactions/types').TransactionsState, ids: Array<string>): void;
            setTxDetailsId(state: import('./store/transactions/types').TransactionsState, id: string): void;
            resetTxDetailsId(state: import('./store/transactions/types').TransactionsState): void;
            getHistory(state: import('./store/transactions/types').TransactionsState): Promise<void>;
            setExternalHistory(
              state: import('./store/transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            setExternalHistoryUpdates(
              state: import('./store/transactions/types').TransactionsState,
              history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
            ): void;
            saveExternalHistoryUpdates(
              state: import('./store/transactions/types').TransactionsState,
              flag: boolean
            ): void;
            setExternalHistoryTotal(state: import('./store/transactions/types').TransactionsState, total?: any): void;
            resetExternalHistory(state: import('./store/transactions/types').TransactionsState): void;
            setExternalHistorySubscription(
              state: import('./store/transactions/types').TransactionsState,
              subscription: VoidFunction
            ): void;
            resetExternalHistorySubscription(state: import('./store/transactions/types').TransactionsState): void;
            setConfirmTxDialogDisabled(
              state: import('./store/transactions/types').TransactionsState,
              flag: boolean
            ): void;
            setSignTxDialogDisabled(state: import('./store/transactions/types').TransactionsState, flag: boolean): void;
            setSignTxDialogVisibility(
              state: import('./store/transactions/types').TransactionsState,
              visibility: boolean
            ): void;
            setPendingMstTxsSubscription(
              state: import('./store/transactions/types').TransactionsState,
              subscription: import('rxjs').Subscription | null
            ): void;
            resetPendingMstTxsSubscription(state: import('./store/transactions/types').TransactionsState): void;
            setPendingMstTransactions(
              state: import('./store/transactions/types').TransactionsState,
              transactions: import('@sora-substrate/sdk').HistoryItem[]
            ): void;
          };
          actions: {
            subscribeOnExternalHistory(context: import('vuex').ActionContext<any, any>): Promise<void>;
            getExternalHistory(
              context: import('vuex').ActionContext<any, any>,
              { address, assetAddress, pageAmount, page, query }?: import('./types/history').ExternalHistoryParams
            ): Promise<void>;
            trackActiveTxs(context: import('vuex').ActionContext<any, any>): Promise<void>;
            trackPendingMstTxs(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetPendingMstTxsSubscription(context: import('vuex').ActionContext<any, any>): void;
            getAccountHistory(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetActiveTxs(context: import('vuex').ActionContext<any, any>): Promise<void>;
            resetExternalHistorySubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
          };
          getters: {
            activeTxs(
              state: import('./store/transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Array<import('@sora-substrate/sdk').HistoryItem>;
            firstReadyTx(
              state: import('./store/transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
            selectedTx(
              state: import('./store/transactions/types').TransactionsState,
              getters: any,
              rootState: any,
              rootGetters: any
            ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
          };
        };
      };
    };
  };
  VuexOperation: typeof VuexOperation;
  attachDecorator: typeof attachDecorator;
  createDecoratorsObject: typeof createDecoratorsObject;
  WalletModules: string[];
};
export {
  initWallet,
  waitForCore,
  en,
  api,
  connection,
  storage,
  runtimeStorage,
  settingsStorage,
  getExplorerLinks,
  groupRewardsByAssetsList,
  formatAccountAddress,
  validateAddress,
  beforeTransactionSign,
  getAssetsSubset,
  WALLET_CONSTS,
  WALLET_TYPES,
  components,
  mixins,
  accountUtils,
  ScriptLoader,
  historyElementsFilter,
  AlertsApiService,
  getCurrentIndexer,
  SUBQUERY_TYPES,
  SUBSQUID_TYPES,
  INDEXER_TYPES,
  VUEX_TYPES,
  WC,
  vuex,
};
export { useDialogVisibility } from './composables/useDialog';
export { useNotification } from './composables/useNotification';
export { useTranslation } from './composables/useTranslation';
export { useNotificationStore } from './stores/notification';
export type { PluginOptions };
export default SoraWalletElements;
