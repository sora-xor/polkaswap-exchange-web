import { FPNumber } from '@sora-substrate/sdk';
import { default as LoadingMixin } from '../components/mixins/LoadingMixin';
import { default as TransactionMixin } from '../components/mixins/TransactionMixin';
import { default as TranslationMixin } from '../components/mixins/TranslationMixin';
import { Step } from '../consts';
import { default as NetworkFeeWarningMixin } from './mixins/NetworkFeeWarningMixin';
import { default as NumberFormatterMixin } from './mixins/NumberFormatterMixin';

declare const CreateNftToken_base: import('vue-class-component').VueConstructor<
  TranslationMixin &
    LoadingMixin &
    NumberFormatterMixin &
    TransactionMixin &
    NetworkFeeWarningMixin & {
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
export default class CreateNftToken extends CreateNftToken_base {
  readonly tokenSymbolMask = 'AAAAAAA';
  readonly tokenNameMask: {
    mask: string;
    tokens: {
      Z: {
        pattern: RegExp;
      };
    };
  };
  readonly maxTotalSupply = '100000000000000000000';
  readonly delimiters: {
    thousand: string;
    decimal: string;
  };
  readonly Step: typeof Step;
  readonly XOR_SYMBOL: string;
  readonly FILE_SIZE_LIMIT = 100;
  readonly step: Step;
  private nftStorage;
  private isConfirmTxDisabled;
  private navigate;
  private createNftStorageInstance;
  readonly fileInput: HTMLInputElement;
  readonly uploader: HTMLFormElement;
  imageLoading: boolean;
  fileExceedsLimit: boolean;
  badSource: boolean;
  contentSrcLink: string;
  tokenContentIpfsParsed: string;
  tokenContentLink: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDescription: string;
  tokenSupply: string;
  showFee: boolean;
  file: Nullable<File>;
  extensibleSupply: boolean;
  divisible: boolean;
  private calcDecimals;
  get decimals(): number;
  get isCreateDisabled(): boolean;
  get fee(): FPNumber;
  get formattedFee(): string;
  get contentSource(): string;
  get hasEnoughXor(): boolean;
  upload(file: File): Promise<void>;
  showLimit(): void;
  hideLimit(): void;
  handleChangeDivisible(value: boolean): void;
  handleInputLinkChange(link: string): void;
  handleTextAreaInput(e: KeyboardEvent): boolean | void;
  checkImageFromSource(url: string): Promise<void>;
  isValidType(type: string): boolean;
  clear(): void;
  resetFileInput(): void;
  storeNftImage(file: File): Promise<void>;
  registerNftAsset(): Promise<void>;
  onCreate(): Promise<void>;
  onConfirm(): Promise<void>;
  confirmNextTxFailure(): void;
}
export {};
