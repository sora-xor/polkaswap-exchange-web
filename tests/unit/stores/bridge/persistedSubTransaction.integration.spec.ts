import { Operation } from '@sora-substrate/sdk';
import { BridgeNetworkType, BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { EvmNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/evm/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => {
  const subHistory: Record<string, any> = {};
  const walletUnsubscribe = vi.fn();
  const walletSubscribe = vi.fn(() => walletUnsubscribe);

  return {
    subHistory,
    walletSubscribe,
    walletUnsubscribe,
    web3: {
      networkType: 'Eth',
      networkSelected: 'eth-ui-network',
    },
    getHistory: vi.fn((id: string) => subHistory[id] ?? null),
    saveHistory: vi.fn((transaction: Record<string, any>) => {
      subHistory[transaction.id] = transaction;
    }),
    connectorInit: vi.fn(async () => undefined),
    connectorStop: vi.fn(async () => undefined),
    ethHandle: vi.fn(async () => undefined),
    evmHandle: vi.fn(async () => undefined),
    addAsset: vi.fn(),
  };
});

vi.mock('@/stores/web3', () => ({
  useWeb3Store: () => runtime.web3,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    $subscribe: runtime.walletSubscribe,
    addAsset: runtime.addAsset,
    address: 'sora-address',
    networkFees: {},
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    registeredAssets: {},
    assetDataByAddress: (address: string) => ({ address, decimals: 18, externalDecimals: 12, symbol: 'LLD' }),
  }),
}));

vi.mock('@/utils/bridge/sub/api', () => ({
  subBridgeApi: {
    history: runtime.subHistory,
    getHistory: runtime.getHistory,
    saveHistory: runtime.saveHistory,
    isSoraParachain: () => false,
    isRelayChain: () => false,
    isStandalone: () => true,
    isEvmAccount: () => false,
  },
}));

vi.mock('@/utils/bridge/eth/api', () => ({
  ethBridgeApi: { history: {} },
}));

vi.mock('@/utils/bridge/evm/api', () => ({
  evmBridgeApi: { history: {} },
}));

vi.mock('@/utils/bridge/eth', () => ({
  default: { handleTransaction: runtime.ethHandle },
}));

vi.mock('@/utils/bridge/evm', () => ({
  default: { handleTransaction: runtime.evmHandle },
}));

vi.mock('@/utils/bridge/sub/classes/adapter', () => ({
  SubNetworksConnector: class {
    connectionState = {
      network: null,
      connection: null,
      connecting: false,
      ready: false,
    };

    init(...args: unknown[]) {
      return runtime.connectorInit(...args);
    }

    stop() {
      return runtime.connectorStop();
    }
  },
}));

vi.mock('@/utils/bridge/eth/classes/history', () => ({
  getEthBridgeHistoryInstance: vi.fn(),
  updateEthBridgeHistory: vi.fn(),
}));

vi.mock('@/utils/bridge/evm/classes/history', () => ({
  updateEvmBridgeHistory: vi.fn(),
}));

vi.mock('@/utils/bridge/sub/classes/history', () => ({
  updateSubBridgeHistory: vi.fn(),
}));

import pinia from '@/plugins/pinia';
import { useBridgeStore } from '@/stores/bridge';
import { SubBridgeIncomingReducer } from '@/utils/bridge/sub/classes/reducers';

describe('persisted Sub bridge retry integration', () => {
  beforeEach(() => {
    const store = useBridgeStore(pinia);

    store.$reset();
    Object.keys(runtime.subHistory).forEach((key) => delete runtime.subHistory[key]);
    runtime.web3.networkType = BridgeNetworkType.Eth;
    runtime.web3.networkSelected = EvmNetworkId.EthereumSepolia;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs read-only recovery from persisted state while the Eth UI cache is stale', async () => {
    const id = 'liberland-recovery';
    const sourceHash = '0x792b4777454b691cf8a022e495d4dd84bf1ea04b41739731687f93913570a785';
    const liberlandAccount = '5E57f3YkfbVzZDQAyv2sQuvbzXC7BQYGCnZ7F2pYtD5coDg6';
    const soraAccount = 'cnTVhGvdvWxTYdh3e9fFukiTRpobzTj6foUEaFAkWDx5SmyGx';
    const controlledError = new Error('controlled recovery stop');
    const store = useBridgeStore(pinia);
    const staleCached = {
      id,
      type: Operation.SubstrateIncoming,
      transactionState: BridgeTxStatus.Failed,
      externalNetwork: SubNetworkId.Liberland,
      assetAddress: 'lld',
      amount: '1',
      from: soraAccount,
      to: liberlandAccount,
      payload: { cacheMarker: 'stale' },
    };
    const persisted = {
      ...staleCached,
      txId: sourceHash,
      payload: {
        cacheMarker: 'persisted',
        startBlock: 123,
        submissionState: 'unknown',
      },
    };

    runtime.subHistory[id] = persisted;
    store.setHistoryTransaction('stale-storage-key', staleCached as any);
    store.setHistoryId(id);

    const changeState = vi.spyOn(SubBridgeIncomingReducer.prototype, 'changeState');
    const checkTxId = vi.spyOn(SubBridgeIncomingReducer.prototype as any, 'checkTxId');
    const beforeSign = vi.spyOn(SubBridgeIncomingReducer.prototype, 'beforeSign');
    vi.spyOn(SubBridgeIncomingReducer.prototype as any, 'updateTxIncomingData').mockRejectedValue(controlledError);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(store.handleBridgeTransaction(id)).resolves.toBeUndefined();

    expect(runtime.ethHandle).not.toHaveBeenCalled();
    expect(runtime.evmHandle).not.toHaveBeenCalled();
    expect(changeState.mock.calls.map(([transaction]) => transaction.transactionState)).toEqual([
      BridgeTxStatus.Failed,
      BridgeTxStatus.Pending,
    ]);
    expect(changeState.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        txId: sourceHash,
        payload: expect.objectContaining({ cacheMarker: 'persisted', startBlock: 123 }),
      })
    );
    expect(checkTxId).toHaveBeenCalledTimes(1);
    expect(beforeSign).not.toHaveBeenCalled();
    expect(runtime.connectorInit).toHaveBeenCalledWith(SubNetworkId.Liberland, store.subBridgeConnector);
    expect(runtime.walletSubscribe).toHaveBeenCalledTimes(1);
    expect(runtime.walletUnsubscribe).toHaveBeenCalledTimes(1);
    expect(runtime.subHistory[id]).toEqual(
      expect.objectContaining({
        transactionState: BridgeTxStatus.Failed,
        errorMessage: controlledError.message,
        txId: sourceHash,
        payload: expect.objectContaining({ cacheMarker: 'persisted', startBlock: 123 }),
      })
    );
    expect(store.activeTransaction).toBe(runtime.subHistory[id]);
    expect(store.history.internal['stale-storage-key']).toBeUndefined();
    expect(runtime.web3.networkType).toBe(BridgeNetworkType.Eth);
  });
});
