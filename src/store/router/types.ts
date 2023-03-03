import type { PageNames } from '@/consts';

export type RouterParams = {
  prev?: Nullable<PageNames>;
  current?: Nullable<PageNames>;
};

export type RouterState = RouterParams & {
  loading: boolean;
};
