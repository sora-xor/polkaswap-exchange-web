import { PaginationButton } from '@/consts';
type __VLS_Props = {
  currentPage?: number;
  pageAmount?: number;
  total?: number;
  loading?: boolean;
  lastPage?: number;
};
declare const __VLS_export: import('vue').DefineComponent<
  __VLS_Props,
  {
    handlePaginationClick: (button: PaginationButton) => void;
  },
  {},
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {} & {
    'pagination-click': (value: PaginationButton) => any;
  },
  string,
  import('vue').PublicProps,
  Readonly<__VLS_Props> &
    Readonly<{
      'onPagination-click'?: ((value: PaginationButton) => any) | undefined;
    }>,
  {
    loading: boolean;
    total: number;
    pageAmount: number;
    currentPage: number;
    lastPage: number;
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
