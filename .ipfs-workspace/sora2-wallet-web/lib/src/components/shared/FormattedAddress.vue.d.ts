type __VLS_Props = {
  value?: string;
  tooltipText?: string;
  symbols?: number | string;
  offset?: number | string;
  symbolsOffset?: number | string;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    handleCopyAddress: (address: string, event?: PointerEvent | MouseEvent | undefined) => Promise<void>;
    copyTooltip: (tooltipCopyValue?: string) => string;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> & Readonly<{}>,
  {
    value: string;
    tooltipText: string;
    symbols: number | string;
    offset: number | string;
    symbolsOffset: number | string;
  },
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  false,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
