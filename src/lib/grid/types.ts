export interface LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  isDraggable?: boolean | null;
  isResizable?: boolean | null;
}

export type Layout = LayoutItem[];

export interface Size {
  width: number;
  height: number;
}
