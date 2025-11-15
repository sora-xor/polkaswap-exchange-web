import { Pinia } from 'pinia';
import { api, connection } from './api';
import { default as AccountCard } from './components/Account/AccountCard';
import { default as WalletAvatar } from './components/Account/WalletAvatar';
import { default as AddAssetDetailsCard } from './components/AddAsset/AddAssetDetailsCard';
import { default as AddressBookInput } from './components/AddressBook/Input';
import { default as ConfirmDialog } from './components/ConfirmDialog';
import { default as ConnectionView } from './components/Connection/ConnectionView';
import { default as AccountConnectionList } from './components/Connection/List/Account';
import { default as ConnectionItems } from './components/Connection/List/ConnectionItems';
import { default as ExtensionConnectionList } from './components/Connection/List/Extension';
import { default as FileUploader } from './components/FileUploader';
import { default as FormattedAmount } from './components/FormattedAmount';
import { default as FormattedAmountWithFiatValue } from './components/FormattedAmountWithFiatValue';
import { default as InfoLine } from './components/InfoLine';
import { default as SearchInput } from './components/Input/SearchInput';
import { default as CameraPermissionMixin } from './components/mixins/CameraPermissionMixin';
import { default as CopyAddressMixin } from './components/mixins/CopyAddressMixin';
import { default as FormattedAmountMixin } from './components/mixins/FormattedAmountMixin';
import { default as LoadingMixin } from './components/mixins/LoadingMixin';
import { default as NetworkFeeWarningMixin } from './components/mixins/NetworkFeeWarningMixin';
import { default as NotificationMixin } from './components/mixins/NotificationMixin';
import { default as NumberFormatterMixin } from './components/mixins/NumberFormatterMixin';
import { default as PaginationSearchMixin } from './components/mixins/PaginationSearchMixin';
import { default as TransactionMixin } from './components/mixins/TransactionMixin';
import { default as TranslationMixin } from './components/mixins/TranslationMixin';
import { default as NftDetails } from './components/NftDetails';
import { default as PinIcon } from './components/PinIcon';
import { default as ExternalLink } from './components/shared/ExternalLink';
import { default as WalletFee } from './components/WalletFee';
import { default as en } from './lang/en';
import { default as AlertsApiService } from './services/alerts';
import { getCurrentIndexer } from './services/indexer';
import { historyElementsFilter } from './services/indexer/subsquid/queries/historyElements';
import { default as SoraWallet } from './SoraWallet';
import { default as internalStore } from './store';
import { attachDecorator, createDecoratorsObject, VuexOperation } from './store/util';
import {
  getExplorerLinks,
  groupRewardsByAssetsList,
  formatAccountAddress,
  validateAddress,
  beforeTransactionSign,
  getAssetsSubset,
} from './util';
import { ScriptLoader } from './util/scriptLoader';
import { storage, runtimeStorage, settingsStorage } from './util/storage';
import { Plugin } from 'vue';

