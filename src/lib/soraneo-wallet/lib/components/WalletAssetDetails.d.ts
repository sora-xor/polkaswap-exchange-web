import { BalanceType } from '@sora-substrate/sdk/build/assets/consts';
import { Operations } from '../types/common';
import { default as CopyAddressMixin } from './mixins/CopyAddressMixin';
import { default as FormattedAmountMixin } from './mixins/FormattedAmountMixin';
import { default as OperationsMixin } from './mixins/OperationsMixin';
import { default as QrCodeParserMixin } from './mixins/QrCodeParserMixin';
import { CodecString, HistoryItem } from '@sora-substrate/sdk';
import { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

interface Operation {
  type: Operations;
  icon: string;
}
declare const WalletAssetDetails_base: import('vue-class-component').VueConstructor<
  OperationsMixin &
    FormattedAmountMixin &
    QrCodeParserMixin &
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
    import('vue').ShallowUnwrapRef<{}> & {} & import('vue').ComponentCustomProperties & {} & import('vue-class-component').ClassComponentHooks
>;
export default class WalletAssetDetails extends WalletAssetDetails_base {
  readonly balanceTypes: (BalanceType | BalanceType[])[];
  private currentRouteParams;
  private permissions;
  private accountAssets;
  private history;
  selectedTransaction: Nullable<HistoryItem>;
  private resetTxDetailsId;
  wasBalanceDetailsClicked: boolean;
  private wasNftLinkCopied;
  wasNftDetailsClicked: boolean;
  nftContentLink: string;
  get hasResetFocus(): string;
  get isNft(): boolean;
  get headerTitle(): string;
  get nftLinkTooltipText(): string;
  get displayedNftContentLink(): string;
  private setNftMeta;
  handleClickNftDetails(): void;
  handleCopyNftLink(): Promise<void>;
  mounted(): void;
  formatBalance(value: CodecString): string;
  get operations(): Array<Operation>;
  get price(): Nullable<CodecString>;
  get asset(): AccountAsset;
  get balance(): string;
  get totalBalance(): string;
  get isEmptyBalance(): boolean;
  get balanceStyles(): {
    fontSize: string;
  };
  get balanceDetailsClasses(): Array<string>;
  get isXor(): boolean;
  get isCleanHistoryDisabled(): boolean;
  handleBack(): void;
  getOperationTooltip(operation: Operation): string;
  isOperationDisabled(operation: Operations): boolean;
  handleOperation(operation: Operations): void;
  handleClickDetailedBalance(): void;
  getBalance(asset: AccountAsset, type: BalanceType): string;
  handleRemoveAsset(): void;
}
export {};
