import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import type { IBridgeTransaction } from '@sora-substrate/sdk';

const telemetry = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
  getBuildVariantMock: vi.fn(() => 'vue3-native'),
}));
const bridgeStoreMock = vi.hoisted(() => ({
  setNotificationData: vi.fn(),
  setSignTxDialogVisibility: vi.fn(),
}));

vi.mock('@/utils/telemetry', () => ({
  trackEvent: telemetry.trackEventMock,
  getBuildVariant: telemetry.getBuildVariantMock,
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
}));

import { useBridgeTransactionsStore } from '@/stores/bridge/transactions';

const sampleTx = (id: string): IBridgeTransaction =>
  ({
    id,
    assetId: '0x01',
    amount: '100',
    network: 'eth',
  }) as IBridgeTransaction;

beforeEach(() => {
  setActivePinia(createPinia());
  telemetry.trackEventMock.mockClear();
  telemetry.getBuildVariantMock.mockClear();
  telemetry.getBuildVariantMock.mockReturnValue('vue3-native');
  bridgeStoreMock.setNotificationData.mockClear();
  bridgeStoreMock.setSignTxDialogVisibility.mockClear();
});

describe('useBridgeTransactionsStore', () => {
  it('syncs history entries from legacy store', () => {
    const store = useBridgeTransactionsStore();
    const history = { foo: sampleTx('foo') };

    store.syncHistoryInternalFromLegacy(history);

    expect(store.historyInternal).toEqual(history);
  });

  it('syncs loading flags', () => {
    const store = useBridgeTransactionsStore();
    const loading = { eth: true };

    store.syncHistoryLoadingFromLegacy(loading);

    expect(store.historyLoading.eth).toBe(true);
  });

  it('syncs waiting and in-progress maps', () => {
    const store = useBridgeTransactionsStore();
    store.syncWaitingForApproveFromLegacy({ tx1: true });
    store.syncInProgressIdsFromLegacy({ tx2: true });

    expect(store.waitingForApprove.tx1).toBe(true);
    expect(store.inProgressIds.tx2).toBe(true);
  });

  it('syncs notification data and dialog visibility', () => {
    const store = useBridgeTransactionsStore();
    const tx = sampleTx('notify');

    store.syncNotificationDataFromLegacy(tx);
    store.syncSignDialogVisibilityFromLegacy(true);

    expect(store.notificationData).toEqual(tx);
    expect(store.isSignTxDialogVisible).toBe(true);
  });

  it('emits telemetry on transfer submission', () => {
    const store = useBridgeTransactionsStore();

    store.trackTransferSubmitted({
      direction: 'soraToExternal',
      asset: 'XOR',
      amount: '10',
      network: 'SORA',
    });

    expect(telemetry.trackEventMock).toHaveBeenCalledWith(
      'bridge.pinia.transfer.submitted',
      expect.objectContaining({
        direction: 'soraToExternal',
        asset: 'XOR',
        amount: '10',
        buildVariant: 'vue3-native',
      })
    );
  });

  it('sets notification data via Pinia action and keeps bridge compat state aligned', () => {
    const store = useBridgeTransactionsStore();
    const tx = sampleTx('pinia');

    store.setNotificationData(tx);
    expect(store.notificationData).toEqual(tx);
    expect(bridgeStoreMock.setNotificationData).toHaveBeenCalledWith(tx);

    store.setNotificationData();
    expect(store.notificationData).toBeNull();
    expect(bridgeStoreMock.setNotificationData).toHaveBeenLastCalledWith(null);
  });

  it('sets sign dialog visibility via Pinia action and keeps bridge compat state aligned', () => {
    const store = useBridgeTransactionsStore();

    store.setSignTxDialogVisibility(true);
    expect(store.isSignTxDialogVisible).toBe(true);
    expect(bridgeStoreMock.setSignTxDialogVisibility).toHaveBeenCalledWith(true);

    store.setSignTxDialogVisibility(false);
    expect(store.isSignTxDialogVisible).toBe(false);
    expect(bridgeStoreMock.setSignTxDialogVisibility).toHaveBeenLastCalledWith(false);
  });
});
