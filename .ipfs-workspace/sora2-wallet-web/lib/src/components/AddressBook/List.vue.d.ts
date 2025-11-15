import type { PolkadotJsAccount } from '@/types/common';
type __VLS_Props = {
  visible?: boolean;
  accounts?: PolkadotJsAccount[];
  records?: PolkadotJsAccount[];
  excludedAddress?: string;
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
    remove: (address: string) => any;
    select: (value: PolkadotJsAccount) => any;
    close: () => any;
    'update:visible': (value: boolean) => any;
    open: (address: Nullable<string>, isEditMode?: boolean | undefined) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onRemove?: ((address: string) => any) | undefined;
      onSelect?: ((value: PolkadotJsAccount) => any) | undefined;
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
      onOpen?: ((address: Nullable<string>, isEditMode?: boolean | undefined) => any) | undefined;
    }>,
  {
    accounts: PolkadotJsAccount[];
    visible: boolean;
    records: PolkadotJsAccount[];
    excludedAddress: string;
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
