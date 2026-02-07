import { Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { beforeTransactionSign } from '@wallet';

import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { Bridge } from '@/utils/bridge/common/classes';
import type { IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import type { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { SubBridgeOutgoingReducer, SubBridgeIncomingReducer } from '@/utils/bridge/sub/classes/reducers';
import type { SubBridgeReducer } from '@/utils/bridge/sub/classes/reducers';
import { getTransaction, updateTransaction } from '@/utils/bridge/sub/utils';
import { requireLegacyStore } from '@/utils/legacy-store';

import type { SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

interface SubBridgeConstructorOptions extends IBridgeConstructorOptions<SubHistory, SubBridgeReducer> {
  getSubBridgeConnector: () => SubNetworksConnector;
}

type SubBridge = Bridge<SubHistory, SubBridgeReducer, SubBridgeConstructorOptions>;

const resolveWalletStore = () => useWalletStore();
const resolveLegacyStore = () => requireLegacyStore() as any;

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
  getTransaction: (id: string) =>
    (getTransaction(id) || resolveLegacyStore().getters?.bridge?.history?.[id]) as SubHistory,
  updateTransaction,
  // ui integration
  showNotification: (tx: SubHistory) => resolveLegacyStore().commit?.bridge?.setNotificationData?.(tx),
  updateHistory: () => resolveLegacyStore().dispatch?.bridge?.updateInternalHistory?.(),
  getActiveTransaction: () => resolveLegacyStore().getters?.bridge?.historyItem as SubHistory,
  addTransactionToProgress: (id: string) => resolveLegacyStore().commit?.bridge?.addTxIdInProgress?.(id),
  removeTransactionFromProgress: (id: string) => resolveLegacyStore().commit?.bridge?.removeTxIdFromProgress?.(id),
  // transaction signing
  beforeTransactionSign: (api, ...args: any[]) => beforeTransactionSign(resolveLegacyStore().original, api, ...args),
  // custom
  getSubBridgeConnector: () => resolveLegacyStore().state?.bridge?.subBridgeConnector,
});

export default subBridge;
