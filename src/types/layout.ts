import type { BreakpointKey } from '@/consts/layout';

export type WidgetSize = {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
};

export type WidgetPosition = {
  x: number;
  y: number;
};

export type LayoutWidget = WidgetSize &
  WidgetPosition & {
    i: string;
  };

export type BreakpointConfig<T> = Record<BreakpointKey, T>;

export type LayoutConfig = BreakpointConfig<number>;

export type Layout = LayoutWidget[];

export type ResponsiveLayouts = Partial<BreakpointConfig<Layout>>;

export type WidgetsVisibilityModel = Record<string, boolean>;
