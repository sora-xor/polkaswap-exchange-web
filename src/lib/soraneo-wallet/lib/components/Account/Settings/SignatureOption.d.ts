import { PassphraseTimeout } from '../../../consts';

declare function __VLS_template(): {
  default?(_: {}): any;
};
declare const __VLS_component: import('vue').DefineComponent<
  import('vue').ExtractPropTypes<
    __VLS_WithDefaults<
      __VLS_TypePropsToRuntimeProps<{
        withHint?: boolean;
        disabled?: boolean;
      }>,
      {
        withHint: boolean;
        disabled: boolean;
      }
    >
  >,
  {
    model: import('vue').WritableComputedRef<boolean, boolean>;
    passwordTimeoutModel: import('vue').WritableComputedRef<PassphraseTimeout, PassphraseTimeout>;
    durations: typeof PassphraseTimeout;
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
    import('vue').ExtractPropTypes<
      __VLS_WithDefaults<
        __VLS_TypePropsToRuntimeProps<{
          withHint?: boolean;
          disabled?: boolean;
        }>,
        {
          withHint: boolean;
          disabled: boolean;
        }
      >
    >
  > &
    Readonly<{}>,
  {
    disabled: boolean;
    withHint: boolean;
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
