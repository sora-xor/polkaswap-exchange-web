import type { BreakpointKey } from '@/consts/layout';

export type LayoutWidgetConfig = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type LayoutWidget = Required<LayoutWidgetConfig>;

export type LayoutConfig = Record<BreakpointKey, number>;

export type Layout<T extends LayoutWidgetConfig> = T[];

export type ResponsiveLayouts<T extends LayoutWidgetConfig> = Partial<Record<BreakpointKey, Layout<T>>>;
