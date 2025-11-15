import { type WithKeyring } from '@sora-substrate/sdk';
import { AppWallet, LoginStep } from '../../consts';
import LoadingMixin from '../mixins/LoadingMixin';
import NotificationMixin from '../mixins/NotificationMixin';
import type { Wallet } from '../../services/wallet/types';
import type { CreateAccountArgs, RestoreAccountArgs } from '../../store/account/types';
import type { PolkadotJsAccount } from '../../types/common';
declare const ConnectionView_base: import('vue-class-component').VueConstructor<
  LoadingMixin &
    NotificationMixin & {
      $: import('vue').ComponentInternalInstance;
      $data: {};
      $props: Partial<{}> &
        Omit<
          {} & import('vue').VNodeProps & import('vue').AllowedComponentProps & import('vue').ComponentCustomProps,
          never
        >;
      $attrs: {
        [x: string]: unknown;
      };
      $refs: {
        [x: string]: unknown;
      };
      $slots: Readonly<{
        [name: string]: import('vue').Slot<any> | undefined;
      }>;
      $root: import('vue').ComponentPublicInstance | null;
      $parent: import('vue').ComponentPublicInstance | null;
      $host: Element | null;
      $emit: (event: string, ...args: any[]) => void;
      $el: any;
      $options: import('vue').ComponentOptionsBase<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        {},
        {},
        string,
        {},
        {},
        {},
        string,
        import('vue').ComponentProvideOptions
      > & {
        beforeCreate?: (() => void) | (() => void)[];
        created?: (() => void) | (() => void)[];
        beforeMount?: (() => void) | (() => void)[];
        mounted?: (() => void) | (() => void)[];
        beforeUpdate?: (() => void) | (() => void)[];
        updated?: (() => void) | (() => void)[];
        activated?: (() => void) | (() => void)[];
        deactivated?: (() => void) | (() => void)[];
        beforeDestroy?: (() => void) | (() => void)[];
        beforeUnmount?: (() => void) | (() => void)[];
        destroyed?: (() => void) | (() => void)[];
        unmounted?: (() => void) | (() => void)[];
        renderTracked?: ((e: import('vue').DebuggerEvent) => void) | ((e: import('vue').DebuggerEvent) => void)[];
        renderTriggered?: ((e: import('vue').DebuggerEvent) => void) | ((e: import('vue').DebuggerEvent) => void)[];
        errorCaptured?:
          | ((err: unknown, instance: import('vue').ComponentPublicInstance | null, info: string) => boolean | void)
          | ((err: unknown, instance: import('vue').ComponentPublicInstance | null, info: string) => boolean | void)[];
      };
      $forceUpdate: () => void;
      $nextTick: typeof import('vue').nextTick;
      $watch<T extends string | ((...args: any) => any)>(
        source: T,
        cb: T extends (...args: any) => infer R
          ? (...args: [R, R, import('@vue/reactivity').OnCleanup]) => any
          : (...args: [any, any, import('@vue/reactivity').OnCleanup]) => any,
        options?: import('vue').WatchOptions
      ): import('vue').WatchStopHandle;
    } & Readonly<{}> &
    Omit<unknown, never> &
    import('vue').ShallowUnwrapRef<{}> & {} & import('@vue/runtime-core').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class ConnectionView extends ConnectionView_base {
  readonly chainApi: WithKeyring;
  private readonly account;
  private readonly checkConnectedAccountSource;
  private readonly loginAccount;
  readonly logoutAccount: () => Promise<void>;
  readonly renameAccount: (data: { address: string; name: string }) => Promise<void>;
  private readonly closeView;
  private availableWallets;
  private isSignTxDialogDisabled;
  isMST: boolean;
  isMSTAvailable: boolean;
  private setIsMstAvailable;
  initMultisigAddress: () => void;
  private updateAvailableWallets;
  private setAccountPassphrase;
  step: LoginStep;
  accountLoginVisibility: boolean;
  accountLoginData: Nullable<PolkadotJsAccount>;
  selectedWallet: Nullable<AppWallet>;
  selectedWalletLoading: boolean;
  accounts: Array<PolkadotJsAccount>;
  accountsSubscription: Nullable<VoidFunction>;
  wcName: string;
  recommendedWallets: AppWallet[];
  private resetWalletAccountsSubscription;
  created(): void;
  private onChainUpdate;
  private updateWallets;
  private updateWcWallet;
  beforeUnmount(): void;
  get chainGenesisHash(): string;
  get connectedAccount(): string;
  get connectedWallet(): AppWallet;
  get isInternal(): boolean;
  get isAppStored(): boolean;
  get wallets(): {
    internal: Wallet[];
    external: Wallet[];
  };
  get selectedWalletTitle(): string;
  get viewTitle(): string;
  get hasAccounts(): boolean;
  get accountListText(): string;
  get isLoggedIn(): boolean;
  get logoutButtonVisibility(): boolean;
  get isCreateFlow(): boolean;
  get isImportFlow(): boolean;
  get isAccountList(): boolean;
  get isExtensionsList(): boolean;
  get prevStep(): LoginStep;
  get hasPrevStep(): boolean;
  get hasBackBtn(): boolean;
  navigateToCreateAccount(): void;
  navigateToImportAccount(): void;
  private navigateToAccountList;
  switchFromMSTBeforeLogout(): void;
  handleAccountImport(data: RestoreAccountArgs): Promise<void>;
  handleAccountCreate(data: CreateAccountArgs): Promise<void>;
  handleAccountSelect(account: PolkadotJsAccount, isConnected: boolean): Promise<void>;
  handleWalletSelect(wallet: Wallet): Promise<void>;
  handleWalletDisconnect(wallet: Wallet): Promise<void>;
  private setSelectedWallet;
  private setSelectedWalletLoading;
  private subscribeToWalletAccounts;
  private selectWallet;
  private resetSelectedWallet;
  private loadAccountJson;
  handleAccountLogin(password: string): Promise<void>;
  handleAccountExport(data: { address: string; password: string }): void;
  handleAccountDelete(address: string): void;
  handleAccountRestore(data: RestoreAccountArgs): void;
  handleBack(): void;
  handleAccountLogout(): void;
  private resetStep;
}
declare const __VLS_export: import('vue').DefineComponent<
  {},
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<{}> & Readonly<{}>,
  {},
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
