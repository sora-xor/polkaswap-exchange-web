import { Operation } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';

import store from '@/store';
import { Bridge } from '@/utils/bridge/common/classes';
import type { IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import { SubBridgeOutgoingReducer, SubBridgeIncomingReducer } from '@/utils/bridge/sub/classes/reducers';
import type { SubBridgeReducer } from '@/utils/bridge/sub/classes/reducers';
import { getTransaction, updateTransaction } from '@/utils/bridge/sub/utils';

import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

type SubBridge = Bridge<SubHistory, SubBridgeReducer, IBridgeConstructorOptions<SubHistory, SubBridgeReducer>>;

const subBridge: SubBridge = new Bridge({
  reducers: {
    [Operation.SubstrateIncoming]: SubBridgeIncomingReducer,
    [Operation.SubstrateOutgoing]: SubBridgeOutgoingReducer,
  },
  signExternal: {
    [Operation.SubstrateIncoming]: async (id: string) => {},
  },
  // states
  boundaryStates: {
    [Operation.SubstrateIncoming]: {
      done: BridgeTxStatus.Done,
      failed: [BridgeTxStatus.Failed],
    },
    [Operation.SubstrateOutgoing]: {
      done: BridgeTxStatus.Done,
      failed: [BridgeTxStatus.Failed],
    },
  },
  // assets
  addAsset: (assetAddress: string) => store.dispatch.wallet.account.addAsset(assetAddress),
  getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
  // transaction
  getTransaction: (id: string) => (getTransaction(id) || store.getters.bridge.history[id]) as SubHistory,
  updateTransaction,
  // ui integration
  showNotification: (tx: SubHistory) => store.commit.bridge.setNotificationData(tx),
  updateHistory: () => store.dispatch.bridge.updateInternalHistory(),
  getActiveTransaction: () => store.getters.bridge.historyItem as SubHistory,
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  // transaction signing
  beforeTransactionSign: () => store.dispatch.wallet.transactions.beforeTransactionSign(),
});

export default subBridge;
