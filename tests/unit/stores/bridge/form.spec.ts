import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { FPNumber } from '@sora-substrate/sdk';

const telemetry = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

const bridgeStoreMock = vi.hoisted(() => ({
  updateExternalBalance: vi.fn(),
  updateExternalMinBalance: vi.fn(),
  updateExternalTransferFee: vi.fn(),
  updateExternalNetworkFee: vi.fn(),
  updateFeesAndLockedFunds: vi.fn(),
}));

vi.mock('@/utils/telemetry', () => ({
  trackEvent: telemetry.trackEventMock,
}));

vi.mock('@/stores/bridge', () => ({
  useBridgeStore: () => bridgeStoreMock,
}));

import { useBridgeFormStore } from '@/stores/bridge/form';

beforeEach(() => {
  setActivePinia(createPinia());
  telemetry.trackEventMock.mockClear();
  Object.values(bridgeStoreMock).forEach((mock) => mock.mockClear());
});

describe('useBridgeFormStore', () => {
  it('syncs balances from legacy store', () => {
    const store = useBridgeFormStore();

    store.syncAssetSenderBalance('100');
    store.syncAssetRecipientBalance('50');
    store.syncAssetLockedBalance(new FPNumber(1));

    expect(store.assetSenderBalance).toBe('100');
    expect(store.assetRecipientBalance).toBe('50');
    expect(store.assetLockedBalance?.toString()).toBe('1');
    expect(telemetry.trackEventMock).toHaveBeenCalledWith('bridge.pinia.form.updated', {
      field: 'assetLockedBalance',
      category: 'balance',
    });
  });

  it('syncs fees and emits telemetry', () => {
    const store = useBridgeFormStore();

    store.syncSoraNetworkFee('10');
    store.syncExternalNetworkFee('2');
    store.syncExternalTransferFee('1');

    expect(store.soraNetworkFee).toBe('10');
    expect(store.externalNetworkFee).toBe('2');
    expect(store.externalTransferFee).toBe('1');
    expect(telemetry.trackEventMock).toHaveBeenCalledWith('bridge.pinia.form.updated', {
      field: 'externalTransferFee',
      category: 'fee',
    });
  });
});

describe('bridge form store refresh helpers', () => {
  it('calls bridge store refresh actions', async () => {
    const store = useBridgeFormStore();

    await store.refreshExternalBalance();
    await store.refreshExternalMinBalance();
    await store.refreshExternalTransferFee();
    await store.refreshExternalNetworkFee();
    await store.refreshFeesAndLockedFunds();

    expect(bridgeStoreMock.updateExternalBalance).toHaveBeenCalled();
    expect(bridgeStoreMock.updateExternalMinBalance).toHaveBeenCalled();
    expect(bridgeStoreMock.updateExternalTransferFee).toHaveBeenCalled();
    expect(bridgeStoreMock.updateExternalNetworkFee).toHaveBeenCalled();
    expect(bridgeStoreMock.updateFeesAndLockedFunds).toHaveBeenCalled();
  });
});
