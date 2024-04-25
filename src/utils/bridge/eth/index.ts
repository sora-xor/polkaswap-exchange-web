import { Operation } from '@sora-substrate/util';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import store from '@/store';
import { Bridge } from '@/utils/bridge/common/classes';
import type { GetBridgeHistoryInstance, IBridgeConstructorOptions, SignExternal } from '@/utils/bridge/common/types';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { EthBridgeOutgoingReducer, EthBridgeIncomingReducer } from '@/utils/bridge/eth/classes/reducers';
import type { EthBridgeReducer } from '@/utils/bridge/eth/classes/reducers';
import { getTransaction, updateTransaction } from '@/utils/bridge/eth/utils';

import type { EthHistory } from '@sora-substrate/util/build/bridgeProxy/eth/types';

interface EthBridgeConstructorOptions extends IBridgeConstructorOptions<EthHistory, EthBridgeReducer> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
  signExternalOutgoing: SignExternal;
  signExternalIncoming: SignExternal;
}

type EthBridge = Bridge<EthHistory, EthBridgeReducer, EthBridgeConstructorOptions>;

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

const ethBridge: EthBridge = new Bridge({
  reducers: {
    [Operation.EthBridgeIncoming]: EthBridgeIncomingReducer,
    [Operation.EthBridgeOutgoing]: EthBridgeOutgoingReducer,
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
  showNotification: (tx: EthHistory) => store.commit.bridge.setNotificationData(tx as any),
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  updateHistory: () => store.dispatch.bridge.updateInternalHistory(),
  getActiveTransaction: () => store.getters.bridge.historyItem as EthHistory,
  // transaction signing
  beforeTransactionSign: () => store.dispatch.wallet.transactions.beforeTransactionSign(),
  // custom
  getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
  signExternalOutgoing: (id: string) => store.dispatch.bridge.signEthBridgeOutgoingEvm(id),
  signExternalIncoming: (id: string) => store.dispatch.bridge.signEthBridgeIncomingEvm(id),
});

export default ethBridge;
