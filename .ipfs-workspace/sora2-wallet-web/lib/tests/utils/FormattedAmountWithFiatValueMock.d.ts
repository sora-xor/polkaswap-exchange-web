import { FontSizeRate, FontWeightRate } from '@/consts';
interface FormattedAmountWithFiatValue {
  title: string;
  valueClass?: string;
  value: any;
  fontSizeRate?: FontSizeRate;
  fontWeightRate?: FontWeightRate;
  assetSymbol?: string;
  symbolAsDecimal?: boolean;
  hasFiatValue?: boolean;
  fiatValue?: string;
  fiatFormatAsValue?: boolean;
  fiatFontSizeRate?: FontSizeRate;
  fiatFontWeightRate?: FontWeightRate;
  withLeftShift?: boolean;
  valueCanBeHidden?: boolean;
}
export declare const MOCK_FORMATTED_AMOUNT_WITH_FIAT_VALUE: Array<FormattedAmountWithFiatValue>;
export {};
