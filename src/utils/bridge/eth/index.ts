import { Operation } from '@sora-substrate/sdk';
import { beforeTransactionSign } from '@wallet';

import { useAssetsStore } from '@/stores/assets';
import { useWalletStore } from '@/stores/wallet';
import { Bridge } from '@/utils/bridge/common/classes';
import type { GetBridgeHistoryInstance, IBridgeConstructorOptions, SignExternal } from '@/utils/bridge/common/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { EthBridgeOutgoingReducer, EthBridgeIncomingReducer } from '@/utils/bridge/eth/classes/reducers';
import type { EthBridgeReducer } from '@/utils/bridge/eth/classes/reducers';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import { getTransaction, updateTransaction } from '@/utils/bridge/eth/utils';
import { requireAppStore } from '@/utils/app-store';

import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

interface EthBridgeConstructorOptions extends IBridgeConstructorOptions<EthHistory, EthBridgeReducer> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
  signExternalOutgoing: SignExternal;
  signExternalIncoming: SignExternal;
}

type EthBridge = Bridge<EthHistory, EthBridgeReducer, EthBridgeConstructorOptions>;

const resolveWalletStore = () => useWalletStore();
const resolveAppStore = () => requireAppStore() as any;

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
  addAsset: (assetAddress: string) => resolveWalletStore().addAsset(assetAddress),
  getAssetByAddress: (address: string) => useAssetsStore().assetDataByAddress(address),
  // transaction
  getTransaction,
  updateTransaction,
  // ui integration
  showNotification: (tx: EthHistory) => resolveAppStore().commit?.bridge?.setNotificationData?.(tx as any),
  addTransactionToProgress: (id: string) => resolveAppStore().commit?.bridge?.addTxIdInProgress?.(id),
  removeTransactionFromProgress: (id: string) => resolveAppStore().commit?.bridge?.removeTxIdFromProgress?.(id),
  updateHistory: () => resolveAppStore().dispatch?.bridge?.updateInternalHistory?.(),
  getActiveTransaction: () => resolveAppStore().getters?.bridge?.historyItem as EthHistory,
  // transaction signing
  beforeTransactionSign: (...args: any[]) => beforeTransactionSign(resolveAppStore().original, ethBridgeApi, ...args),
  // custom
  getBridgeHistoryInstance: () => resolveAppStore().dispatch?.bridge?.getEthBridgeHistoryInstance?.(),
  signExternalOutgoing: (id: string) => resolveAppStore().dispatch?.bridge?.signEthBridgeOutgoingEvm?.(id),
  signExternalIncoming: (id: string) => resolveAppStore().dispatch?.bridge?.signEthBridgeIncomingEvm?.(id),
});

export default ethBridge;
