import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const routerPushMock = vi.hoisted(() => vi.fn());
const bridgeStoreMock = vi.hoisted(() => ({
  updateForm: vi.fn(),
  setHistoryId: vi.fn(),
  setAssetAddress: vi.fn(),
}));
const bridgeHistoryStoreMock = vi.hoisted(() => ({
  setHistoryPage: vi.fn(),
}));

vi.mock('@/router', () => ({
  default: {
    push: routerPushMock,
  },
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => ({ prev: null }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ networkFees: {} }),
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => ({
    ...bridgeStoreMock,
    networkHistoryId: 'kusama',
  }),
}));

vi.mock('@/stores/bridge/history', () => ({
  useBridgeHistoryStore: () => bridgeHistoryStoreMock,
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    withLoading: vi.fn((cb) => cb()),
    parentLoading: vi.fn(),
  }),
}));

vi.mock('@/utils/bridge/common/utils', () => ({
  isOutgoingTransaction: () => true,
}));

import { useBridgeHistory } from '@/composables/useBridgeHistory';
import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';

describe('useBridgeHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routerPushMock.mockClear();
    Object.values(bridgeStoreMock).forEach((mock) => mock.mockClear());
    Object.values(bridgeHistoryStoreMock).forEach((mock) => mock.mockClear());
  });

  it('reads history and loading flags from the Pinia bridge transactions store', () => {
    const transactionsStore = useBridgeTransactionsStore();
    const tx = { id: 'tx-1' } as any;

    transactionsStore.syncHistoryInternalFromLegacy({ 'tx-1': tx });
    transactionsStore.syncHistoryLoadingFromLegacy({ kusama: true });

    const { history, networkHistoryLoading } = useBridgeHistory();

    expect(history.value['tx-1']).toStrictEqual(tx);
    expect(networkHistoryLoading.value).toBe(true);
  });
});
