import { AccountActionTypes, AppWallet } from '../../../consts';
import { default as LoadingMixin } from '../../mixins/LoadingMixin';
import { default as NotificationMixin } from '../../mixins/NotificationMixin';
import { PolkadotJsAccount } from '../../../types/common';
import { WithKeyring } from '@sora-substrate/sdk';

declare const AccountListStep_base: import('vue-class-component').VueConstructor<
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
    import('vue').ShallowUnwrapRef<{}> & {} & import('vue').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class AccountListStep extends AccountListStep_base {
  readonly chainApi: WithKeyring;
  readonly text: string;
  readonly isInternal: boolean;
  readonly selectedWallet: string;
  readonly connectedWallet: AppWallet;
  readonly connectedAccount: string;
  readonly accounts: Array<PolkadotJsAccount>;
  private readonly logoutAccount;
  private readonly renameAccount;
  private readonly exportAccount;
  private readonly deleteAccount;
  readonly accountActions: AccountActionTypes[];
  accountRenameVisibility: boolean;
  accountExportVisibility: boolean;
  accountDeleteVisibility: boolean;
  selectedAccount: Nullable<PolkadotJsAccount>;
  get noAccounts(): boolean;
  isConnectedAccount(account: PolkadotJsAccount): boolean;
  handleAccountAction(actionType: string, account: PolkadotJsAccount): void;
  handleRefreshClick(): void;
  handleSelectAccount(account: PolkadotJsAccount, isConnected: boolean): void;
  handleCreateAccount(): void;
  handleImportAccount(): void;
  handleRenameAccount(name: string): Promise<void>;
  handleExportAccount(password: string): Promise<void>;
  handleDeleteAccount(allowAccountDeletePopup?: boolean): Promise<void>;
}
export {};
