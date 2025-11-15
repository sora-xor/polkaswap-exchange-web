type __VLS_Props = {
  name?: string;
  symbol?: string;
  address?: string;
  externalAddress?: string;
  external?: boolean;
  showName?: boolean;
  symbols?: number | string;
  symbolsOffset?: number | string;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    tokenAddress: import('vue').ComputedRef<string>;
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
    symbol: string;
    address: string;
    name: string;
    symbols: number | string;
    symbolsOffset: number | string;
    externalAddress: string;
    external: boolean;
    showName: boolean;
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
