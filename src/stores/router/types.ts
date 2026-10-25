import type { Nullable } from '@/types/common';

export type RouterParams = {
  prev?: Nullable<string>;
  current?: Nullable<string>;
  currentParams?: Record<string, unknown>;
  prevParams?: Record<string, unknown>;
};

export type Route = {
  name: string;
  params?: Record<string, unknown>;
};

export type RouterState = RouterParams & {
  loading: boolean;
  current: Nullable<string>;
  prev: Nullable<string>;
  currentParams: Record<string, unknown>;
  prevParams: Record<string, unknown>;
};
