import { Vue } from 'vue-property-decorator';
import { FontSizeRate, FontWeightRate } from '../consts';
export default class InfoLine extends Vue {
  readonly HiddenValue = '******';
  readonly label: string;
  readonly labelTooltip: string;
  readonly value: string | number;
  readonly assetSymbol: string;
  readonly isFormatted: boolean;
  readonly fiatValue: string;
  readonly valueTooltip: string;
  /**
   * Define directly that this field displays value which can be hidden by hide balances button.
   */
  readonly valueCanBeHidden: boolean;
  shouldBalanceBeHidden: boolean;
  get normalizedValue(): string;
  get hasInvalidValue(): boolean;
  get isValueExists(): boolean;
  get formattedFontSize(): Nullable<FontSizeRate>;
  get formattedFontWeight(): Nullable<FontWeightRate>;
  get tooltipOrTemplate(): string;
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
