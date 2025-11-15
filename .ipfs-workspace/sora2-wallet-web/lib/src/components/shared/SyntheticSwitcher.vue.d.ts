type __VLS_Props = {
  modelValue?: boolean;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    model: import('vue').WritableComputedRef<boolean, boolean>;
  },
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
    modelValue: boolean;
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
