import { isEthOperation, isEvmOperation, isSubstrateOperation } from '@sora-substrate/sdk';
import { api as soraApi } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import type { GetTransaction, UpdateTransaction } from '@/utils/bridge/common/types';
import { isUnsignedTx as isUnsignedEthTx, isOutgoingTx as isOutgoingEthTx } from '@/utils/bridge/eth/utils';
import { isUnsignedTx as isUnsignedEvmTx, isOutgoingTx as isOutgoingEvmTx } from '@/utils/bridge/evm/utils';
import { isUnsignedTx as isUnsignedSubTx, isOutgoingTx as isOutgoingSubTx } from '@/utils/bridge/sub/utils';
import ethersUtil from '@/utils/ethers-util';

import type { ApiPromise } from '@polkadot/api';
import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { EvmHistory } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';

export const getEvmTransactionFee = (tx: ethers.TransactionResponse | ethers.TransactionReceipt) => {
  const gasPrice = tx.gasPrice;
  const gasAmount = 'gasUsed' in tx ? tx.gasUsed : tx.gasLimit;

  return ethersUtil.calcEvmFee(gasPrice, gasAmount);
};

export const waitForEvmTransactionMined = async (
  tx: ethers.TransactionResponse | null,
  replaceCallback?: (tx: ethers.TransactionResponse | null) => void
): Promise<ethers.TransactionReceipt | null> => {
  if (!tx) throw new Error('[waitForEvmTransactionMined]: tx cannot be empty!');

  try {
    const startBlock = tx.blockNumber ?? (await ethersUtil.getBlockNumber());
    const replaceableTx = tx.replaceableTransaction(startBlock);
    const txReceipt = await replaceableTx.wait();

    return txReceipt;
  } catch (error) {
    if (ethers.isError(error, 'TRANSACTION_REPLACED')) {
      const replacedTx = error.replacement;

      replaceCallback?.(replacedTx);

      return await waitForEvmTransactionMined(replacedTx, replaceCallback);
    }

    throw error;
  }
};

export const getEvmTransactionRecieptByHash = async (
  transactionHash: string
): Promise<{ fee: string; blockHash: string; blockNumber: number; from: string } | null> => {
  try {
    const receipt = await ethersUtil.getEvmTransactionReceipt(transactionHash);

    if (!receipt) throw new Error(`Transaction receipt "${transactionHash}" not found`);

    const { fee, from, blockNumber, blockHash } = receipt;

    return { fee: fee.toString(), blockHash, blockNumber, from };
  } catch (error) {
    return null;
  }
};

export const getBlockEventsByTxIndex = async (blockHash: string, index: number, api: ApiPromise) => {
  const blockEvents = await soraApi.system.getBlockEvents(blockHash, api);
  const transactionEvents = blockEvents.filter(
    ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === index
  );

  return transactionEvents;
};

export const getTransactionEvents = async (blockHash: string, transactionHash: string, api: ApiPromise) => {
  const extrinsics = await soraApi.system.getExtrinsicsFromBlock(blockHash, api);
  const extrinsicIndex = extrinsics.findIndex((ext) => ext.hash.toString() === transactionHash);

  if (extrinsicIndex === -1) throw new Error(`Unable to find extrinsic "${transactionHash}" in block "${blockHash}"`);

  const transactionEvents = await getBlockEventsByTxIndex(blockHash, extrinsicIndex, api);

  return transactionEvents;
};

export const isOutgoingTransaction = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return false;

  if (isEthOperation(transaction.type)) return isOutgoingEthTx(transaction as EthHistory);
  if (isEvmOperation(transaction.type)) return isOutgoingEvmTx(transaction as EvmHistory);
  if (isSubstrateOperation(transaction.type)) return isOutgoingSubTx(transaction as SubHistory);

  return false;
};

export const isUnsignedTx = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return true;

  if (isEthOperation(transaction.type)) return isUnsignedEthTx(transaction as EthHistory);
  if (isEvmOperation(transaction.type)) return isUnsignedEvmTx(transaction as EvmHistory);
  if (isSubstrateOperation(transaction.type)) return isUnsignedSubTx(transaction as SubHistory);

  return true;
};

export const onEvmTransactionPending = async (
  id: string,
  getTransaction: GetTransaction<IBridgeTransaction>,
  updateTransaction: UpdateTransaction<IBridgeTransaction>
) => {
  const tx = getTransaction(id);
  const hash = tx.externalHash;

  if (!hash) throw new Error(`[onEvmTransactionPending] Evm transaction hash is empty`);

  const txResponse = await ethersUtil.getEvmTransaction(hash);
  const txReceipt = await waitForEvmTransactionMined(txResponse, (replacedTx) => {
    if (replacedTx) {
      updateTransaction(id, {
        externalHash: replacedTx.hash,
        externalNetworkFee: getEvmTransactionFee(replacedTx),
      });
    }
  });

  const { fee, blockNumber, blockHash, status } = txReceipt || {};

  if (!(fee && blockNumber && blockHash)) {
    updateTransaction(id, { externalHash: undefined, externalNetworkFee: undefined });
    throw new Error(
      `[onEvmTransactionPending]: Ethereum transaction not found, hash: ${tx.externalHash}. 'externalHash' is reset`
    );
  }

  // In EthHistory 'blockHeight' will store evm block number
  updateTransaction(id, {
    externalNetworkFee: fee.toString(),
    externalBlockHeight: blockNumber,
    externalBlockId: blockHash,
  });

  const failedStatus = !Number(status ?? 0);

  if (failedStatus) {
    throw new Error(`[onEvmTransactionPending]: Ethereum transaction has failed status, hash: ${tx.externalHash}.`);
  }
};
