type __VLS_Props = {
  title?: string;
  tooltip?: string;
  titleCenter?: boolean;
  showBack?: boolean;
  showClose?: boolean;
  showHeader?: boolean;
  resetFocus?: string;
};
declare var __VLS_31: {}, __VLS_46: {};
type __VLS_Slots = {} & {
  actions?: (props: typeof __VLS_31) => any;
} & {
  default?: (props: typeof __VLS_46) => any;
};
declare const __VLS_base: import('vue').DefineComponent<
  __VLS_Props,
  {
    setFocusToHeader: () => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    back: () => any;
    close: () => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onBack?: (() => any) | undefined;
      onClose?: (() => any) | undefined;
    }>,
  {
    title: string;
    tooltip: string;
    titleCenter: boolean;
    showBack: boolean;
    showClose: boolean;
    showHeader: boolean;
    resetFocus: string;
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
declare const __VLS_export: __VLS_WithSlots<typeof __VLS_base, __VLS_Slots>;
declare const _default: typeof __VLS_export;
export default _default;
type __VLS_WithSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
