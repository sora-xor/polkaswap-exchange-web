import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { PageNames } from '@/consts';

const routerPushMock = vi.hoisted(() => vi.fn());
const bridgeStoreMock = vi.hoisted(() => ({
  updateForm: vi.fn(),
  setHistoryId: vi.fn(),
  setAssetAddress: vi.fn(),
  get historyInternal() {
    return this.history.internal;
  },
  get historyLoading() {
    return this.history.loading;
  },
  history: {
    internal: {},
    loading: {},
  },
  networkHistoryId: 'kusama',
  setHistoryPage: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({ networkFees: {} }),
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
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
import useBridgeHistorySource from '@/composables/useBridgeHistory.ts?raw';

describe('useBridgeHistory', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.history.replaceState({}, '', '/bridge/history');
    routerPushMock.mockClear();
    bridgeStoreMock.updateForm.mockClear();
    bridgeStoreMock.setHistoryId.mockClear();
    bridgeStoreMock.setAssetAddress.mockClear();
    bridgeStoreMock.setHistoryPage.mockClear();
    bridgeStoreMock.history.internal = {};
    bridgeStoreMock.history.loading = {};
  });

  it('reads history and loading flags from the bridge Pinia store', () => {
    const tx = { id: 'tx-1' } as any;

    bridgeStoreMock.history.internal = { 'tx-1': tx };
    bridgeStoreMock.history.loading = { kusama: true };

    const { history, networkHistoryLoading } = useBridgeHistory();

    expect(history.value['tx-1']).toStrictEqual(tx);
    expect(networkHistoryLoading.value).toBe(true);
  });

  it('navigates back to bridge when browser history does not have an in-app back location', () => {
    const bridgeHistory = useBridgeHistory();

    bridgeHistory.handleBack();

    expect(routerPushMock).toHaveBeenCalledWith({ name: PageNames.Bridge });
  });

  it('uses browser history back location when available', () => {
    window.history.replaceState({ back: '/bridge' }, '', '/bridge/history');

    const bridgeHistory = useBridgeHistory();

    bridgeHistory.handleBack();

    expect(routerPushMock).toHaveBeenCalledWith('/bridge');
  });

  it('keeps bridge history navigation on vue-router and browser history state instead of the mirrored router store', () => {
    expect(useBridgeHistorySource).toContain("import { useRouter } from 'vue-router';");
    expect(useBridgeHistorySource).toContain("from '@/features/bridge/services/navigationHistory'");
    expect(useBridgeHistorySource).not.toContain("from '@/router'");
    expect(useBridgeHistorySource).not.toContain("from '@/stores/router'");
  });
});
