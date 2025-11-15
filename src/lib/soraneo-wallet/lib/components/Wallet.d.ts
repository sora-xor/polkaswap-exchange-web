import { PolkadotJsAccount } from '../types/common';
import { WalletTabs, AccountActionTypes, WalletPermissions } from '../consts';
import { default as AccountActionsMixin } from './mixins/AccountActionsMixin';
import { default as OperationsMixin } from './mixins/OperationsMixin';
import { default as QrCodeParserMixin } from './mixins/QrCodeParserMixin';
import { HistoryItem } from '@sora-substrate/sdk';

declare const Wallet_base: import('vue-class-component').VueConstructor<
  OperationsMixin &
    AccountActionsMixin &
    QrCodeParserMixin & {
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
    import('vue').ShallowUnwrapRef<{}> & {} & import('vue').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class Wallet extends Wallet_base {
  readonly WalletTabs: typeof WalletTabs;
  readonly accountActions: AccountActionTypes[];
  private currentRouteParams;
  permissions: WalletPermissions;
  isMSTAvailable: boolean;
  isExternal: boolean;
  isMST: boolean;
  isMstAddressExist: boolean;
  pendingMstTransactions: Array<any>;
  selectedTransaction: Nullable<HistoryItem>;
  accountOwn: PolkadotJsAccount;
  private resetTxDetailsId;
  currentTab: WalletTabs;
  accountSettingsVisibility: boolean;
  mstOnboardingDialog: boolean;
  dialogMSTNameChange: boolean;
  get headerTitle(): string;
  get isMSTAccount(): boolean;
  get hasMSTAccount(): boolean;
  mounted(): Promise<void>;
  handleSwap(asset: any): void;
  handleCreateToken(): void;
  handleSwitchAccount(): void;
  signTransaction(): void;
  handleEncrypt(): Promise<void>;
  handleMST(): void;
  handleAccountActionType(actionType: string): void;
  handleAccountSettings(): void;
  handleBack(): void;
  isMultisig(): boolean;
}
export {};
