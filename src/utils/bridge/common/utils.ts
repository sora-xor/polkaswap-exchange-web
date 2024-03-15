import { Operation, isEthOperation, isEvmOperation, isSubstrateOperation } from '@sora-substrate/util';
import { api as soraApi } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import { isUnsignedTx as isUnsignedEthTx } from '@/utils/bridge/eth/utils';
import { isUnsignedTx as isUnsignedEvmTx } from '@/utils/bridge/evm/utils';
import { isUnsignedTx as isUnsignedSubTx } from '@/utils/bridge/sub/utils';
import ethersUtil from '@/utils/ethers-util';

import type { ApiPromise } from '@polkadot/api';
import type { IBridgeTransaction } from '@sora-substrate/util';
import type { EthHistory } from '@sora-substrate/util/build/bridgeProxy/eth/types';
import type { EvmHistory } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

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

  return [Operation.EthBridgeOutgoing, Operation.EvmOutgoing, Operation.SubstrateOutgoing].includes(transaction.type);
};

export const isUnsignedTx = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return true;

  if (isEthOperation(transaction.type)) return isUnsignedEthTx(transaction as EthHistory);
  if (isEvmOperation(transaction.type)) return isUnsignedEvmTx(transaction as EvmHistory);
  if (isSubstrateOperation(transaction.type)) return isUnsignedSubTx(transaction as SubHistory);

  return true;
};
