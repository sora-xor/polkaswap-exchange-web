import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import type { BridgeHistory } from '@sora-substrate/util';

import { EthBridgeOutgoingReducer, EthBridgeIncomingReducer } from '@/utils/bridge/eth/classes/reducers';
import { EthBridge } from '@/utils/bridge/eth/classes/bridge';
import { getTransaction, updateHistoryParams } from '@/utils/bridge/eth/utils';

import store from '@/store';

const ethBridge = new EthBridge({
  reducers: {
    [Operation.EthBridgeIncoming]: EthBridgeIncomingReducer,
    [Operation.EthBridgeOutgoing]: EthBridgeOutgoingReducer,
  },
  signEvm: {
    [Operation.EthBridgeIncoming]: (id: string) => store.dispatch.bridge.signEvmTransactionEvmToSora(id),
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEvmTransactionSoraToEvm(id),
  },
  signSora: {
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signSoraTransactionSoraToEvm(id),
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
  updateHistory: () => {
    console.info('updateHistory');
  },
  getActiveTransaction: () => {
    console.info('getActiveTransaction');
    return null;
  },
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  // updateHistory: () => store.commit.bridge.setHistory(),
  // getActiveTransaction: () => store.getters.bridge.historyItem,
  getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
});

export default ethBridge;
