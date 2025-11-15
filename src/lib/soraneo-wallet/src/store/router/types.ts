import type { RouteNames } from '../../consts';

export type RouterState = {
  currentRoute: RouteNames;
  currentRouteParams: Record<string, unknown>;
  previousRoute: RouteNames | '';
  previousRouteParams: Record<string, unknown>;
};

export type Route = {
  name: RouteNames;
  params?: Record<string, unknown>;
};
