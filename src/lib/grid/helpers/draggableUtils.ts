import type { PointerEvent as InteractPointerEvent } from '@interactjs/types/index';

interface OffsetPosition {
  x: number;
  y: number;
}

type EventTargetWithParent = EventTarget & {
  offsetParent?: HTMLElement | null;
};

type MouseTouchEvent = (MouseEvent | TouchEvent | InteractPointerEvent) & {
  target: EventTargetWithParent;
  clientX: number;
  clientY: number;
};

export function getControlPosition(event: MouseTouchEvent): OffsetPosition {
  return offsetXYFromParentOf(event);
}

export function offsetXYFromParentOf(event: MouseTouchEvent): OffsetPosition {
  const target = event.target as HTMLElement;
  const offsetParent = target?.offsetParent as HTMLElement | null;
  const resolvedParent = offsetParent ?? document.body;
  const rect = resolvedParent === document.body ? { left: 0, top: 0 } : resolvedParent.getBoundingClientRect();

  const x = event.clientX + resolvedParent.scrollLeft - rect.left;
  const y = event.clientY + resolvedParent.scrollTop - rect.top;

  return { x, y };
}

export function createCoreData(
  lastX: number | null | undefined,
  lastY: number | null | undefined,
  x: number,
  y: number
): {
  deltaX: number;
  deltaY: number;
  lastX: number;
  lastY: number;
  x: number;
  y: number;
} {
  const isStart = typeof lastX !== 'number' || typeof lastY !== 'number';

  if (isStart) {
    return {
      deltaX: 0,
      deltaY: 0,
      lastX: x,
      lastY: y,
      x,
      y,
    };
  }

  return {
    deltaX: x - lastX,
    deltaY: y - lastY,
    lastX,
    lastY,
    x,
    y,
  };
}
