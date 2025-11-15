import { PolkadotJsAccount } from '../../types/common';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        visible?: boolean;
        account?: Nullable<PolkadotJsAccount>;
        loading?: boolean;
      }>,
      {
        visible: boolean;
        account: null;
        loading: boolean;
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
    confirm: (name: string) => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          visible?: boolean;
          account?: Nullable<PolkadotJsAccount>;
          loading?: boolean;
        }>,
        {
          visible: boolean;
          account: null;
          loading: boolean;
        }
      >
    >
  > &
    Readonly<{
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
      onConfirm?: ((name: string) => any) | undefined;
    }>,
  {
    account: PolkadotJsAccount | null;
    loading: boolean;
    visible: boolean;
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
