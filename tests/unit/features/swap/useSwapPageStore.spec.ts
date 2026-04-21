import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { buildDefaultSwapWidgetsVisibility, SWAP_GRID_ID } from '@/features/swap/constants/layout';
import { useSwapPageStore } from '@/features/swap/stores/useSwapPageStore';

describe('useSwapPageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with the versioned grid id and default widget visibility', () => {
    const store = useSwapPageStore();

    expect(store.gridId).toBe(SWAP_GRID_ID);
    expect(store.widgets).toEqual(buildDefaultSwapWidgetsVisibility());
    expect(store.options).toEqual({ edit: false });
    expect(store.customizePopper).toBe(false);
  });

  it('resets the local widget-editing state', () => {
    const store = useSwapPageStore();

    store.customizePopper = true;
    store.options = { edit: true };
    store.widgets.swapTransactions = true;

    store.resetWidgetPreferences();

    expect(store.customizePopper).toBe(false);
    expect(store.options).toEqual({ edit: false });
    expect(store.widgets).toEqual(buildDefaultSwapWidgetsVisibility());
  });
});
