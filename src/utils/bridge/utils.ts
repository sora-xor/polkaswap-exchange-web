import { Operation, BridgeTxStatus } from '@sora-substrate/util';
import { ethers } from 'ethers';
import type { Subscription } from 'rxjs';
import type { BridgeHistory, BridgeApprovedRequest, BridgeNetworks } from '@sora-substrate/util';

import { bridgeApi } from './api';

import { delay } from '@/utils';
import ethersUtil from '@/utils/ethers-util';
import { api } from '@soramitsu/soraneo-wallet-web';

const SORA_REQUESTS_TIMEOUT = 6_000; // Block production time

export const isUnsignedFromPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.blockId && !tx.txId;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return !tx.ethereumHash;
  } else {
    return true;
  }
};

export const isUnsignedToPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.ethereumHash;
  } else if (tx.type === Operation.EthBridgeIncoming) {
    return false;
  } else {
    return true;
  }
};

export const getTransaction = (id: string): BridgeHistory => {
  const tx = bridgeApi.getHistory(id) as BridgeHistory;

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
};

export const updateHistoryParams = async (id: string, params = {}) => {
  const tx = getTransaction(id);
  bridgeApi.saveHistory({ ...tx, ...params });
};

export const isOutgoingTransaction = (tx: Nullable<BridgeHistory>): boolean => {
  return tx?.type === Operation.EthBridgeOutgoing;
};

export const waitForApprovedRequest = async (tx: BridgeHistory): Promise<BridgeApprovedRequest> => {
  if (!tx.hash) throw new Error(`[Bridge]: Tx hash cannot be empty`);
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = bridgeApi.subscribeOnRequestStatus(tx.hash as string).subscribe((status) => {
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

  return bridgeApi.getApprovedRequest(tx.hash as string);
};

export const waitForIncomingRequest = async (tx: BridgeHistory): Promise<{ hash: string; blockId: string }> => {
  if (!tx.ethereumHash) throw new Error('[Bridge]: ethereumHash cannot be empty!');
  if (!Number.isFinite(tx.externalNetwork))
    throw new Error(`[Bridge]: Tx externalNetwork should be a number, ${tx.externalNetwork} received`);

  let subscription!: Subscription;

  await new Promise<void>((resolve, reject) => {
    subscription = bridgeApi.subscribeOnRequest(tx.ethereumHash as string).subscribe((request) => {
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

  const soraHash = await bridgeApi.getSoraHashByEthereumHash(tx.ethereumHash as string);
  const soraBlockHash = await bridgeApi.getSoraBlockHashByRequestHash(tx.ethereumHash as string);

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

export const waitForEvmTransactionStatus = async (
  hash: string,
  replaceCallback: (hash: string) => any,
  cancelCallback: (hash: string) => any
) => {
  const ethersInstance = await ethersUtil.getEthersInstance();
  try {
    // the confirmations value was reduced from 5 to 1
    // since after the block release, we can be sure that the transaction is completed
    const confirmations = 1;
    const timeout = 0;
    const currentBlock = await ethersInstance.getBlockNumber();
    const blockOffset = currentBlock - 20;
    const { data, from, nonce, to, value } = await ethersInstance.getTransaction(hash);
    await ethersInstance._waitForTransaction(hash, confirmations, timeout, {
      data,
      from,
      nonce,
      to: to ?? '',
      value,
      startBlock: blockOffset,
    });
  } catch (error: any) {
    if (error.code === ethers.errors.TRANSACTION_REPLACED) {
      if (error.reason === 'repriced' || error.reason === 'replaced') {
        replaceCallback(error.replacement.hash);
      } else if (error.reason === 'canceled') {
        cancelCallback(error.replacement.hash);
      }
    }
  }
};

export const waitForEvmTransactionMined = async (hash?: string, updatedCallback?: (hash: string) => void) => {
  if (!hash) throw new Error('[Bridge]: evm hash cannot be empty!');

  await waitForEvmTransactionStatus(
    hash,
    async (replaceHash: string) => {
      updatedCallback?.(replaceHash);
      await waitForEvmTransactionMined(replaceHash, updatedCallback);
    },
    (cancelHash) => {
      throw new Error(`[Bridge]: The transaction was canceled by the user [${cancelHash}]`);
    }
  );
};

export const waitForEvmTransaction = async (id: string) => {
  const transaction = getTransaction(id);
  const updatedCallback = (ethereumHash: string) => updateHistoryParams(id, { ethereumHash });

  await waitForEvmTransactionMined(transaction.ethereumHash, updatedCallback);
};

export const getEvmTxRecieptByHash = async (
  ethereumHash: string
): Promise<{ ethereumNetworkFee: string; blockHeight: number; from: string } | null> => {
  try {
    const {
      from,
      effectiveGasPrice,
      gasUsed,
      blockNumber: blockHeight,
    } = await ethersUtil.getEvmTransactionReceipt(ethereumHash);

    const ethereumNetworkFee = ethersUtil.calcEvmFee(effectiveGasPrice.toNumber(), gasUsed.toNumber());

    return { ethereumNetworkFee, blockHeight, from };
  } catch (error) {
    return null;
  }
};
