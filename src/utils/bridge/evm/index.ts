import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';
import { Operation } from '@sora-substrate/util';

import { Bridge } from '@/utils/bridge/common/classes';
import { EvmBridgeOutgoingReducer, EvmBridgeIncomingReducer } from '@/utils/bridge/evm/classes';
import { updateTransaction } from '@/utils/bridge/evm/utils';
import store from '@/store';

const evmBridge = new Bridge<EvmHistory, EvmBridgeOutgoingReducer | EvmBridgeIncomingReducer>({
  reducers: {
    [Operation.EvmIncoming]: EvmBridgeIncomingReducer,
    [Operation.EvmOutgoing]: EvmBridgeOutgoingReducer,
  },
  signEvm: {
    [Operation.EvmIncoming]: async (id: string) => {},
    [Operation.EvmOutgoing]: async (id: string) => {},
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
  getTransaction: (id: string) => store.getters.bridge.history[id],
  updateTransaction,
  // ui integration
  showNotification: (tx: EvmHistory) => store.commit.bridge.setNotificationData(tx),
  updateHistory: () => store.commit.bridge.setInternalHistory(),
  getActiveTransaction: () => store.getters.bridge.historyItem,
  setActiveTransaction: (id: string) => store.commit.bridge.setHistoryId(id),
});

export default evmBridge;
