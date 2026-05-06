import { describe, expect, it, vi } from 'vitest';

const virtualScrollerMocks = vi.hoisted(() => ({
  DynamicScroller: { name: 'DynamicScroller' },
  DynamicScrollerItem: { name: 'DynamicScrollerItem' },
  RecycleScroller: { name: 'RecycleScroller' },
}));

vi.mock('vue-virtual-scroller', () => ({
  DynamicScroller: virtualScrollerMocks.DynamicScroller,
  DynamicScrollerItem: virtualScrollerMocks.DynamicScrollerItem,
  RecycleScroller: virtualScrollerMocks.RecycleScroller,
}));

import { install } from '@/lib/soraneo-wallet/src/plugins/virtualScroller';

describe('wallet plugins/virtualScroller', () => {
  it('registers the virtual scroller components on the app instance', () => {
    const app = {
      component: vi.fn(),
    } as any;

    install(app);

    expect(app.component).toHaveBeenNthCalledWith(1, 'RecycleScroller', virtualScrollerMocks.RecycleScroller);
    expect(app.component).toHaveBeenNthCalledWith(2, 'DynamicScroller', virtualScrollerMocks.DynamicScroller);
    expect(app.component).toHaveBeenNthCalledWith(3, 'DynamicScrollerItem', virtualScrollerMocks.DynamicScrollerItem);
  });
});
