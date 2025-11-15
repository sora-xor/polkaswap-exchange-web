import { HashType } from '../consts';
import EthBridgeTransactionMixin from './mixins/EthBridgeTransactionMixin';
import NotificationMixin from './mixins/NotificationMixin';
import NumberFormatterMixin from './mixins/NumberFormatterMixin';
import TranslationMixin from './mixins/TranslationMixin';
import type { HistoryItem } from '@sora-substrate/sdk';
declare const WalletTransactionDetails_base: import('vue-class-component').VueConstructor<
  TranslationMixin &
    NotificationMixin &
    NumberFormatterMixin &
    EthBridgeTransactionMixin & {
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
export default class WalletTransactionDetails extends WalletTransactionDetails_base {
  readonly HashType: typeof HashType;
  private blockNumber;
  private assetsDataTable;
  private account;
  selectedTransaction: HistoryItem;
  minAmountOfXorForSign: number;
  currentAmountOfXorSignerHas: number;
  mounted(): void;
  private fetchMinAmountOfXorOnChange;
  get isCompleteTransaction(): boolean;
  get isFailedTransaction(): boolean;
  get statusClass(): Array<string>;
  get statusTitle(): string;
  get transactionAmount(): string;
  get transactionAmountUSD(): string;
  get transactionAmount2(): string;
  get transactionAmount2USD(): string;
  get transactionSymbol(): string;
  get transactionSymbol2(): string;
  get isRecipient(): boolean;
  get transactionFee(): Nullable<string>;
  get transactionFromDate(): Nullable<string>;
  get transactionFromAddress(): Nullable<string>;
  get transactionToAddress(): Nullable<string>;
  get transactionFromHash(): {
    value: Nullable<string>;
    hash: Nullable<string>;
    translation: string;
    type: HashType;
    block: Nullable<string>;
  };
  get transactionComment(): Nullable<string>;
  get isSetReferralOperation(): boolean;
  get vestingPercentage(): Nullable<string>;
  get vestingPeriod(): Nullable<string>;
  get vestingStartDate(): Nullable<string>;
  get isReferrer(): boolean;
  get errorMessage(): Nullable<string>;
  get isAdarOperation(): boolean;
  get networkFeeSymbol(): string;
  get isTransactionToCompleted(): boolean;
  get isMST(): boolean;
  get xor(): string;
  get isTransactionNotSigned(): boolean;
  get isNotTheAccountInitiatedTrx(): boolean;
  getMainAccountName(): string;
  get amountOfThreshold(): number;
  get alreadySigned(): number;
  get progressPercentageMstSigned(): number;
  get amountOfDaysBeforeExpirationTrx(): string;
  getCurrentAmountOfXorOfSigner(): Promise<void>;
  fetchMinAmountOfXor(): Promise<void>;
  getNetworkFeeSymbol(isSoraTx?: boolean): string;
  onSignButtonClick(): Promise<void>;
  private getNetworkFee;
  private getTransactionHashData;
  private getTransactionId;
  private getTransactionTranslation;
  private getStatusClass;
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
