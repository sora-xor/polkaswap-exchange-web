import type { Book, PolkadotJsAccount } from '@/types/common';
type __VLS_Props = {
  visible?: boolean;
  book?: Book;
  accounts?: PolkadotJsAccount[];
  prefilledAddress?: string;
  isEditMode?: boolean;
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
    add: (value: { address: string; name: string }) => any;
    close: () => any;
    'update:visible': (value: boolean) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      onAdd?: ((value: { address: string; name: string }) => any) | undefined;
      onClose?: (() => any) | undefined;
      'onUpdate:visible'?: ((value: boolean) => any) | undefined;
    }>,
  {
    book: Book;
    accounts: PolkadotJsAccount[];
    visible: boolean;
    prefilledAddress: string;
    isEditMode: boolean;
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
