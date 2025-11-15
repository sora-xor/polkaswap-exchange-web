import { AccountActionTypes } from '@/consts';
type __VLS_Props = {
  actions?: AccountActionTypes[];
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    items: import('vue').ComputedRef<
      {
        value: AccountActionTypes;
        name: string;
        icon: string;
        status: string;
      }[]
    >;
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
    actions: AccountActionTypes[];
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
