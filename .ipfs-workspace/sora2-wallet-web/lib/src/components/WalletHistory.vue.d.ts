import { PaginationButton } from '../consts';
import EthBridgeTransactionMixin from './mixins/EthBridgeTransactionMixin';
import LoadingMixin from './mixins/LoadingMixin';
import PaginationSearchMixin from './mixins/PaginationSearchMixin';
import TransactionMixin from './mixins/TransactionMixin';
import type { HistoryQuery } from '../types/history';
import type { History, HistoryItem } from '@sora-substrate/sdk';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';
declare const WalletHistory_base: import('vue-class-component').VueConstructor<
  LoadingMixin &
    TransactionMixin &
    PaginationSearchMixin &
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
export default class WalletHistory extends WalletHistory_base {
  /** Date format without seconds, full date time will be available in TX Details */
  readonly DateFormat = 'll LT';
  private assets;
  private history;
  private externalHistory;
  private externalHistoryUpdates;
  private externalHistoryTotal;
  private navigate;
  private resetExternalHistory;
  private saveExternalHistoryUpdates;
  private getHistory;
  private setTxDetailsId;
  private getExternalHistory;
  readonly asset: Nullable<AccountAsset>;
  private updateHistoryBySearchQuery;
  readonly pageAmount = 8;
  readonly updateCommonHistory: import('lodash').DebouncedFunc<() => Promise<void>>;
  get assetAddress(): string;
  private getPrefilteredHistory;
  get internalHistoryPrefiltered(): HistoryItem[];
  get externalHistoryUpdatesPrefiltered(): HistoryItem[];
  get filteredInternalHistory(): Array<History>;
  get filteredExternalHistory(): Array<History>;
  get filteredExternalHistoryUpdates(): Array<History>;
  get transactions(): Array<History>;
  get total(): number;
  get hasVisibleTransactions(): boolean;
  get hasTransactions(): boolean;
  get queryCriterias(): HistoryQuery;
  get isValidQuery(): boolean;
  mounted(): Promise<void>;
  beforeUnmount(): void;
  reset(): void;
  getFilteredHistory(history: Array<History>): Array<History>;
  private getStatus;
  getStatusClass(item: HistoryItem): string;
  getStatusIcon(item: HistoryItem): string;
  isFinalizedStatus(item: HistoryItem): boolean;
  private isErrorStatus;
  handleOpenTransactionDetails(id?: string): void;
  handlePaginationClick(button: PaginationButton): Promise<void>;
  /**
   * Update external & internal history
   * @param withReset - reset current page number & clear external history
   */
  private updateHistory;
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
