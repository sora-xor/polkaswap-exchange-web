import { Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus } from '@sora-substrate/sdk/build/bridgeProxy/consts';

import pinia from '@/plugins/pinia';
import { useAssetsStore } from '@/stores/assets';
import { useBridgeStore } from '@/stores/bridge';
import { useWalletStore } from '@/stores/wallet';
import { Bridge } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeConstructorOptions } from '@/utils/bridge/common/types';
import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { EvmBridgeOutgoingReducer, EvmBridgeIncomingReducer } from '@/utils/bridge/evm/classes/reducers';
import type { EvmBridgeReducer } from '@/utils/bridge/evm/classes/reducers';
import { updateTransaction } from '@/utils/bridge/evm/utils';

import type { EvmHistory } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';

interface EvmBridgeConstructorOptions extends IBridgeConstructorOptions<EvmHistory, EvmBridgeReducer> {
  removeTransactionByHash: RemoveTransactionByHash<EvmHistory>;
}

type EvmBridge = Bridge<EvmHistory, EvmBridgeReducer, EvmBridgeConstructorOptions>;

const resolveWalletStore = () => useWalletStore(pinia);
const resolveBridgeStore = () => useBridgeStore(pinia);

const evmBridge: EvmBridge = new Bridge({
  reducers: {
    [Operation.EvmIncoming]: EvmBridgeIncomingReducer,
    [Operation.EvmOutgoing]: EvmBridgeOutgoingReducer,
  },
  // states
  boundaryStates: {
    [Operation.EvmIncoming]: {
      done: BridgeTxStatus.Done,
      failed: [BridgeTxStatus.Failed],
    },
    [Operation.EvmOutgoing]: {
      done: BridgeTxStatus.Done,
      failed: [BridgeTxStatus.Failed],
    },
  },
  // assets
  addAsset: (assetAddress: string) => resolveWalletStore().addAsset(assetAddress),
  getAssetByAddress: (address: string) => useAssetsStore().assetDataByAddress(address),
  // transaction
  getTransaction: (id: string) =>
    (resolveBridgeStore().getHistoryTransaction(id) || evmBridgeApi.getHistory(id)) as EvmHistory,
  updateTransaction,
  // ui integration
  showNotification: (tx: EvmHistory) => resolveBridgeStore().setNotificationData(tx),
  updateHistory: () => resolveBridgeStore().updateInternalHistory(),
  getActiveTransaction: () => resolveBridgeStore().activeTransaction as EvmHistory,
  addTransactionToProgress: (id: string) => resolveBridgeStore().addTransactionToProgress(id),
  removeTransactionFromProgress: (id: string) => resolveBridgeStore().removeTransactionFromProgress(id),
  // transaction signing
  beforeTransactionSign: (...args: any[]) => resolveBridgeStore().beforeTransactionSign(evmBridgeApi, ...args),
  // custom
  removeTransactionByHash: (options: { tx: Partial<EvmHistory>; force: boolean }) =>
    resolveBridgeStore().removeHistory(options),
});

export default evmBridge;
