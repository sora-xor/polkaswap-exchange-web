type __VLS_Props = {
  fee?: string;
  symbol?: string;
  payoff?: boolean;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    hidePopup: import('vue').Ref<boolean, boolean>;
    handleConfirm: () => Promise<void>;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    confirm: () => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onConfirm?: (() => any) | undefined;
    }>,
  {
    symbol: string;
    fee: string;
    payoff: boolean;
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
