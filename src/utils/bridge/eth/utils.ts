import compact from 'lodash/fp/compact';
import { Operation, BridgeTxStatus } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import type { ActionContext } from 'vuex';
import type { Subscription } from 'rxjs';
import type { BridgeHistory, BridgeApprovedRequest } from '@sora-substrate/util';

import { rootActionContext } from '@/store';
import { delay } from '@/utils';
import { BridgeType, KnownEthBridgeAsset } from '@/consts/evm';
import ethersUtil from '@/utils/ethers-util';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { EthBridgeHistory } from '@/utils/bridge/eth/history';
import { waitForEvmTransactionMined } from '@/utils/bridge/common/utils';

const SORA_REQUESTS_TIMEOUT = 6_000; // Block production time

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

export const waitForSoraTransactionHash = async (id: string): Promise<string> => {
  const tx = getTransaction(id);

  if (tx.hash) return tx.hash;
  const blockId = tx.blockId as string; // blockId cannot be empty
  const extrinsics = await api.system.getExtrinsicsFromBlock(blockId);

  if (extrinsics.length) {
    const blockEvents = await api.system.getBlockEvents(blockId);

    const extrinsicIndex = extrinsics.findIndex((item) => {
      const {
        signer,
        method: { method, section },
      } = item;

      return signer.toString() === tx.from && method === 'transferToSidechain' && section === 'ethBridge';
    });

    if (!Number.isFinite(extrinsicIndex)) throw new Error('[Bridge]: Transaction was failed');

    const event = blockEvents.find(
      ({ phase, event }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(extrinsicIndex) &&
        event.section === 'ethBridge' &&
        event.method === 'RequestRegistered'
    );

    if (!event) {
      throw new Error('[Bridge]: Transaction was failed');
    }

    const hash = event.event.data[0].toString();

    return hash;
  }

  await delay(SORA_REQUESTS_TIMEOUT);

  return await waitForSoraTransactionHash(id);
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
      } = rootState;

      const evmNetworkData = rootGetters.web3.availableNetworks[BridgeType.ETH].find(
        (network) => network.id === ethBridgeEvmNetwork
      );

      if (!evmNetworkData) {
        throw new Error(
          `[HASHI Bridge History]: Network "${ethBridgeEvmNetwork}" is not available in app. Please check app config`
        );
      }

      await ethersUtil.switchOrAddChain(evmNetworkData);

      if ((await ethersUtil.getEvmNetworkId()) !== ethBridgeEvmNetwork) {
        throw new Error(
          `[HASHI Bridge History]: Restoration canceled. Network "${rootState.web3.evmNetwork}" is connected, "${ethBridgeEvmNetwork}" expected`
        );
      }

      const assets = rootGetters.assets.assetsDataTable;
      const contracts = compact(
        Object.values(KnownEthBridgeAsset).map<Nullable<string>>((key) => ethBridgeContractAddress[key])
      );

      const ethBridgeHistory = new EthBridgeHistory(etherscanApiKey);

      await ethBridgeHistory.init();

      if (clearHistory) {
        await ethBridgeHistory.clearHistory(updateCallback);
      }

      await ethBridgeHistory.updateAccountHistory(address, assets, networkFees, contracts, updateCallback);
    } catch (error) {
      console.error(error);
    }
  };
