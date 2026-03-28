import type { InjectionKey, Ref } from 'vue';

import type { Breakpoints } from './helpers/responsiveUtils';
import type { GridEventBus } from './helpers/eventBus';

export type GridMargin = [number, number];

export interface GridLayoutContext {
  responsive: Ref<boolean>;
  lastBreakpoint: Ref<string | null>;
  cols: Ref<Breakpoints>;
  colNum: Ref<number>;
  rowHeight: Ref<number>;
  width: Ref<number | null>;
  margin: Ref<GridMargin>;
  maxRows: Ref<number>;
  isDraggable: Ref<boolean>;
  isResizable: Ref<boolean>;
  isBounded: Ref<boolean>;
  transformScale: Ref<number>;
  useCssTransforms: Ref<boolean>;
  useStyleCursor: Ref<boolean>;
  isMirrored: Ref<boolean>;
}

export const GRID_EVENT_BUS_KEY: InjectionKey<GridEventBus> = Symbol('grid-event-bus');
export const GRID_LAYOUT_KEY: InjectionKey<GridLayoutContext> = Symbol('grid-layout');
