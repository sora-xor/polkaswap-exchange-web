import { Currency } from '@/types/currency';
import NumberFormatterMixin from './mixins/NumberFormatterMixin';
interface FormattedAmountValues {
  integer: string;
  decimal: string;
}
declare const FormattedAmount_base: import('vue-class-component').VueConstructor<
  NumberFormatterMixin & {
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
export default class FormattedAmount extends FormattedAmount_base {
  readonly HiddenValue = '******';
  /**
   * Balance or Amount value.
   */
  readonly value: string | number;
  /**
   * Font size rate between integer and decimal numbers' parts. Possible values: `"small"`, `"medium"`, `"normal"`.
   * By default it's set to `"normal"` and it means the same font sizes for both numbers' parts.
   */
  readonly fontSizeRate: string;
  /**
   * Font weight rate between integer and decimal numbers' parts. Possible values: `"small"`, `"medium"`, `"normal"`.
   * By default it's set to `"normal"` and it means the same font weights for both numbers' parts.
   */
  readonly fontWeightRate: string;
  /**
   * Amount value's asset symbol.
   */
  readonly assetSymbol: string;
  /**
   * Font size of asset symbol is the same with decimal part size.
   * Symbol value located inside formatted-amount__decimal container at the HTML structure.
   */
  readonly symbolAsDecimal: boolean;
  /**
   * Adds special class and styles to formatted number to convert in to Fiat value.
   */
  readonly isFiatValue: boolean;
  /**
   * Uses default rounding rule for fiat value. It'll be applied for small numbers like 0.009 or less
   */
  readonly fiatDefaultRounding: boolean;
  /**
   * Define directly that this field displays value which can be hidden by hide balances button.
   */
  readonly valueCanBeHidden: boolean;
  /**
   * Fills only intger part if we don't need decimals value.
   */
  readonly integerOnly: boolean;
  /**
   * Added special class to left shifting for Fiat value if needed (the shift is the same in all screens).
   */
  readonly withLeftShift: boolean;
  /**
   * Allows for getting proper exchange rate and symbol for provided currency
   */
  readonly customizableCurrency: Currency | '';
  shouldBalanceBeHidden: boolean;
  private fiatExchangeRateObject;
  private fiatPriceObject;
  private currencySymbol;
  private exchangeRate;
  isValueWider: boolean;
  get symbol(): string;
  get normalizedValue(): string;
  get hasDisplayableValue(): boolean;
  private formatFiatDecimal;
  get unformatted(): string;
  get isFiniteValue(): boolean;
  get shouldRender(): boolean;
  get formatted(): FormattedAmountValues;
  get isHiddenValue(): boolean;
  get computedClasses(): string;
  /**
   * If the child element is wider that parent container, update isValueWider property
   * Note: parent had overflow style
   */
  checkWiderFlag(): void;
  resetWiderFlag(): void;
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
