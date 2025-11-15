type __VLS_Props = {
  success?: boolean;
  loading?: boolean;
  optional?: boolean;
  modalContent?: boolean;
  buttonText?: string;
  modelValue?: boolean;
};
declare var __VLS_12: {}, __VLS_14: {}, __VLS_16: {};
type __VLS_Slots = {} & {
  title?: (props: typeof __VLS_12) => any;
} & {
  text?: (props: typeof __VLS_14) => any;
} & {
  default?: (props: typeof __VLS_16) => any;
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
    'update:modelValue': (value: boolean) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
    }>,
  {
    loading: boolean;
    success: boolean;
    modelValue: boolean;
    optional: boolean;
    modalContent: boolean;
    buttonText: string;
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
