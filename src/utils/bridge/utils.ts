import { Operation, BridgeTxStatus, TransactionStatus } from '@sora-substrate/util';
import { ethers } from 'ethers';

import { bridgeApi } from './api';

import { delay } from '@/utils';
import ethersUtil from '@/utils/ethers-util';

import type { BridgeHistory, BridgeApprovedRequest, BridgeRequest } from '@sora-substrate/util';

const SORA_REQUESTS_TIMEOUT = 6 * 1000; // Block production time

export const getTransaction = (id: string): BridgeHistory => {
  const tx = bridgeApi.getHistory(id);

  if (!tx) throw new Error(`[Bridge]: Transaction is not exists: ${id}`);

  return tx;
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

export const waitForExtrinsicFinalization = async (id: string): Promise<BridgeHistory> => {
  const tx = getTransaction(id);

  if (
    tx &&
    [TransactionStatus.Error, TransactionStatus.Invalid, TransactionStatus.Usurped].includes(
      tx.status as TransactionStatus
    )
  ) {
    // TODO: maybe it's better to display a message about this errors from tx.errorMessage
    throw new Error(tx.errorMessage);
  }
  if (tx.status === TransactionStatus.Finalized) {
    return tx;
  }

  await delay(250);

  return await waitForExtrinsicFinalization(id);
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
