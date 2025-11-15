declare function __VLS_template(): {
  title?(_: {}): any;
  'header-actions'?(_: {}): any;
  default?(_: {}): any;
  footer?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        visible: boolean;
        customClass?: string;
        title?: string;
        tooltip?: string;
        width?: string;
        showBack?: boolean;
        showCloseButton?: boolean;
      }>,
      {
        visible: boolean;
        customClass: string;
        title: string;
        tooltip: string;
        width: string;
        showBack: boolean;
        showCloseButton: boolean;
      }
    >
  >,
  {},
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    'update:visible': (value: boolean) => void;
    close: () => void;
    back: () => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          visible: boolean;
          customClass?: string;
          title?: string;
          tooltip?: string;
          width?: string;
          showBack?: boolean;
          showCloseButton?: boolean;
        }>,
        {
          visible: boolean;
          customClass: string;
          title: string;
          tooltip: string;
          width: string;
          showBack: boolean;
          showCloseButton: boolean;
        }
      >
    >
  > &
    Readonly<{
      onBack?: (() => any) | undefined;
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
    }>,
  {
    title: string;
    width: string;
    tooltip: string;
    visible: boolean;
    customClass: string;
    showBack: boolean;
    showCloseButton: boolean;
  },
  {},
  {},
  {},
  string,
  import('vue').ComponentProvideOptions,
  true,
  {},
  any
>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, ReturnType<typeof __VLS_template>>;
export default _default;
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToRuntimeProps<T> = {
  [K in keyof T]-?: {} extends Pick<T, K>
    ? {
        type: import('vue').PropType<__VLS_NonUndefinedable<T[K]>>;
      }
    : {
        type: import('vue').PropType<T[K]>;
        required: true;
      };
};
type __VLS_WithDefaults<P, D> = {
  [K in keyof Pick<P, keyof P>]: K extends keyof D
    ? __VLS_Prettify<
        P[K] & {
          default: D[K];
        }
      >
    : P[K];
};
type __VLS_Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
type __VLS_WithTemplateSlots<T, S> = T & {
  new (): {
    $slots: S;
  };
};
