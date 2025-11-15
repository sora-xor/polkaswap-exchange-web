type __VLS_Props = {
  visible?: boolean;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    openConfirmDialog: () => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    close: () => any;
    'update:visible': (value: boolean) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
    }>,
  {
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
