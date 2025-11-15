declare const __VLS_export: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<{
    message: {
      type: StringConstructor;
      required: true;
    };
    confirmText: {
      type: StringConstructor;
      default: string;
    };
    cancelText: {
      type: StringConstructor;
      default: string;
    };
    onConfirm: {
      type: FunctionConstructor;
      required: true;
    };
    onCancel: {
      type: FunctionConstructor;
      required: true;
    };
  }>,
  {
    handleConfirm: () => void;
    handleCancel: () => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {},
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<{
      message: {
        type: StringConstructor;
        required: true;
      };
      confirmText: {
        type: StringConstructor;
        default: string;
      };
      cancelText: {
        type: StringConstructor;
        default: string;
      };
      onConfirm: {
        type: FunctionConstructor;
        required: true;
      };
      onCancel: {
        type: FunctionConstructor;
        required: true;
      };
    }>
  > &
    Readonly<{}>,
  {
    cancelText: string;
    confirmText: string;
  },
  {},
  {
    SButton: import('vue').Component;
  },
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
