import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';
import { Operation } from '@sora-substrate/util';

import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { Bridge } from '@/utils/bridge/common/classes';
import { EvmBridgeOutgoingReducer, EvmBridgeIncomingReducer } from '@/utils/bridge/evm/classes/reducers';
import { updateTransaction } from '@/utils/bridge/evm/utils';

import store from '@/store';

import type { EvmBridge } from '@/utils/bridge/evm/classes/bridge';

const evmBridge: EvmBridge = new Bridge({
  reducers: {
    [Operation.EvmIncoming]: EvmBridgeIncomingReducer,
    [Operation.EvmOutgoing]: EvmBridgeOutgoingReducer,
  },
  signEvm: {
    [Operation.EvmIncoming]: async (id: string) => {},
    [Operation.EvmOutgoing]: async (id: string) => {},
  },
  signSora: {
    [Operation.EvmOutgoing]: async (id: string) => store.dispatch.bridge.signEvmBridgeOutgoingSora(id),
  },
  // states
  boundaryStates: {
    done: EvmTxStatus.Done,
    failed: EvmTxStatus.Failed,
  },
  // assets
  addAsset: (assetAddress: string) => store.dispatch.wallet.account.addAsset(assetAddress),
  getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
  // transaction
  getTransaction: (id: string) => (evmBridgeApi.getHistory(id) as EvmHistory) || store.getters.bridge.history[id],
  updateTransaction,
  // ui integration
  showNotification: (tx: EvmHistory) => store.commit.bridge.setNotificationData(tx),
  updateHistory: () => store.dispatch.bridge.updateInternalHistory(),
  getActiveTransaction: () => store.getters.bridge.historyItem as EvmHistory,
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  // custom
  removeTransactionByHash: (options: { tx: Partial<EvmHistory>; force: boolean }) =>
    store.dispatch.bridge.removeInternalHistory(options),
});

export default evmBridge;
