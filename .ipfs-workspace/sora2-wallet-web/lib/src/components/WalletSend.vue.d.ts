import CopyAddressMixin from './mixins/CopyAddressMixin';
import FormattedAmountMixin from './mixins/FormattedAmountMixin';
import NetworkFeeWarningMixin from './mixins/NetworkFeeWarningMixin';
import TransactionMixin from './mixins/TransactionMixin';
import type { CodecString } from '@sora-substrate/sdk';
import type { AccountAsset, UnlockPeriodDays } from '@sora-substrate/sdk/build/assets/types';
declare const WalletSend_base: import('vue-class-component').VueConstructor<
  FormattedAmountMixin &
    NetworkFeeWarningMixin &
    TransactionMixin &
    CopyAddressMixin & {
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
export default class WalletSend extends WalletSend_base {
  readonly delimiters: {
    thousand: string;
    decimal: string;
  };
  readonly vestingPeriodsInDays: UnlockPeriodDays[];
  readonly disabledDate: (date: Date) => boolean;
  private previousRoute;
  private previousRouteParams;
  private currentRouteParams;
  private accountAssets;
  private isConfirmTxDisabled;
  private navigate;
  private transfer;
  private vestedTransfer;
  private getVestedTransferFee;
  step: number;
  address: string;
  name: string;
  amount: string;
  showAdditionalInfo: boolean;
  withVesting: boolean;
  selectedVestingPeriod: UnlockPeriodDays;
  vestingPercentage: string;
  vestingStart: number;
  private fee;
  private assetBalance;
  private assetBalanceSubscription;
  updateName(name: string): void;
  get recipient(): {
    address: string;
    name: string;
  };
  created(): void;
  beforeUnmount(): void;
  get assetParams(): AccountAsset;
  get accountAsset(): Nullable<AccountAsset>;
  get asset(): AccountAsset;
  get formattedFee(): string;
  get tooltipContent(): string;
  get copyValueAssetId(): string;
  get transferableBalance(): CodecString;
  get formattedBalance(): string;
  get assetFiatPrice(): Nullable<CodecString>;
  get fiatAmount(): Nullable<string>;
  get emptyAddress(): boolean;
  get isAccountAddress(): boolean;
  get formattedSoraAddress(): string;
  get validAddress(): boolean;
  get isNotSoraAddress(): boolean;
  get emptyAmount(): boolean;
  get validAmount(): boolean;
  get isMaxButtonAvailable(): boolean;
  get hasEnoughXor(): boolean;
  get sendButtonDisabled(): boolean;
  get sendButtonDisabledText(): string;
  get isXorAccountAsset(): boolean;
  get formattedVestingStart(): string;
  formatDuration(days: UnlockPeriodDays): string;
  fetchNetworkFee(): Promise<void>;
  readonly fetchNetworkFeeDebounced: import('lodash').DebouncedFunc<() => Promise<void>>;
  getFormattedAddress(asset: AccountAsset): string;
  handleBack(): void;
  handleMaxClick(): Promise<void>;
  handleSend(): Promise<void>;
  handleConfirm(): Promise<void>;
  confirmNextTxFailure(): void;
  private resetAssetBalanceSubscription;
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
