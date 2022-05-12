import type { PageNames } from '@/consts';

export type RouterState = {
  prev?: Nullable<PageNames>;
  current?: Nullable<PageNames>;
};
