import { PassphraseTimeout } from '@/consts';
type __VLS_Props = {
  withHint?: boolean;
  disabled?: boolean;
};
declare var __VLS_6: {};
type __VLS_Slots = {} & {
  default?: (props: typeof __VLS_6) => any;
};
declare const __VLS_base: import('vue').DefineComponent<
  __VLS_Props,
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
  Readonly<__VLS_Props> & Readonly<{}>,
  {
    disabled: boolean;
    withHint: boolean;
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
