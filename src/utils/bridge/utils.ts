import { Operation, BridgeTxStatus } from '@sora-substrate/util';
import { ethers } from 'ethers';

import { bridgeApi } from './api';

import { delay } from '@/utils';
import ethersUtil from '@/utils/ethers-util';

import type { BridgeHistory, BridgeApprovedRequest, BridgeRequest } from '@sora-substrate/util';

const SORA_REQUESTS_TIMEOUT = 6 * 1000; // Block production time

export const isUnsignedFromPart = (tx: BridgeHistory): boolean => {
  if (tx.type === Operation.EthBridgeOutgoing) {
    return !tx.blockId;
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

export const isOutgoingTransaction = (tx: BridgeHistory): boolean => {
  return tx?.type === Operation.EthBridgeOutgoing;
};

export const waitForApprovedRequest = async (hash: string): Promise<BridgeApprovedRequest> => {
  const approvedRequest = await bridgeApi.getApprovedRequest(hash);

  if (approvedRequest) {
    return approvedRequest;
  }

  const request = await bridgeApi.getRequest(hash);

  if (request && [BridgeTxStatus.Failed, BridgeTxStatus.Frozen].includes(request.status)) {
    throw new Error('Transaction was failed or canceled');
  }

  await delay(SORA_REQUESTS_TIMEOUT);

  return await waitForApprovedRequest(hash);
};

export const waitForRequest = async (hash: string): Promise<BridgeRequest> => {
  const request = await bridgeApi.getRequest(hash);

  if (request) {
    switch (request.status) {
      case BridgeTxStatus.Failed:
      case BridgeTxStatus.Frozen:
        throw new Error('Transaction was failed or canceled');
      case BridgeTxStatus.Done:
        return request;
    }
  }

  await delay(SORA_REQUESTS_TIMEOUT);

  return await waitForRequest(hash);
};

export const waitForSoraTransactionHash = async (id: string): Promise<string> => {
  const tx = getTransaction(id);

  if (tx.hash) return tx.hash;

  const signedBlock = await bridgeApi.api.rpc.chain.getBlock(tx.blockId);

  if (signedBlock.block?.extrinsics) {
    const blockEvents = await bridgeApi.api.query.system.events.at(tx.blockId as string);

    const extrinsicIndex = signedBlock.block.extrinsics.findIndex((item) => {
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
    const confirmations = 5;
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

export const waitForEvmTransaction = async (id: string) => {
  const transaction = getTransaction(id);

  if (!transaction.ethereumHash) throw new Error('Hash cannot be empty!');

  await waitForEvmTransactionStatus(
    transaction.ethereumHash,
    (ethereumHash: string) => {
      updateHistoryParams(id, { ethereumHash });
      waitForEvmTransaction(id);
    },
    () => {
      throw new Error('The transaction was canceled by the user');
    }
  );
};
