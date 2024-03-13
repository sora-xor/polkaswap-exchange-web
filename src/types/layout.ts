import type { BreakpointKey } from '@/consts/layout';

export type WidgetRect = {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type LayoutWidgetConfig = WidgetRect & {
  i: string;
  x: number;
  y: number;
};

export type BreakpointConfig<T> = Record<BreakpointKey, T>;

export type LayoutWidget = Required<LayoutWidgetConfig>;

export type LayoutConfig = BreakpointConfig<number>;

export type Layout<T extends LayoutWidgetConfig> = T[];

export type ResponsiveLayouts<T extends LayoutWidgetConfig> = Partial<BreakpointConfig<Layout<T>>>;
