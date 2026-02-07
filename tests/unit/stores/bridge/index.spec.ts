import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { Operation } from '@sora-substrate/sdk';
import { BridgeFocusedField } from '@/stores/bridge/types';
import { useBridgeStore } from '@/stores/bridge';

const walletStoreMock = {
  assetsDataTable: {
    '0x01': {
      address: '0x01',
      symbol: 'AAA',
      decimals: 18,
    },
  },
};

const legacyDispatchMock = vi.hoisted(() => ({
  handleBridgeTransaction: vi.fn(),
  removeHistory: vi.fn(),
  updateInternalHistory: vi.fn(),
  updateExternalHistory: vi.fn(),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/utils/legacy-store', () => ({
  requireLegacyStore: () => ({
    getters: {
      bridge: {
        networkHistoryId: 'kusama',
        nativeToken: { address: '0x02', symbol: 'BBB', decimals: 18 },
        sender: 'sender-address',
        recipient: 'recipient-address',
        isNativeTokenSelected: true,
        isSidechainAsset: false,
      },
      web3: {
        isValidNetwork: true,
      },
    },
    dispatch: {
      bridge: legacyDispatchMock,
    },
  }),
}));

describe('useBridgeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(legacyDispatchMock).forEach((mock) => mock.mockClear());
  });

  it('initialises with default values and toggles direction', () => {
    const store = useBridgeStore();

    expect(store.isSoraToEvm).toBe(true);
    expect(store.canSubmit).toBe(false);
    expect(store.form.amountSend).toBe('');

    store.toggleDirection();

    expect(store.isSoraToEvm).toBe(false);
  });

  it('updates form fields and exposes submit readiness', () => {
    const store = useBridgeStore();

    store.updateForm({ amountSend: '10', amountReceived: '9' });
    store.setBalancesFetching(false);
    store.setFeesFetching(false);

    expect(store.form.amountSend).toBe('10');
    expect(store.form.amountReceived).toBe('9');
    expect(store.canSubmit).toBe(true);

    store.setFocusedField(BridgeFocusedField.Received);
    expect(store.form.focusedField).toBe(BridgeFocusedField.Received);
  });

  it('exposes selected asset metadata via computed getter', async () => {
    const store = useBridgeStore();

    await store.setAssetAddress('0x01');

    expect(store.asset?.symbol).toBe('AAA');
  });

  it('normalises history page updates and tracks loading flags', () => {
    const store = useBridgeStore();

    store.setHistoryPage(0);
    expect(store.history.page).toBe(1);

    store.setHistoryPage(3.7);
    expect(store.history.page).toBe(3);

    store.setHistoryLoading('kusama' as any, true);
    expect(store.history.loading.kusama).toBe(true);
  });

  it('reads networkHistoryId from legacy store getters', () => {
    const store = useBridgeStore();
    expect(store.networkHistoryId).toBe('kusama');
  });

  it('exposes legacy-derived bridge metadata getters', () => {
    const store = useBridgeStore();

    expect(store.nativeToken?.address).toBe('0x02');
    expect(store.sender).toBe('sender-address');
    expect(store.recipient).toBe('recipient-address');
    expect(store.isNativeTokenSelected).toBe(true);
    expect(store.isSidechainAsset).toBe(false);
    expect(store.isValidNetwork).toBe(true);
  });

  it('adds and removes history transactions', () => {
    const store = useBridgeStore();
    const tx = {
      amount: '10',
      startTime: Date.now(),
      endTime: Date.now(),
    } as any;

    store.setHistoryTransaction('tx-1', tx);
    expect(store.history.internal['tx-1']).toStrictEqual(tx);

    store.removeHistoryTransaction('tx-1');
    expect(store.history.internal['tx-1']).toBeUndefined();
  });

  it('resets the state to defaults', () => {
    const store = useBridgeStore();

    store.updateForm({ amountSend: '5' });
    store.setHistoryId('abc');
    store.setSignTxDialogVisibility(true);
    store.form.isSoraToEvm = false;

    store.reset();

    expect(store.form.amountSend).toBe('');
    expect(store.history.id).toBe('');
    expect(store.flags.isSignTxDialogVisible).toBe(false);
    expect(store.operation).toBe(Operation.EthBridgeOutgoing);
  });

  it('manages subscription lifecycles', () => {
    const store = useBridgeStore();
    const blockSub = { unsubscribe: vi.fn() };
    const maxSub = { unsubscribe: vi.fn() };

    store.setBlockUpdatesSubscription(blockSub as any);
    store.setOutgoingMaxLimitSubscription(maxSub as any);

    store.resetBlockUpdatesSubscription();
    expect(blockSub.unsubscribe).toHaveBeenCalled();
    expect(store.subscriptions.blockUpdates).toBeNull();

    store.resetOutgoingMaxLimitSubscription();
    expect(maxSub.unsubscribe).toHaveBeenCalled();
    expect(store.subscriptions.outgoingMaxLimit).toBeNull();
    expect(store.balances.outgoingMaxLimit).toBeNull();
  });

  it('delegates history actions to the legacy bridge dispatchers', async () => {
    const store = useBridgeStore();
    const payload = { tx: { id: 'any-id' } };

    await store.updateInternalHistory();
    await store.updateExternalHistory();
    await store.updateExternalHistory(true);
    await store.handleBridgeTransaction('tx-1');
    await store.removeHistory(payload);

    expect(legacyDispatchMock.updateInternalHistory).toHaveBeenCalled();
    expect(legacyDispatchMock.updateExternalHistory).toHaveBeenNthCalledWith(1, false);
    expect(legacyDispatchMock.updateExternalHistory).toHaveBeenNthCalledWith(2, true);
    expect(legacyDispatchMock.handleBridgeTransaction).toHaveBeenCalledWith('tx-1');
    expect(legacyDispatchMock.removeHistory).toHaveBeenCalledWith({ tx: payload.tx, force: false });
  });
});
