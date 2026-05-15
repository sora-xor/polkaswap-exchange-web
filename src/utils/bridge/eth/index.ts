import { Operation } from '@sora-substrate/sdk';

import pinia from '@/plugins/pinia';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { Bridge } from '@/utils/bridge/common/classes';
import type { GetBridgeHistoryInstance, IBridgeConstructorOptions, SignExternal } from '@/utils/bridge/common/types';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import { EthBridgeOutgoingReducer, EthBridgeIncomingReducer } from '@/utils/bridge/eth/classes/reducers';
import type { EthBridgeReducer } from '@/utils/bridge/eth/classes/reducers';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/constants';
import { getTransaction as getEthBridgeTransaction, updateTransaction } from '@/utils/bridge/eth/utils';

import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';

interface EthBridgeConstructorOptions extends IBridgeConstructorOptions<EthHistory, EthBridgeReducer> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
  signExternalOutgoing: SignExternal;
  signExternalIncoming: SignExternal;
}

type EthBridge = Bridge<EthHistory, EthBridgeReducer, EthBridgeConstructorOptions>;

const resolveWalletStore = () => useWalletStore(pinia);
const resolveBridgeStore = () => useBridgeStore(pinia);

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
  getTransaction: (id: string) =>
    (resolveBridgeStore().getHistoryTransaction(id) || getEthBridgeTransaction(id)) as EthHistory,
  updateTransaction,
  // ui integration
  showNotification: (tx: EthHistory) => resolveBridgeStore().setNotificationData(tx as any),
  addTransactionToProgress: (id: string) => resolveBridgeStore().addTransactionToProgress(id),
  removeTransactionFromProgress: (id: string) => resolveBridgeStore().removeTransactionFromProgress(id),
  updateHistory: () => resolveBridgeStore().updateInternalHistory(),
  getActiveTransaction: () => resolveBridgeStore().activeTransaction as EthHistory,
  // transaction signing
  beforeTransactionSign: (...args: any[]) => resolveBridgeStore().beforeTransactionSign(ethBridgeApi, ...args),
  // custom
  getBridgeHistoryInstance: () => resolveBridgeStore().getEthBridgeHistoryInstance() as Promise<EthBridgeHistory>,
  signExternalOutgoing: (id: string) => resolveBridgeStore().signEthBridgeOutgoingEvm(id) as Promise<unknown>,
  signExternalIncoming: (id: string) => resolveBridgeStore().signEthBridgeIncomingEvm(id) as Promise<unknown>,
});

export default ethBridge;
