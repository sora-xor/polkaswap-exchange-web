import { Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { beforeTransactionSign } from '@wallet';

import store from '@/store';
import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { Bridge } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { EvmBridgeOutgoingReducer, EvmBridgeIncomingReducer } from '@/utils/bridge/evm/classes/reducers';
import type { EvmBridgeReducer } from '@/utils/bridge/evm/classes/reducers';
import { updateTransaction } from '@/utils/bridge/evm/utils';

import type { EvmHistory } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

interface EvmBridgeConstructorOptions extends IBridgeConstructorOptions<EvmHistory, EvmBridgeReducer> {
  removeTransactionByHash: RemoveTransactionByHash<EvmHistory>;
}

type EvmBridge = Bridge<EvmHistory, EvmBridgeReducer, EvmBridgeConstructorOptions>;

const resolveWalletStore = () => useWalletStore();

const evmBridge: EvmBridge = new Bridge({
  reducers: {
    [Operation.EvmIncoming]: EvmBridgeIncomingReducer,
    [Operation.EvmOutgoing]: EvmBridgeOutgoingReducer,
  },
  // states
  boundaryStates: {
    [Operation.EvmIncoming]: {
      done: BridgeTxStatus.Done,
      failed: [BridgeTxStatus.Failed],
    },
    [Operation.EvmOutgoing]: {
      done: BridgeTxStatus.Done,
      failed: [BridgeTxStatus.Failed],
    },
  },
  // assets
  addAsset: (assetAddress: string) => resolveWalletStore().addAsset(assetAddress),
  getAssetByAddress: (address: string) => useAssetsStore().assetDataByAddress(address),
  // transaction
  getTransaction: (id: string) => (store.getters.bridge.history[id] || evmBridgeApi.getHistory(id)) as EvmHistory,
  updateTransaction,
  // ui integration
  showNotification: (tx: EvmHistory) => store.commit.bridge.setNotificationData(tx),
  updateHistory: () => store.dispatch.bridge.updateInternalHistory(),
  getActiveTransaction: () => store.getters.bridge.historyItem as EvmHistory,
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  // transaction signing
  beforeTransactionSign: (...args: any[]) => beforeTransactionSign(store.original, evmBridgeApi, ...args),
  // custom
  removeTransactionByHash: (options: { tx: Partial<EvmHistory>; force: boolean }) =>
    store.dispatch.bridge.removeHistory(options),
});

export default evmBridge;
