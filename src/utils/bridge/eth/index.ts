import { Operation } from '@sora-substrate/util';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import store from '@/store';
import { Bridge } from '@/utils/bridge/common/classes';
import type { GetBridgeHistoryInstance, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import { EthBridgeOutgoingReducer, EthBridgeIncomingReducer } from '@/utils/bridge/eth/classes/reducers';
import type { EthBridgeReducer } from '@/utils/bridge/eth/classes/reducers';
import type { EthBridgeHistory } from '@/utils/bridge/eth/history';
import { getTransaction, updateTransaction } from '@/utils/bridge/eth/utils';

import type { BridgeHistory } from '@sora-substrate/util';

interface EthBridgeConstructorOptions extends IBridgeConstructorOptions<BridgeHistory, EthBridgeReducer> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
}

type EthBridge = Bridge<BridgeHistory, EthBridgeReducer, EthBridgeConstructorOptions>;

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

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
    [Operation.EthBridgeIncoming]: {
      done: ETH_BRIDGE_STATES.SORA_COMMITED,
      failed: [ETH_BRIDGE_STATES.SORA_REJECTED, ETH_BRIDGE_STATES.EVM_REJECTED],
    },
    [Operation.EthBridgeOutgoing]: {
      done: ETH_BRIDGE_STATES.EVM_COMMITED,
      failed: [ETH_BRIDGE_STATES.SORA_REJECTED, ETH_BRIDGE_STATES.EVM_REJECTED],
    },
  },
  // assets
  addAsset: (assetAddress: string) => store.dispatch.wallet.account.addAsset(assetAddress),
  getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
  // transaction
  getTransaction,
  updateTransaction,
  // ui integration
  showNotification: (tx: BridgeHistory) => store.commit.bridge.setNotificationData(tx as any),
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  updateHistory: () => store.dispatch.bridge.updateInternalHistory(),
  getActiveTransaction: () => store.getters.bridge.historyItem as BridgeHistory,
  getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
});

export default ethBridge;
