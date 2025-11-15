import { FontSizeRate, FontWeightRate } from '@/consts';
interface FormattedAmount {
  title: string;
  value: any;
  fontSizeRate?: FontSizeRate;
  fontWeightRate?: FontWeightRate;
  assetSymbol?: string;
  symbolAsDecimal?: boolean;
  isFiatValue?: boolean;
  integerOnly?: boolean;
  withLeftShift?: boolean;
  valueCanBeHidden?: boolean;
  fiatDefaultRounding?: boolean;
}
export declare const MOCK_FORMATTED_AMOUNT: Array<FormattedAmount>;
export {};
