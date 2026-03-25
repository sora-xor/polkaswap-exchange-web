import { Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import pinia from '@/plugins/pinia';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { Bridge } from '@/utils/bridge/common/classes';
import type { IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { SubBridgeOutgoingReducer, SubBridgeIncomingReducer } from '@/utils/bridge/sub/classes/reducers';
import type { SubBridgeReducer } from '@/utils/bridge/sub/classes/reducers';
import { getTransaction, updateTransaction } from '@/utils/bridge/sub/utils';

import type { SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

interface SubBridgeConstructorOptions extends IBridgeConstructorOptions<SubHistory, SubBridgeReducer> {
  getSubBridgeConnector: () => SubNetworksConnector;
}

type SubBridge = Bridge<SubHistory, SubBridgeReducer, SubBridgeConstructorOptions>;

const resolveWalletStore = () => useWalletStore(pinia);
const resolveBridgeStore = () => useBridgeStore(pinia);

const subBridge: SubBridge = new Bridge({
  reducers: {
    [Operation.SubstrateIncoming]: SubBridgeIncomingReducer,
    [Operation.SubstrateOutgoing]: SubBridgeOutgoingReducer,
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
  addAsset: (assetAddress: string) => resolveWalletStore().addAsset(assetAddress),
  getAssetByAddress: (address: string) => useAssetsStore().assetDataByAddress(address),
  // transaction
  getTransaction: (id: string) => (getTransaction(id) || resolveBridgeStore().historyRecord?.[id]) as SubHistory,
  updateTransaction,
  // ui integration
  showNotification: (tx: SubHistory) => resolveBridgeStore().setNotificationData(tx),
  updateHistory: () => resolveBridgeStore().updateInternalHistory(),
  getActiveTransaction: () => resolveBridgeStore().activeTransaction as SubHistory,
  addTransactionToProgress: (id: string) => resolveBridgeStore().addTransactionToProgress(id),
  removeTransactionFromProgress: (id: string) => resolveBridgeStore().removeTransactionFromProgress(id),
  // transaction signing
  beforeTransactionSign: (api, ...args: any[]) => resolveBridgeStore().beforeTransactionSign(api, ...args),
  // custom
  getSubBridgeConnector: () => resolveBridgeStore().subBridgeConnector,
});

export default subBridge;
