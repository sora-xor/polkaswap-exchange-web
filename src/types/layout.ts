import type { BreakpointKey } from '@/consts/layout';

export type LayoutWidget = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type Layout = LayoutWidget[];

export type LayoutConfiguration = Record<BreakpointKey, number>;

export type ResponsiveLayouts = Partial<Record<BreakpointKey, Layout>>;