import * as WALLET_CONSTS from './consts';
import * as SUBQUERY_TYPES from './services/indexer/subquery/types';
import * as SUBSQUID_TYPES from './services/indexer/subsquid/types';
import * as INDEXER_TYPES from './services/indexer/types';
import * as WC from './services/walletconnect';
import * as VUEX_TYPES from './store/types';
import * as WALLET_TYPES from './types/common';
import * as accountUtils from './util/account';
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
      Readonly<
        import('vue').ExtractPropTypes<{
          polkadotAccount: {
            type: import('vue').PropType<WALLET_TYPES.PolkadotJsAccount | null>;
            default: null;
          };
          withIdentity: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          chainApi: {
            type: import('vue').PropType<import('@sora-substrate/sdk').WithConnectionApi | null>;
            default: null;
          };
        }>
      > &
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
      {
        identity: (identity: Nullable<WALLET_TYPES.AccountIdentity>) => void;
      },
      import('vue').PublicProps,
      {
        polkadotAccount: WALLET_TYPES.PolkadotJsAccount | null;
        withIdentity: boolean;
        chainApi: import('@sora-substrate/sdk').WithConnectionApi | null;
      },
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
      Readonly<
        import('vue').ExtractPropTypes<{
          polkadotAccount: {
            type: import('vue').PropType<WALLET_TYPES.PolkadotJsAccount | null>;
            default: null;
          };
          withIdentity: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          chainApi: {
            type: import('vue').PropType<import('@sora-substrate/sdk').WithConnectionApi | null>;
            default: null;
          };
        }>
      > &
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
    Readonly<
      import('vue').ExtractPropTypes<{
        polkadotAccount: {
          type: import('vue').PropType<WALLET_TYPES.PolkadotJsAccount | null>;
          default: null;
        };
        withIdentity: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        chainApi: {
          type: import('vue').PropType<import('@sora-substrate/sdk').WithConnectionApi | null>;
          default: null;
        };
      }>
    > &
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
    {
      identity: (identity: Nullable<WALLET_TYPES.AccountIdentity>) => void;
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
        default?(_: {}): any;
      };
    });
  WalletAvatar: typeof WalletAvatar;
  WalletBase: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<
        import('vue').ExtractPropTypes<{
          title: {
            type: import('vue').PropType<string>;
            default: string;
          };
          tooltip: {
            type: import('vue').PropType<string>;
            default: string;
          };
          showBack: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          titleCenter: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          showClose: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          showHeader: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          resetFocus: {
            type: import('vue').PropType<string>;
            default: string;
          };
        }>
      > &
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
      {
        back: () => void;
        close: () => void;
      },
      import('vue').PublicProps,
      {
        title: string;
        tooltip: string;
        showBack: boolean;
        titleCenter: boolean;
        showClose: boolean;
        showHeader: boolean;
        resetFocus: string;
      },
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
      Readonly<
        import('vue').ExtractPropTypes<{
          title: {
            type: import('vue').PropType<string>;
            default: string;
          };
          tooltip: {
            type: import('vue').PropType<string>;
            default: string;
          };
          showBack: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          titleCenter: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          showClose: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          showHeader: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          resetFocus: {
            type: import('vue').PropType<string>;
            default: string;
          };
        }>
      > &
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
        showBack: boolean;
        titleCenter: boolean;
        showClose: boolean;
        showHeader: boolean;
        resetFocus: string;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<
      import('vue').ExtractPropTypes<{
        title: {
          type: import('vue').PropType<string>;
          default: string;
        };
        tooltip: {
          type: import('vue').PropType<string>;
          default: string;
        };
        showBack: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        titleCenter: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        showClose: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        showHeader: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        resetFocus: {
          type: import('vue').PropType<string>;
          default: string;
        };
      }>
    > &
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
    {
      back: () => void;
      close: () => void;
    },
    string,
    {
      title: string;
      tooltip: string;
      showBack: boolean;
      titleCenter: boolean;
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
        actions?(_: {}): any;
        default?(_: {}): any;
      };
    });
  WalletFee: typeof WalletFee;
  AccountCard: typeof AccountCard;
  AccountConfirmationOption: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<
        import('vue').ExtractPropTypes<{
          withHint: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
      Readonly<
        import('vue').ExtractPropTypes<{
          withHint: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
    Readonly<
      import('vue').ExtractPropTypes<{
        withHint: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
        default?(_: {}): any;
      };
    });
  AddressBookInput: typeof AddressBookInput;
  AssetsFilter: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      modelValue: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
      showOnlyVerifiedSwitch: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
    }>,
    {
      resetFilter: () => void;
      selectedFilter: import('vue').WritableComputedRef<WALLET_TYPES.FilterOptions, WALLET_TYPES.FilterOptions>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {
      'update:modelValue': (value: boolean) => void;
    },
    string,
    import('vue').PublicProps,
    Readonly<
      import('vue').ExtractPropTypes<{
        modelValue: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        showOnlyVerifiedSwitch: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
    true,
    {},
    any
  >;
  AssetList: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<
        import('vue').ExtractPropTypes<{
          assets: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
            default: () => never[];
          };
          size: {
            type: import('vue').PropType<number>;
            default: number;
          };
          withClickableLogo: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          selected: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
            default: () => never[];
          };
          selectable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinnable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinned: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
            default: () => never[];
          };
          withFiat: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          withTabindex: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          divider: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
      Readonly<
        import('vue').ExtractPropTypes<{
          assets: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
            default: () => never[];
          };
          size: {
            type: import('vue').PropType<number>;
            default: number;
          };
          withClickableLogo: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          selected: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
            default: () => never[];
          };
          selectable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinnable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinned: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
            default: () => never[];
          };
          withFiat: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          withTabindex: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          divider: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
    Readonly<
      import('vue').ExtractPropTypes<{
        assets: {
          type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
          default: () => never[];
        };
        size: {
          type: import('vue').PropType<number>;
          default: number;
        };
        withClickableLogo: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        selected: {
          type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
          default: () => never[];
        };
        selectable: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        pinnable: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        pinned: {
          type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset[]>;
          default: () => never[];
        };
        withFiat: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        withTabindex: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        divider: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
      $slots: Partial<Record<string, (_: any) => any>> & {
        'list-empty'?(_: {}): any;
      };
    });
  AssetListItem: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<
        import('vue').ExtractPropTypes<{
          asset: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset>;
            required: true;
          };
          withClickableLogo: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          selected: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          selectable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinnable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinned: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          withFiat: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          withTabindex: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
      {
        'show-details': (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => void;
        pin: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => void;
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
      Readonly<
        import('vue').ExtractPropTypes<{
          asset: {
            type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset>;
            required: true;
          };
          withClickableLogo: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          selected: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          selectable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinnable: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          pinned: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          withFiat: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          withTabindex: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
    Readonly<
      import('vue').ExtractPropTypes<{
        asset: {
          type: import('vue').PropType<import('@sora-substrate/sdk/build/assets/types').Asset>;
          required: true;
        };
        withClickableLogo: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        selected: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        selectable: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        pinnable: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        pinned: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        withFiat: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        withTabindex: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
    {
      'show-details': (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => void;
      pin: (asset: import('@sora-substrate/sdk/build/assets/types').Asset) => void;
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
        value?(_: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          isMintable: boolean;
          content?: string;
          description?: string;
          type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
        }): any;
        append?(_: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          isMintable: boolean;
          content?: string;
          description?: string;
          type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
        }): any;
        default?(_: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          isMintable: boolean;
          content?: string;
          description?: string;
          type?: import('@sora-substrate/sdk/build/assets/types').AssetType;
        }): any;
      };
    });
  AddAssetDetailsCard: typeof AddAssetDetailsCard;
  ConfirmDialog: typeof ConfirmDialog;
  TokenAddress: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      symbol: {
        type: import('vue').PropType<string>;
        default: string;
      };
      address: {
        type: import('vue').PropType<string>;
        default: string;
      };
      name: {
        type: import('vue').PropType<string>;
        default: string;
      };
      symbols: {
        type: import('vue').PropType<string | number>;
        default: number;
      };
      symbolsOffset: {
        type: import('vue').PropType<string | number>;
        default: number;
      };
      externalAddress: {
        type: import('vue').PropType<string>;
        default: string;
      };
      external: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
      showName: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
    }>,
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
    Readonly<
      import('vue').ExtractPropTypes<{
        symbol: {
          type: import('vue').PropType<string>;
          default: string;
        };
        address: {
          type: import('vue').PropType<string>;
          default: string;
        };
        name: {
          type: import('vue').PropType<string>;
          default: string;
        };
        symbols: {
          type: import('vue').PropType<string | number>;
          default: number;
        };
        symbolsOffset: {
          type: import('vue').PropType<string | number>;
          default: number;
        };
        externalAddress: {
          type: import('vue').PropType<string>;
          default: string;
        };
        external: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        showName: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
    true,
    {},
    any
  >;
  SearchInput: typeof SearchInput;
  InfoLine: typeof InfoLine;
  FormattedAmount: typeof FormattedAmount;
  FormattedAmountWithFiatValue: typeof FormattedAmountWithFiatValue;
  FileUploader: typeof FileUploader;
  TransactionHashView: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      block: {
        type: import('vue').PropType<string>;
        default: string;
      };
      type: {
        type: import('vue').PropType<WALLET_CONSTS.HashType>;
        required: true;
      };
      value: {
        type: import('vue').PropType<string>;
        required: true;
      };
      hash: {
        type: import('vue').PropType<string>;
        default: string;
      };
      translation: {
        type: import('vue').PropType<string>;
        required: true;
      };
    }>,
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
    Readonly<
      import('vue').ExtractPropTypes<{
        block: {
          type: import('vue').PropType<string>;
          default: string;
        };
        type: {
          type: import('vue').PropType<WALLET_CONSTS.HashType>;
          required: true;
        };
        value: {
          type: import('vue').PropType<string>;
          required: true;
        };
        hash: {
          type: import('vue').PropType<string>;
          default: string;
        };
        translation: {
          type: import('vue').PropType<string>;
          required: true;
        };
      }>
    > &
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
    true,
    {},
    any
  >;
  NetworkFeeWarning: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      symbol: {
        type: import('vue').PropType<string>;
        default: import('@sora-substrate/sdk/build/assets/consts').KnownSymbols;
      };
      fee: {
        type: import('vue').PropType<string>;
        default: undefined;
      };
      payoff: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
    }>,
    {
      hidePopup: import('vue').Ref<boolean, boolean>;
      handleConfirm: () => Promise<void>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {
      confirm: () => void;
    },
    string,
    import('vue').PublicProps,
    Readonly<
      import('vue').ExtractPropTypes<{
        symbol: {
          type: import('vue').PropType<string>;
          default: import('@sora-substrate/sdk/build/assets/consts').KnownSymbols;
        };
        fee: {
          type: import('vue').PropType<string>;
          default: undefined;
        };
        payoff: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
    true,
    {},
    any
  >;
  TokenLogo: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      size: {
        type: import('vue').PropType<WALLET_CONSTS.LogoSize>;
        default: WALLET_CONSTS.LogoSize;
      };
      token: {
        type: import('vue').PropType<
          | import('@sora-substrate/sdk/build/assets/types').Asset
          | import('@sora-substrate/sdk/build/assets/types').AccountAsset
          | null
        >;
        default: null;
      };
      tokenSymbol: {
        type: import('vue').PropType<string>;
        default: string;
      };
      withClickableLogo: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
    }>,
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
    Readonly<
      import('vue').ExtractPropTypes<{
        size: {
          type: import('vue').PropType<WALLET_CONSTS.LogoSize>;
          default: WALLET_CONSTS.LogoSize;
        };
        token: {
          type: import('vue').PropType<
            | import('@sora-substrate/sdk/build/assets/types').Asset
            | import('@sora-substrate/sdk/build/assets/types').AccountAsset
            | null
          >;
          default: null;
        };
        tokenSymbol: {
          type: import('vue').PropType<string>;
          default: string;
        };
        withClickableLogo: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
      Readonly<{}>,
    {
      size: WALLET_CONSTS.LogoSize;
      token:
        | import('@sora-substrate/sdk/build/assets/types').Asset
        | import('@sora-substrate/sdk/build/assets/types').AccountAsset
        | null;
      tokenSymbol: string;
      withClickableLogo: boolean;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    true,
    {},
    any
  >;
  NftDetails: typeof NftDetails;
  HistoryPagination: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      loading: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
      pageAmount: {
        type: import('vue').PropType<number>;
        default: number;
      };
      total: {
        type: import('vue').PropType<number>;
        default: number;
      };
      currentPage: {
        type: import('vue').PropType<number>;
        default: number;
      };
      lastPage: {
        type: import('vue').PropType<number>;
        default: number;
      };
    }>,
    {
      handlePaginationClick: (button: WALLET_CONSTS.PaginationButton) => void;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {
      'pagination-click': (value: WALLET_CONSTS.PaginationButton) => void;
    },
    string,
    import('vue').PublicProps,
    Readonly<
      import('vue').ExtractPropTypes<{
        loading: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        pageAmount: {
          type: import('vue').PropType<number>;
          default: number;
        };
        total: {
          type: import('vue').PropType<number>;
          default: number;
        };
        currentPage: {
          type: import('vue').PropType<number>;
          default: number;
        };
        lastPage: {
          type: import('vue').PropType<number>;
          default: number;
        };
      }>
    > &
      Readonly<{
        'onPagination-click'?: ((value: WALLET_CONSTS.PaginationButton) => any) | undefined;
      }>,
    {
      loading: boolean;
      pageAmount: number;
      total: number;
      currentPage: number;
      lastPage: number;
    },
    {},
    {},
    {},
    string,
    import('vue').ComponentProvideOptions,
    true,
    {},
    any
  >;
  DialogBase: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<
        import('vue').ExtractPropTypes<{
          title: {
            type: import('vue').PropType<string>;
            default: string;
          };
          width: {
            type: import('vue').PropType<string>;
            default: string;
          };
          tooltip: {
            type: import('vue').PropType<string>;
            default: string;
          };
          visible: {
            type: import('vue').PropType<boolean>;
            required: true;
            default: boolean;
          };
          customClass: {
            type: import('vue').PropType<string>;
            default: string;
          };
          showBack: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          showCloseButton: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
      {
        'update:visible': (value: boolean) => void;
        close: () => void;
        back: () => void;
      },
      import('vue').PublicProps,
      {
        title: string;
        width: string;
        tooltip: string;
        visible: boolean;
        customClass: string;
        showBack: boolean;
        showCloseButton: boolean;
      },
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
      Readonly<
        import('vue').ExtractPropTypes<{
          title: {
            type: import('vue').PropType<string>;
            default: string;
          };
          width: {
            type: import('vue').PropType<string>;
            default: string;
          };
          tooltip: {
            type: import('vue').PropType<string>;
            default: string;
          };
          visible: {
            type: import('vue').PropType<boolean>;
            required: true;
            default: boolean;
          };
          customClass: {
            type: import('vue').PropType<string>;
            default: string;
          };
          showBack: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          showCloseButton: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
        }>
      > &
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
        width: string;
        tooltip: string;
        visible: boolean;
        customClass: string;
        showBack: boolean;
        showCloseButton: boolean;
      }
    >;
    __isFragment?: never;
    __isTeleport?: never;
    __isSuspense?: never;
  } & import('vue').ComponentOptionsBase<
    Readonly<
      import('vue').ExtractPropTypes<{
        title: {
          type: import('vue').PropType<string>;
          default: string;
        };
        width: {
          type: import('vue').PropType<string>;
          default: string;
        };
        tooltip: {
          type: import('vue').PropType<string>;
          default: string;
        };
        visible: {
          type: import('vue').PropType<boolean>;
          required: true;
          default: boolean;
        };
        customClass: {
          type: import('vue').PropType<string>;
          default: string;
        };
        showBack: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        showCloseButton: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
    {
      'update:visible': (value: boolean) => void;
      close: () => void;
      back: () => void;
    },
    string,
    {
      title: string;
      width: string;
      tooltip: string;
      visible: boolean;
      customClass: string;
      showBack: boolean;
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
        title?(_: {}): any;
        'header-actions'?(_: {}): any;
        default?(_: {}): any;
        footer?(_: {}): any;
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
        default?(_: {}): any;
      };
    });
  SimpleNotification: {
    new (...args: any[]): import('vue').CreateComponentPublicInstanceWithMixins<
      Readonly<
        import('vue').ExtractPropTypes<{
          loading: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          success: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          modelValue: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          optional: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          modalContent: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          buttonText: {
            type: import('vue').PropType<string>;
            default: string;
          };
        }>
      > &
        Readonly<{
          'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
        }>,
      {},
      {},
      {},
      {},
      import('vue').ComponentOptionsMixin,
      import('vue').ComponentOptionsMixin,
      {
        'update:modelValue': (value: boolean) => void;
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
      Readonly<
        import('vue').ExtractPropTypes<{
          loading: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          success: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          modelValue: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          optional: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          modalContent: {
            type: import('vue').PropType<boolean>;
            default: boolean;
          };
          buttonText: {
            type: import('vue').PropType<string>;
            default: string;
          };
        }>
      > &
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
    Readonly<
      import('vue').ExtractPropTypes<{
        loading: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        success: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        modelValue: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        optional: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        modalContent: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
        buttonText: {
          type: import('vue').PropType<string>;
          default: string;
        };
      }>
    > &
      Readonly<{
        'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
      }>,
    {},
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {
      'update:modelValue': (value: boolean) => void;
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
        title?(_: {}): any;
        text?(_: {}): any;
        default?(_: {}): any;
      };
    });
  ConnectionItems: typeof ConnectionItems;
  SyntheticSwitcher: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      modelValue: {
        type: import('vue').PropType<boolean>;
        default: boolean;
      };
    }>,
    {
      model: import('vue').WritableComputedRef<boolean, boolean>;
    },
    {},
    {},
    {},
    import('vue').ComponentOptionsMixin,
    import('vue').ComponentOptionsMixin,
    {
      'update:modelValue': (value: boolean) => void;
    },
    string,
    import('vue').PublicProps,
    Readonly<
      import('vue').ExtractPropTypes<{
        modelValue: {
          type: import('vue').PropType<boolean>;
          default: boolean;
        };
      }>
    > &
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
    true,
    {},
    any
  >;
  ExternalLink: typeof ExternalLink;
  FormattedAddress: import('vue').DefineComponent<
    import('vue').ExtractPropTypes<{
      value: {
        type: import('vue').PropType<string>;
        default: string;
      };
      tooltipText: {
        type: import('vue').PropType<string>;
        default: string;
      };
      symbols: {
        type: import('vue').PropType<string | number>;
        default: number;
      };
      offset: {
        type: import('vue').PropType<string | number>;
        default: number;
      };
      symbolsOffset: {
        type: import('vue').PropType<string | number>;
        default: number;
      };
    }>,
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
    Readonly<
      import('vue').ExtractPropTypes<{
        value: {
          type: import('vue').PropType<string>;
          default: string;
        };
        tooltipText: {
          type: import('vue').PropType<string>;
          default: string;
        };
        symbols: {
          type: import('vue').PropType<string | number>;
          default: number;
        };
        offset: {
          type: import('vue').PropType<string | number>;
          default: number;
        };
        symbolsOffset: {
          type: import('vue').PropType<string | number>;
          default: number;
        };
      }>
    > &
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
    true,
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
            afterLogin(context: ActionContext<any, any>): Promise<void>;
            logout(context: ActionContext<any, any>): Promise<void>;
            checkWalletAvailability(context: ActionContext<any, any>): Promise<void>;
            checkConnectedAccountSource(context: ActionContext<any, any>, source: string): Promise<void>;
            updateAvailableWallets(context: ActionContext<any, any>): Promise<void>;
            loginAccount(context: ActionContext<any, any>, accountData: WALLET_TYPES.PolkadotJsAccount): Promise<void>;
            renameAccount(
              context: ActionContext<any, any>,
              {
                address,
                name,
              }: {
                address: string;
                name: string;
              }
            ): Promise<void>;
            setAccountPassphrase(
              context: ActionContext<any, any>,
              {
                address,
                password,
              }: {
                address: string;
                password: string;
              }
            ): void;
            resetAccountPassphrase(context: ActionContext<any, any>, address: string): void;
            syncWithStorage(context: ActionContext<any, any>): Promise<void>;
            getAssets(context: ActionContext<any, any>): Promise<void>;
            subscribeOnAssets(context: ActionContext<any, any>): Promise<void>;
            subscribeOnAccountAssets(context: ActionContext<any, any>): Promise<void>;
            getWhitelist(context: ActionContext<any, any>): Promise<void>;
            getNftBlacklist(context: ActionContext<any, any>): Promise<void>;
            subscribeOnAlerts(context: ActionContext<any, any>): Promise<void>;
            subscribeOnFiatPrice(context: ActionContext<any, any>): Promise<void>;
            useCeresApiForFiatValues(context: ActionContext<any, any>, flag: boolean): Promise<void>;
            notifyOnDeposit(context: ActionContext<any, any>, data: any): Promise<void>;
            addAsset(_: ActionContext<any, any>, address?: string): Promise<void>;
            transfer(
              context: ActionContext<any, any>,
              {
                to,
                amount,
              }: {
                to: string;
                amount: string;
              }
            ): Promise<void>;
            getVestedTransferFee(
              context: ActionContext<any, any>,
              {
                asset,
                amount,
                vestingPercent,
                unlockPeriodInDays,
              }: import('./store/account/types').VestedTransferFeeParams
            ): Promise<Nullable<import('@sora-substrate/math').FPNumber>>;
            vestedTransfer(
              context: ActionContext<any, any>,
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
            resetAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAccountAssetsSubscription(context: ActionContext<any, any>): Promise<void>;
            resetFiatPriceSubscription(context: ActionContext<any, any>): Promise<void>;
            resetAlertsSubscription(context: ActionContext<any, any>): Promise<void>;
            initMultisigAddress(context: ActionContext<any, any>): void;
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
            back(context: ActionContext<any, any>): Promise<void>;
            checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
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
            setApiKeys(context: ActionContext<any, any>, keys: WALLET_TYPES.ApiKeysObject): Promise<void>;
            createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
            subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
            resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
            subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
            resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
            selectIndexer(context: ActionContext<any, any>, indexerType?: WALLET_CONSTS.IndexerType): Promise<void>;
            setIndexerStatus(
              context: ActionContext<any, any>,
              {
                indexer,
                status,
              }: {
                indexer: WALLET_CONSTS.IndexerType;
                status: WALLET_TYPES.ConnectionStatus;
              }
            ): Promise<void>;
            subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
            setTheme(context: ActionContext<any, any>, theme: WALLET_CONSTS.Theme): Promise<void>;
            toggleTheme(context: ActionContext<any, any>): Promise<void>;
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
            resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
            subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
            activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
            activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
            resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
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
            subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
            getExternalHistory(
              context: ActionContext<any, any>,
              { address, assetAddress, pageAmount, page, query }?: import('./types/history').ExternalHistoryParams
            ): Promise<void>;
            trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
            trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
            resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
            getAccountHistory(context: ActionContext<any, any>): Promise<void>;
            resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
            resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
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
