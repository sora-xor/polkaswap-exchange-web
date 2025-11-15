import { Vue } from 'vue-property-decorator';

export default class FormattedAmountWithFiatValue extends Vue {
  /**
   * Amount value's custom class.
   */
  readonly valueClass: string;
  /**
   * Balance or Amount value.
   */
  readonly value: string;
  /**
   * Amount value's Font size rate between integer and decimal numbers' parts. Possible values: `"small"`, `"medium"`, `"normal"`.
   * By default it's set to `"normal"` and it means the same font sizes for both numbers' parts.
   */
  readonly fontSizeRate: string;
  /**
   * Amount value's Font weight rate between integer and decimal numbers' parts. Possible values: `"small"`, `"medium"`, `"normal"`.
   * By default it's set to `"normal"` and it means the same font weights for both numbers' parts.
   */
  readonly fontWeightRate: string;
  /**
   * Amount value's asset symbol.
   */
  readonly assetSymbol: string;
  /**
   * Font size of asset symbol is the same with decimal part size for Amount value.
   * Symbol value located inside formatted-amount__decimal container at the HTML structure.
   */
  readonly symbolAsDecimal: boolean;
  /**
   * Sometimes presence of Fiat value related on some rules. With this setting we could show/hide Fiat value part.
   */
  readonly hasFiatValue: boolean;
  /**
   * Fiat value.
   */
  readonly fiatValue: string;
  /**
   * We could set this flag to true if we have the same FontSizeRate and FontWeightRate with Amount value.
   */
  readonly fiatFormatAsValue: boolean;
  /**
   * Define directly that this field displays value which can be hidden by hide balances button.
   */
  readonly valueCanBeHidden: boolean;
  /**
   * Fiat value's Font size rate between integer and decimal numbers' parts. Possible values: `"small"`, `"medium"`, `"normal"`.
   * By default it's set to `"normal"` and it means the same font sizes for both numbers' parts.
   */
  readonly fiatFontSizeRate: string;
  /**
   * Fiat value's Font weight rate between integer and decimal numbers' parts. Possible values: `"small"`, `"medium"`, `"normal"`.
   * By default it's set to `"normal"` and it means the same font weights for both numbers' parts.
   */
  readonly fiatFontWeightRate: string;
  /**
   * Added special class to left shifting for Fiat value if needed (the shift is the same in all screens).
   */
  readonly withLeftShift: boolean;
  get computedClasses(): string;
}
