interface InfoLine {
  title: string;
  label: string;
  labelTooltip?: string;
  value: string;
  assetSymbol?: string;
  isFormatted?: boolean;
  fiatValue?: string;
  valueCanBeHidden?: boolean;
}
export declare const MOCK_INFO_LINE: Array<InfoLine>;
export {};
