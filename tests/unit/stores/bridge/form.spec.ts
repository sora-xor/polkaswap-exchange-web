import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { FPNumber } from '@sora-substrate/sdk';

const telemetry = vi.hoisted(() => ({
  trackEventMock: vi.fn(),
}));

const legacyDispatchMock = vi.hoisted(() => ({
  updateExternalBalance: vi.fn(),
  updateExternalMinBalance: vi.fn(),
  updateExternalTransferFee: vi.fn(),
  updateExternalNetworkFee: vi.fn(),
  updateFeesAndLockedFunds: vi.fn(),
}));

vi.stubGlobal('getLegacyBridgeDispatch', () => legacyDispatchMock);

vi.mock('@/utils/telemetry', () => ({
  trackEvent: telemetry.trackEventMock,
}));

vi.mock('@/utils/app-store', () => ({
  requireAppStore: () => ({
    dispatch: {
      bridge: legacyDispatchMock,
    },
  }),
}));

import { useBridgeFormStore } from '@/stores/bridge/form';

beforeEach(() => {
  setActivePinia(createPinia());
  telemetry.trackEventMock.mockClear();
  Object.values(legacyDispatchMock).forEach((mock) => mock.mockClear());
});

afterAll(() => {
  vi.unstubAllGlobals();
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

describe('bridge form store legacy refresh', () => {
  it('calls legacy dispatchers', async () => {
    const store = useBridgeFormStore();

    await store.refreshExternalBalance();
    await store.refreshExternalMinBalance();
    await store.refreshExternalTransferFee();
    await store.refreshExternalNetworkFee();
    await store.refreshFeesAndLockedFunds();

    expect(legacyDispatchMock.updateExternalBalance).toHaveBeenCalled();
    expect(legacyDispatchMock.updateExternalMinBalance).toHaveBeenCalled();
    expect(legacyDispatchMock.updateExternalTransferFee).toHaveBeenCalled();
    expect(legacyDispatchMock.updateExternalNetworkFee).toHaveBeenCalled();
    expect(legacyDispatchMock.updateFeesAndLockedFunds).toHaveBeenCalled();
  });
});
