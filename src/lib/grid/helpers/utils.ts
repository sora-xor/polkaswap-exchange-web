import type { Layout, LayoutItem } from '../types';
import type { CSSProperties } from 'vue';

type MinPositions = Record<string, { x: number; y: number }>;

export function bottom(layout: Layout): number {
  return layout.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);
}

export function cloneLayout(layout: Layout): Layout {
  return layout.map(cloneLayoutItem);
}

export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
  return { ...layoutItem };
}

export function collides(a: LayoutItem, b: LayoutItem): boolean {
  if (a === b) return false;
  if (a.x + a.w <= b.x) return false;
  if (a.x >= b.x + b.w) return false;
  if (a.y + a.h <= b.y) return false;
  if (a.y >= b.y + b.h) return false;
  return true;
}

export function compact(layout: Layout, verticalCompact: boolean, minPositions?: MinPositions): Layout {
  const compareWith = getStatics(layout);
  const sorted = sortLayoutItemsByRowCol(layout);
  const out: Layout = new Array(layout.length);

  sorted.forEach((item) => {
    let current = item;
    if (!current.static) {
      current = compactItem(compareWith, current, verticalCompact, minPositions);
      compareWith.push(current);
    }

    out[layout.indexOf(current)] = current;
    current.moved = false;
  });

  return out;
}

export function compactItem(
  compareWith: Layout,
  item: LayoutItem,
  verticalCompact: boolean,
  minPositions?: MinPositions
): LayoutItem {
  const result = item;

  if (verticalCompact) {
    while (result.y > 0 && !getFirstCollision(compareWith, result)) {
      result.y -= 1;
    }
  } else if (minPositions) {
    const minPosition = minPositions[result.i];
    if (minPosition) {
      while (result.y > minPosition.y && !getFirstCollision(compareWith, result)) {
        result.y -= 1;
      }
    }
  }

  let collision = getFirstCollision(compareWith, result);
  while (collision) {
    result.y = collision.y + collision.h;
    collision = getFirstCollision(compareWith, result);
  }

  return result;
}

export function correctBounds(layout: Layout, bounds: { cols: number }): Layout {
  const collidesWith = getStatics(layout);

  layout.forEach((item) => {
    if (item.x + item.w > bounds.cols) item.x = bounds.cols - item.w;
    if (item.x < 0) {
      item.x = 0;
      item.w = bounds.cols;
    }

    if (!item.static) {
      collidesWith.push(item);
      return;
    }

    while (getFirstCollision(collidesWith, item)) {
      item.y += 1;
    }
  });

  return layout;
}

export function getLayoutItem(layout: Layout, id: string): LayoutItem | undefined {
  return layout.find((item) => item.i === id);
}

export function getFirstCollision(layout: Layout, layoutItem: LayoutItem): LayoutItem | undefined {
  return layout.find((item) => collides(item, layoutItem));
}

export function getAllCollisions(layout: Layout, layoutItem: LayoutItem): Layout {
  return layout.filter((item) => collides(item, layoutItem));
}

export function getStatics(layout: Layout): Layout {
  return layout.filter((item) => Boolean(item.static));
}

export function moveElement(
  layout: Layout,
  item: LayoutItem,
  x?: number,
  y?: number,
  isUserAction = false,
  preventCollision = false
): Layout {
  if (item.static) return layout;

  const oldX = item.x;
  const oldY = item.y;

  const movingUp = typeof y === 'number' && y < item.y;

  if (typeof x === 'number') item.x = x;
  if (typeof y === 'number') item.y = y;
  item.moved = true;

  let sorted = sortLayoutItemsByRowCol(layout);
  if (movingUp) sorted = [...sorted].reverse();

  const collisions = getAllCollisions(sorted, item);

  if (preventCollision && collisions.length) {
    item.x = oldX;
    item.y = oldY;
    item.moved = false;
    return layout;
  }

  collisions.forEach((collision) => {
    if (collision.moved) return;
    if (item.y > collision.y && item.y - collision.y > collision.h / 4) return;

    if (collision.static) {
      moveElementAwayFromCollision(layout, collision, item, isUserAction);
    } else {
      moveElementAwayFromCollision(layout, item, collision, isUserAction);
    }
  });

  return layout;
}

export function moveElementAwayFromCollision(
  layout: Layout,
  collidesWith: LayoutItem,
  itemToMove: LayoutItem,
  isUserAction: boolean
): Layout {
  const preventCollision = false;

  if (isUserAction) {
    const fakeItem: LayoutItem = {
      ...itemToMove,
      i: '__grid_placeholder__',
    };
    fakeItem.y = Math.max(collidesWith.y - itemToMove.h, 0);
    if (!getFirstCollision(layout, fakeItem)) {
      return moveElement(layout, itemToMove, undefined, fakeItem.y, preventCollision);
    }
  }

  return moveElement(layout, itemToMove, undefined, itemToMove.y + 1, preventCollision);
}

export function sortLayoutItemsByRowCol(layout: Layout): Layout {
  return [...layout].sort((a, b) => {
    if (a.y === b.y && a.x === b.x) return 0;
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) return 1;
    return -1;
  });
}

export function setTransform(top: number, left: number, width: number, height: number): CSSProperties {
  const translate = `translate3d(${left}px, ${top}px, 0)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: 'absolute',
  };
}

export function setTransformRtl(top: number, right: number, width: number, height: number): CSSProperties {
  const translate = `translate3d(${-right}px, ${top}px, 0)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: 'absolute',
  };
}

export function setTopLeft(top: number, left: number, width: number, height: number): CSSProperties {
  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
    position: 'absolute',
  };
}

export function setTopRight(top: number, right: number, width: number, height: number): CSSProperties {
  return {
    top: `${top}px`,
    right: `${right}px`,
    width: `${width}px`,
    height: `${height}px`,
    position: 'absolute',
  };
}

export function validateLayout(layout: Layout, contextName = 'Layout'): void {
  const props: Array<keyof LayoutItem> = ['x', 'y', 'w', 'h'];
  const ids = new Set<string>();

  if (!Array.isArray(layout)) throw new Error(`${contextName} must be an array`);

  layout.forEach((item, index) => {
    props.forEach((prop) => {
      const value = item[prop];
      if (typeof value !== 'number') {
        throw new Error(`VueGridLayout: ${contextName}[${index}].${String(prop)} must be a number`);
      }
    });

    if (item.i === undefined || item.i === null) {
      throw new Error(`VueGridLayout: ${contextName}[${index}].i cannot be null`);
    }

    if (typeof item.i !== 'string' && typeof item.i !== 'number') {
      throw new Error(`VueGridLayout: ${contextName}[${index}].i must be a string or number`);
    }

    const key = String(item.i);
    if (ids.has(key)) {
      throw new Error(`VueGridLayout: ${contextName}[${index}].i must be unique`);
    }
    ids.add(key);

    if (item.static !== undefined && typeof item.static !== 'boolean') {
      throw new Error(`VueGridLayout: ${contextName}[${index}].static must be a boolean`);
    }
  });
}
