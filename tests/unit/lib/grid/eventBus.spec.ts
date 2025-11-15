import { describe, it, expect, vi } from 'vitest';

import { GridEventBus } from '@/lib/grid/helpers/eventBus';

describe('GridEventBus', () => {
  it('registers handlers and forwards single payloads', () => {
    const bus = new GridEventBus();
    const handler = vi.fn();

    bus.$on('layout-ready', handler);
    const payload = { width: 420, height: 360 };

    bus.$emit('layout-ready', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('spreads multiple payload arguments for legacy listeners', () => {
    const bus = new GridEventBus();
    const handler = vi.fn();

    bus.$on('resize', handler);
    bus.$emit('resize', 'first', 2, { third: true });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('first', 2, { third: true });
  });

  it('supports removing handlers via $off and fully clearing them', () => {
    const bus = new GridEventBus();
    const handler = vi.fn();
    const secondHandler = vi.fn();

    bus.$on('resize', handler);
    bus.$off('resize', handler);
    bus.$emit('resize', 'ignored');

    expect(handler).not.toHaveBeenCalled();

    bus.$on('layout-ready', secondHandler);
    bus.clear();
    bus.$emit('layout-ready');

    expect(secondHandler).not.toHaveBeenCalled();

    const thirdHandler = vi.fn();
    bus.$on('layout-ready', thirdHandler);
    bus.$emit('layout-ready', 'after-clear');

    expect(thirdHandler).toHaveBeenCalledTimes(1);
    expect(thirdHandler).toHaveBeenCalledWith('after-clear');
  });
});
