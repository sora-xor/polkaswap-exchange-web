import { Operation, BridgeTxStatus } from '@sora-substrate/util';
import { BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { rootActionContext } from '@/store';
import { waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { EthBridgeHistory } from '@/utils/bridge/eth/history';
import ethersUtil from '@/utils/ethers-util';

import type { BridgeHistory, BridgeApprovedRequest } from '@sora-substrate/util';
import type { Subscription } from 'rxjs';
import type { ActionContext } from 'vuex';

export const isUnsignedFromPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return !tx.externalHash;
  } else {
    return true;
  }
};

export const isUnsignedToPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.externalHash;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return false;
  } else {
    return true;
  }
};

export const isUnsignedTx = (tx: BridgeHistory): boolean => {
  return isUnsignedFromPart(tx);
};

export const getTransaction = (id: string): BridgeHistory => {
  const tx = ethBridgeApi.getHistory(id) as BridgeHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateTransaction = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  ethBridgeApi.saveHistory({ ...tx, ...params });
};

export const waitForApprovedRequest = async (tx: BridgeHistory): Promise<BridgeApprovedRequest> => {
  if (!tx.hash) throw new Error(`[Bridge]: Tx hash cannot be empty`);
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequestStatus(tx.hash as string).subscribe((status) => {
      switch (status) {
        case BridgeTxStatus.Failed:
        case BridgeTxStatus.Frozen:
          reject(new Error('[Bridge]: Transaction was failed or canceled'));
          break;
        case BridgeTxStatus.Ready:
          resolve();
          break;
      }
    });
  });

  subscription.unsubscribe();

  return ethBridgeApi.getApprovedRequest(tx.hash as string);
};

export const waitForIncomingRequest = async (tx: BridgeHistory): Promise<{ hash: string; blockId: string }> => {
  if (!tx.externalHash) throw new Error('[Bridge]: externalHash cannot be empty!');
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = ethBridgeApi.subscribeOnRequest(tx.externalHash as string).subscribe((request) => {
      if (request) {
        switch (request.status) {
          case BridgeTxStatus.Failed:
          case BridgeTxStatus.Frozen:
            reject(new Error('[Bridge]: Transaction was failed or canceled'));
            break;
          case BridgeTxStatus.Done:
            resolve();
            break;
        }
      }
    });
  });

  subscription.unsubscribe();

  const soraHash = await ethBridgeApi.getSoraHashByEthereumHash(tx.externalHash as string);
  const soraBlockHash = await ethBridgeApi.getSoraBlockHashByRequestHash(tx.externalHash as string);

  return { hash: soraHash, blockId: soraBlockHash };
};

export const waitForEvmTransaction = async (id: string) => {
  const transaction = getTransaction(id);
  const updatedCallback = (externalHash: string) => updateTransaction(id, { externalHash });

  await waitForEvmTransactionMined(transaction.externalHash, updatedCallback);
};

/**
 * Restore ETH bridge account transactions, using Subquery & Etherscan
 * @param context store context
 */
export const updateEthBridgeHistory =
  (context: ActionContext<any, any>) =>
  async (clearHistory = false, updateCallback?: VoidFunction): Promise<void> => {
    try {
      const { rootState, rootGetters } = rootActionContext(context);

      const {
        wallet: {
          account: { address },
          settings: {
            apiKeys: { etherscan: etherscanApiKey },
            networkFees,
          },
        },
        web3: { ethBridgeEvmNetwork, ethBridgeContractAddress },
        bridge: { inProgressIds },
      } = rootState;

      const networkData = rootGetters.web3.availableNetworks[BridgeNetworkType.EvmLegacy][ethBridgeEvmNetwork];

      if (!networkData) {
        throw new Error(
          `[HASHI Bridge History]: Network "${ethBridgeEvmNetwork}" is not available in app. Please check app config`
        );
      }

      await ethersUtil.switchOrAddChain(networkData.data);

      if ((await ethersUtil.getEvmNetworkId()) !== ethBridgeEvmNetwork) {
        throw new Error(
          `[HASHI Bridge History]: Restoration canceled. Network "${rootState.web3.evmNetworkProvided}" is connected, "${ethBridgeEvmNetwork}" expected`
        );
      }

      const assets = rootGetters.assets.assetsDataTable;

      const ethBridgeHistory = new EthBridgeHistory(etherscanApiKey);

      await ethBridgeHistory.init(ethBridgeContractAddress);

      if (clearHistory) {
        await ethBridgeHistory.clearHistory(updateCallback);
      }

      await ethBridgeHistory.updateAccountHistory(address, assets, networkFees, inProgressIds, updateCallback);
    } catch (error) {
      console.error(error);
    }
  };
