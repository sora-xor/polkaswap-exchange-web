type __VLS_Props = {
  visible: boolean;
  customClass?: string;
  title?: string;
  tooltip?: string;
  width?: string;
  showBack?: boolean;
  showCloseButton?: boolean;
};
declare var __VLS_20: {}, __VLS_32: {}, __VLS_47: {}, __VLS_49: {};
type __VLS_Slots = {} & {
  title?: (props: typeof __VLS_20) => any;
} & {
  'header-actions'?: (props: typeof __VLS_32) => any;
} & {
  default?: (props: typeof __VLS_47) => any;
} & {
  footer?: (props: typeof __VLS_49) => any;
};
declare const __VLS_base: import('vue').DefineComponent<
  __VLS_Props,
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    back: () => any;
    close: () => any;
    'update:visible': (value: boolean) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onBack?: (() => any) | undefined;
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
    }>,
  {
    title: string;
    tooltip: string;
    width: string;
    showBack: boolean;
    visible: boolean;
    customClass: string;
    showCloseButton: boolean;
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
