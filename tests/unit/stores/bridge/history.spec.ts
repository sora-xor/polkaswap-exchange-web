import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const bridgeStoreMock = vi.hoisted(() => ({
  setHistoryPage: vi.fn(),
  setHistoryId: vi.fn(),
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
}));

import { useBridgeHistoryStore } from '@/stores/bridge/history';

beforeEach(() => {
  setActivePinia(createPinia());
  bridgeStoreMock.setHistoryPage.mockClear();
  bridgeStoreMock.setHistoryId.mockClear();
});

describe('useBridgeHistoryStore', () => {
  it('sets history page and delegates compat syncing through the bridge Pinia facade', () => {
    const store = useBridgeHistoryStore();

    store.setHistoryPage(3.7);

    expect(store.historyPage).toBe(3);
    expect(bridgeStoreMock.setHistoryPage).toHaveBeenCalledWith(3);
  });

  it('defaults invalid history page to 1', () => {
    const store = useBridgeHistoryStore();

    store.setHistoryPage(0);

    expect(store.historyPage).toBe(1);
    expect(bridgeStoreMock.setHistoryPage).toHaveBeenCalledWith(1);
  });

  it('syncs history page updates coming from legacy store', () => {
    const store = useBridgeHistoryStore();

    store.syncHistoryPageFromLegacy(5);

    expect(store.historyPage).toBe(5);
  });

  it('sets history id and delegates compat syncing through the bridge Pinia facade', () => {
    const store = useBridgeHistoryStore();

    store.setHistoryId('abc');

    expect(store.historyId).toBe('abc');
    expect(bridgeStoreMock.setHistoryId).toHaveBeenCalledWith('abc');
  });

  it('syncs history id from legacy store', () => {
    const store = useBridgeHistoryStore();

    store.syncHistoryIdFromLegacy('legacy-id');

    expect(store.historyId).toBe('legacy-id');
  });
});
