import { isEthOperation, isEvmOperation, isSubstrateOperation } from '@sora-substrate/sdk';
import { XOR, TBCD } from '@sora-substrate/sdk/build/assets/consts';
import { api as soraApi } from '@/lib/soraneo-wallet/src/api';
import { ethers } from 'ethers';

import type { GetTransaction, UpdateTransaction } from '@/utils/bridge/common/types';
import {
  isUnsignedTx as isUnsignedEthTx,
  isOutgoingTx as isOutgoingEthTx,
  isWaitingForAction as isWaitingForEthAction,
} from '@/utils/bridge/eth/utils';
import { isUnsignedTx as isUnsignedEvmTx, isOutgoingTx as isOutgoingEvmTx } from '@/utils/bridge/evm/utils';
import { isUnsignedTx as isUnsignedSubTx, isOutgoingTx as isOutgoingSubTx } from '@/utils/bridge/sub/utils';
import ethersUtil from '@/utils/ethers-util';

import type { ApiPromise } from '@polkadot/api';
import type { IBridgeTransaction } from '@sora-substrate/sdk';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { EvmHistory } from '@sora-substrate/sdk/build/bridgeProxy/evm/types';
import type { SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { TransactionReplacedError, TransactionResponse } from 'ethers';

const DenominatedAssets = [XOR.address, TBCD.address];

type EvmReceiptMetadata = {
  fee: string;
  blockHash: string;
  blockNumber: number;
  from: string;
  status?: number;
};

export const isDenominatedAsset = (assetId: string): boolean => {
  return DenominatedAssets.includes(assetId);
};

export const getEvmTransactionFee = (tx: ethers.TransactionResponse | ethers.TransactionReceipt) => {
  const gasPrice = tx.gasPrice;
  const gasAmount = 'gasUsed' in tx ? tx.gasUsed : tx.gasLimit;

  return ethersUtil.calcEvmFee(gasPrice, gasAmount);
};

const normalizeEvmAddress = (value?: string | null): string => (value ?? '').toLowerCase();
const normalizeEvmData = (value?: string | null): string => (value ?? '0x').toLowerCase();
const normalizeEvmValue = (value: bigint | null | undefined): string => (value ?? 0n).toString();

/** Returns true only for same-action replacements, such as a gas-price speed-up. */
const isSameEvmActionReplacement = (originalTx: TransactionResponse, replacementTx: TransactionResponse): boolean => {
  return (
    normalizeEvmAddress(originalTx.to) === normalizeEvmAddress(replacementTx.to) &&
    normalizeEvmData(originalTx.data) === normalizeEvmData(replacementTx.data) &&
    normalizeEvmValue(originalTx.value) === normalizeEvmValue(replacementTx.value)
  );
};

const getValidEvmReplacement = (
  originalTx: TransactionResponse,
  error: TransactionReplacedError
): TransactionResponse => {
  if (error.cancelled || !isSameEvmActionReplacement(originalTx, error.replacement)) {
    throw new Error(
      `[waitForEvmTransactionMined]: EVM transaction ${originalTx.hash} was replaced by a different transaction`
    );
  }

  return error.replacement;
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
      const replacedTx = getValidEvmReplacement(tx, error);

      replaceCallback?.(replacedTx);

      return await waitForEvmTransactionMined(replacedTx, replaceCallback);
    }

    throw error;
  }
};

/** Converts an ethers receipt into the bridge metadata persisted in local history. */
const getEvmReceiptMetadata = (receipt: ethers.TransactionReceipt | null): EvmReceiptMetadata | null => {
  if (!receipt) return null;

  const { fee, from, blockNumber, blockHash, status } = receipt;

  if (fee == null || blockNumber == null || !blockHash) return null;

  return {
    fee: fee.toString(),
    from,
    blockNumber,
    blockHash,
    status: status == null ? undefined : Number(status),
  };
};

export const getEvmTransactionReceiptByHash = async (
  transactionHash: string
): Promise<EvmReceiptMetadata | null> => {
  try {
    const receipt = await ethersUtil.getEvmTransactionReceipt(transactionHash);
    const metadata = getEvmReceiptMetadata(receipt);

    if (!metadata) throw new Error(`Transaction receipt "${transactionHash}" not found`);

    return metadata;
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

export const isWaitingForAction = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return false;

  if (isEthOperation(transaction.type)) return isWaitingForEthAction(transaction as EthHistory);

  return false;
};

export const onEvmTransactionPending = async (
  id: string,
  getTransaction: GetTransaction<IBridgeTransaction>,
  updateTransaction: UpdateTransaction<IBridgeTransaction>
) => {
  const tx = getTransaction(id);
  const hash = tx.externalHash;

  if (!hash) throw new Error(`[onEvmTransactionPending] Evm transaction hash is empty`);

  let minedHash = hash;
  const txResponse = await ethersUtil.getEvmTransaction(hash);
  const txReceipt = txResponse
    ? await waitForEvmTransactionMined(txResponse, (replacedTx) => {
        if (replacedTx) {
          minedHash = replacedTx.hash;
          updateTransaction(id, {
            externalHash: replacedTx.hash,
            externalNetworkFee: getEvmTransactionFee(replacedTx),
          });
        }
      })
    : null;

  const receiptMetadata = getEvmReceiptMetadata(txReceipt) ?? (await getEvmTransactionReceiptByHash(minedHash));

  if (!receiptMetadata) {
    throw new Error(`[onEvmTransactionPending]: Ethereum transaction receipt not found, hash: ${minedHash}.`);
  }

  // In EthHistory 'blockHeight' will store evm block number
  updateTransaction(id, {
    externalNetworkFee: receiptMetadata.fee,
    externalBlockHeight: receiptMetadata.blockNumber,
    externalBlockId: receiptMetadata.blockHash,
  });

  if (receiptMetadata.status === 0) {
    throw new Error(`[onEvmTransactionPending]: Ethereum transaction has failed status, hash: ${minedHash}.`);
  }
};
