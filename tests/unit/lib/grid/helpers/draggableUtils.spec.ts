import { describe, expect, it } from 'vitest';

import { createCoreData, getControlPosition, offsetXYFromParentOf } from '@/lib/grid/helpers/draggableUtils';

describe('draggable utils', () => {
  it('measures coordinates against the document body when there is no offset parent', () => {
    Object.defineProperty(document.body, 'scrollLeft', { configurable: true, value: 5 });
    Object.defineProperty(document.body, 'scrollTop', { configurable: true, value: 7 });

    const target = document.createElement('div');

    expect(offsetXYFromParentOf({ target, clientX: 10, clientY: 15 } as any)).toEqual({
      x: 15,
      y: 22,
    });
  });

  it('resolves coordinates relative to the target offset parent', () => {
    const offsetParent = document.createElement('div');
    offsetParent.getBoundingClientRect = () => ({ left: 20, top: 30 }) as DOMRect;
    Object.defineProperty(offsetParent, 'scrollLeft', { configurable: true, value: 11 });
    Object.defineProperty(offsetParent, 'scrollTop', { configurable: true, value: 13 });

    const target = document.createElement('button');
    Object.defineProperty(target, 'offsetParent', { configurable: true, value: offsetParent });

    expect(getControlPosition({ target, clientX: 100, clientY: 80 } as any)).toEqual({
      x: 91,
      y: 63,
    });
  });

  it('builds zero deltas for drag starts and movement deltas for subsequent points', () => {
    expect(createCoreData(null, undefined, 30, 40)).toEqual({
      deltaX: 0,
      deltaY: 0,
      lastX: 30,
      lastY: 40,
      x: 30,
      y: 40,
    });

    expect(createCoreData(12, 15, 20, 27)).toEqual({
      deltaX: 8,
      deltaY: 12,
      lastX: 12,
      lastY: 15,
      x: 20,
      y: 27,
    });
  });
});
