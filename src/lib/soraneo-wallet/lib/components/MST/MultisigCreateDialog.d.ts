import { MSTData } from '../../types/mst';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        visible?: boolean;
        mstData?: MSTData;
        threshold?: number;
      }>,
      {
        visible: boolean;
        mstData: () => MSTData;
        threshold: number;
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
          visible?: boolean;
          mstData?: MSTData;
          threshold?: number;
        }>,
        {
          visible: boolean;
          mstData: () => MSTData;
          threshold: number;
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
    threshold: number;
    visible: boolean;
    mstData: MSTData;
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
