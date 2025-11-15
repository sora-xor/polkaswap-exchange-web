import type { PolkadotJsAccount } from '@/types/common';
type __VLS_Props = {
  visible?: boolean;
  account?: Nullable<PolkadotJsAccount>;
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
    confirm: (name: string) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
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
  false,
  {},
  any
>;
declare const _default: typeof __VLS_export;
export default _default;
