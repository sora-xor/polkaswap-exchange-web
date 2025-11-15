import { FilterOptions } from '../../types/common';

declare const _default: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        modelValue?: boolean;
        showOnlyVerifiedSwitch?: boolean;
      }>,
      {
        modelValue: boolean;
        showOnlyVerifiedSwitch: boolean;
      }
    >
  >,
  {
    resetFilter: () => void;
    selectedFilter: import('vue').WritableComputedRef<FilterOptions, FilterOptions>;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    'update:modelValue': (value: boolean) => void;
  },
  string,
  import('vue').PublicProps,
  Readonly<
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          modelValue?: boolean;
          showOnlyVerifiedSwitch?: boolean;
        }>,
        {
          modelValue: boolean;
          showOnlyVerifiedSwitch: boolean;
        }
      >
    >
  > &
    Readonly<{
      'onUpdate:modelValue'?: ((value: boolean) => any) | undefined;
    }>,
  {
    modelValue: boolean;
    showOnlyVerifiedSwitch: boolean;
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
