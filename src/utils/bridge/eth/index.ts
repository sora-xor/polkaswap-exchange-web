import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import type { BridgeHistory } from '@sora-substrate/util';

import { Bridge } from '@/utils/bridge/common/classes';
import { EthBridgeOutgoingReducer, EthBridgeIncomingReducer } from '@/utils/bridge/eth/classes/reducers';
import { getTransaction, updateHistoryParams } from '@/utils/bridge/eth/utils';
import store from '@/store';

import type { EthBridge } from '@/utils/bridge/eth/classes/bridge';

const ethBridge: EthBridge = new Bridge({
  reducers: {
    [Operation.EthBridgeIncoming]: EthBridgeIncomingReducer,
    [Operation.EthBridgeOutgoing]: EthBridgeOutgoingReducer,
  },
  signEvm: {
    [Operation.EthBridgeIncoming]: (id: string) => store.dispatch.bridge.signEthBridgeIncomingEvm(id),
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEthBridgeOutgoingEvm(id),
  },
  signSora: {
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEthBridgeOutgoingSora(id),
  },
  boundaryStates: {
    done: BridgeTxStatus.Done,
    failed: BridgeTxStatus.Failed,
  },
  // assets
  addAsset: (assetAddress: string) => store.dispatch.wallet.account.addAsset(assetAddress),
  getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
  // transaction
  getTransaction,
  updateTransaction: updateHistoryParams,
  // ui integration
  showNotification: (tx: BridgeHistory) => store.commit.bridge.setNotificationData(tx as any),
  getActiveTransaction: () => {
    console.info('getActiveTransaction');
    return null;
  },
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  updateHistory: () => store.dispatch.bridge.updateInternalHistory(),
  // getActiveTransaction: () => store.getters.bridge.historyItem,
  getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
});

export default ethBridge;
