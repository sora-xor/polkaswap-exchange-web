import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

let storeShape: any = null;

vi.mock('@/utils/legacy-store', () => ({
  withLegacyStore: (callback: (store: any) => unknown) => {
    if (!storeShape) return undefined;
    return callback(storeShape);
  },
}));

import { useBridgeHistoryStore } from '@/stores/bridge/history';

const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

beforeEach(() => {
  setActivePinia(createPinia());
  storeShape = null;
  warnSpy.mockClear();
});

describe('useBridgeHistoryStore', () => {
  it('sets history page and syncs with legacy store', () => {
    const setHistoryPage = vi.fn();
    storeShape = {
      commit: {
        bridge: {
          setHistoryPage,
        },
      },
    };
    const store = useBridgeHistoryStore();

    store.setHistoryPage(3.7);

    expect(store.historyPage).toBe(3);
    expect(setHistoryPage).toHaveBeenCalledWith(3);
  });

  it('defaults invalid history page to 1', () => {
    const setHistoryPage = vi.fn();
    storeShape = {
      commit: {
        bridge: {
          setHistoryPage,
        },
      },
    };
    const store = useBridgeHistoryStore();

    store.setHistoryPage(0);

    expect(store.historyPage).toBe(1);
    expect(setHistoryPage).toHaveBeenCalledWith(1);
  });

  it('syncs history page updates coming from legacy store', () => {
    const store = useBridgeHistoryStore();

    store.syncHistoryPageFromLegacy(5);

    expect(store.historyPage).toBe(5);
  });

  it('sets history id and syncs with legacy store', () => {
    const setHistoryId = vi.fn();
    storeShape = {
      commit: {
        bridge: {
          setHistoryId,
        },
      },
    };
    const store = useBridgeHistoryStore();

    store.setHistoryId('abc');

    expect(store.historyId).toBe('abc');
    expect(setHistoryId).toHaveBeenCalledWith('abc');
  });

  it('syncs history id from legacy store', () => {
    const store = useBridgeHistoryStore();

    store.syncHistoryIdFromLegacy('legacy-id');

    expect(store.historyId).toBe('legacy-id');
  });
});
