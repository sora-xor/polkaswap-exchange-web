import { describe, expect, it } from 'vitest';

import type { Layout, LayoutItem } from '@/lib/grid/types';
import {
  bottom,
  cloneLayout,
  cloneLayoutItem,
  collides,
  compact,
  compactItem,
  correctBounds,
  getAllCollisions,
  getFirstCollision,
  getLayoutItem,
  getStatics,
  moveElement,
  moveElementAwayFromCollision,
  setTopLeft,
  setTopRight,
  setTransform,
  setTransformRtl,
  sortLayoutItemsByRowCol,
  validateLayout,
} from '@/lib/grid/helpers/utils';

const item = (overrides: Partial<LayoutItem>): LayoutItem => ({
  x: 0,
  y: 0,
  w: 1,
  h: 1,
  i: 'item',
  ...overrides,
});

describe('grid layout utils', () => {
  it('measures the bottom edge and clones layout data without sharing item objects', () => {
    const layout = [item({ i: 'a', y: 2, h: 3 }), item({ i: 'b', y: 4, h: 1 })];
    const clone = cloneLayout(layout);

    expect(bottom(layout)).toBe(5);
    expect(clone).toEqual(layout);
    expect(clone).not.toBe(layout);
    expect(clone[0]).not.toBe(layout[0]);
    expect(cloneLayoutItem(layout[1])).toEqual(layout[1]);
  });

  it('detects collisions while ignoring the same layout item reference', () => {
    const a = item({ i: 'a', x: 0, y: 0, w: 2, h: 2 });
    const b = item({ i: 'b', x: 1, y: 1, w: 2, h: 2 });
    const c = item({ i: 'c', x: 3, y: 0, w: 1, h: 1 });

    expect(collides(a, a)).toBe(false);
    expect(collides(a, b)).toBe(true);
    expect(collides(a, c)).toBe(false);
    expect(getFirstCollision([c, b], a)).toBe(b);
    expect(getAllCollisions([b, c], a)).toEqual([b]);
  });

  it('sorts layout items by row and column and finds static or indexed entries', () => {
    const layout = [
      item({ i: 'second-row', x: 0, y: 1 }),
      item({ i: 'right', x: 3, y: 0 }),
      item({ i: 'left', x: 1, y: 0, static: true }),
    ];

    expect(sortLayoutItemsByRowCol(layout).map(({ i }) => i)).toEqual(['left', 'right', 'second-row']);
    expect(getLayoutItem(layout, 'right')).toEqual(layout[1]);
    expect(getLayoutItem(layout, 'missing')).toBeUndefined();
    expect(getStatics(layout)).toEqual([layout[2]]);
  });

  it('compacts movable items upward without crossing static blockers', () => {
    const layout = [
      item({ i: 'static', x: 0, y: 0, w: 2, h: 1, static: true }),
      item({ i: 'movable', x: 0, y: 5, w: 2, h: 1, moved: true }),
      item({ i: 'side', x: 2, y: 4, w: 1, h: 1, moved: true }),
    ];

    const compacted = compact(layout, true);

    expect(compacted.map(({ i, y, moved }) => ({ i, y, moved }))).toEqual([
      { i: 'static', y: 0, moved: false },
      { i: 'movable', y: 1, moved: false },
      { i: 'side', y: 0, moved: false },
    ]);
  });

  it('honors minimum positions when vertical compaction is disabled', () => {
    const movable = item({ i: 'movable', x: 0, y: 5, w: 1, h: 1 });

    expect(compactItem([], movable, false, { movable: { x: 0, y: 3 } })).toMatchObject({ y: 3 });
    expect(compactItem([], item({ i: 'free', y: 5 }), false, { movable: { x: 0, y: 3 } })).toMatchObject({
      y: 5,
    });
  });

  it('keeps items within column bounds and moves static collisions downward', () => {
    const layout = [
      item({ i: 'too-wide', x: 3, y: 0, w: 3, h: 1 }),
      item({ i: 'negative', x: -1, y: 1, w: 2, h: 1 }),
      item({ i: 'movable', x: 0, y: 3, w: 1, h: 1 }),
      item({ i: 'static', x: 0, y: 3, w: 1, h: 1, static: true }),
    ];

    expect(correctBounds(layout, { cols: 4 })).toMatchObject([
      { i: 'too-wide', x: 1, w: 3 },
      { i: 'negative', x: 0, w: 4 },
      { i: 'movable', y: 3 },
      { i: 'static', y: 4 },
    ]);
  });

  it('reverts blocked moves when collision prevention is enabled', () => {
    const layout = [item({ i: 'moving', x: 0, y: 0 }), item({ i: 'blocker', x: 2, y: 0 })];

    moveElement(layout, layout[0], 2, 0, false, true);

    expect(layout[0]).toMatchObject({ x: 0, y: 0, moved: false });
  });

  it('pushes collided items away and can place user-driven moves above blockers', () => {
    const moving = item({ i: 'moving', x: 0, y: 2, h: 1 });
    const blocker = item({ i: 'blocker', x: 0, y: 1, h: 1, static: true });
    const layout = [moving, blocker];

    moveElementAwayFromCollision(layout, blocker, moving, true);

    expect(moving.y).toBe(0);

    const lower = item({ i: 'lower', x: 0, y: 0, h: 1 });
    moveElementAwayFromCollision([blocker, lower], blocker, lower, false);

    expect(lower.y).toBe(2);
  });

  it('moves colliding non-static items while leaving static dragged items unchanged', () => {
    const layout = [
      item({ i: 'moving', x: 0, y: 0, w: 2, h: 1 }),
      item({ i: 'collision', x: 0, y: 1, w: 2, h: 1 }),
      item({ i: 'static', x: 5, y: 5, static: true }),
    ];

    moveElement(layout, layout[0], 0, 1);
    moveElement(layout, layout[2], 6, 6);

    expect(layout[0]).toMatchObject({ x: 0, y: 1, moved: true });
    expect(layout[1]).toMatchObject({ x: 0, y: 2 });
    expect(layout[2]).toMatchObject({ x: 5, y: 5 });
  });

  it('builds positional CSS objects for transform and absolute positioning modes', () => {
    expect(setTransform(1, 2, 3, 4)).toMatchObject({
      transform: 'translate3d(2px, 1px, 0)',
      WebkitTransform: 'translate3d(2px, 1px, 0)',
      width: '3px',
      height: '4px',
      position: 'absolute',
    });
    expect(setTransformRtl(1, 2, 3, 4)).toMatchObject({
      transform: 'translate3d(-2px, 1px, 0)',
      width: '3px',
      height: '4px',
      position: 'absolute',
    });
    expect(setTopLeft(5, 6, 7, 8)).toEqual({
      top: '5px',
      left: '6px',
      width: '7px',
      height: '8px',
      position: 'absolute',
    });
    expect(setTopRight(5, 6, 7, 8)).toEqual({
      top: '5px',
      right: '6px',
      width: '7px',
      height: '8px',
      position: 'absolute',
    });
  });

  it('validates layout item shape, identifiers, and duplicate keys', () => {
    const validLayout: Layout = [item({ i: 'a' }), item({ i: 1 as unknown as string })];

    expect(() => validateLayout(validLayout, 'Dashboard')).not.toThrow();
    expect(() => validateLayout({} as Layout)).toThrow('Layout must be an array');
    expect(() => validateLayout([item({ x: '0' as unknown as number })])).toThrow(
      'VueGridLayout: Layout[0].x must be a number'
    );
    expect(() => validateLayout([item({ i: null as unknown as string })])).toThrow(
      'VueGridLayout: Layout[0].i cannot be null'
    );
    expect(() => validateLayout([item({ i: {} as unknown as string })])).toThrow(
      'VueGridLayout: Layout[0].i must be a string or number'
    );
    expect(() => validateLayout([item({ i: 'dup' }), item({ i: 'dup' })])).toThrow(
      'VueGridLayout: Layout[1].i must be unique'
    );
    expect(() => validateLayout([item({ static: 'yes' as unknown as boolean })])).toThrow(
      'VueGridLayout: Layout[0].static must be a boolean'
    );
  });
});
