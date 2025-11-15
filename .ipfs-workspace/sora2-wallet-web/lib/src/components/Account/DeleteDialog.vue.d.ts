type __VLS_Props = {
  visible?: boolean;
  loading?: boolean;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    close: () => any;
    'update:visible': (value: boolean) => any;
    confirm: (hideOnConfirm: boolean) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
      onConfirm?: ((hideOnConfirm: boolean) => any) | undefined;
    }>,
  {
    loading: boolean;
    visible: boolean;
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
