import { Operation, isBridgeOperation, isEvmOperation, isSubstrateOperation } from '@sora-substrate/util';
import { api as soraApi } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import { isUnsignedTx as isUnsignedEthTx } from '@/utils/bridge/eth/utils';
import { isUnsignedTx as isUnsignedEvmTx } from '@/utils/bridge/evm/utils';
import { isUnsignedTx as isUnsignedSubTx } from '@/utils/bridge/sub/utils';
import ethersUtil from '@/utils/ethers-util';

import type { ApiPromise } from '@polkadot/api';
import type { IBridgeTransaction, BridgeHistory } from '@sora-substrate/util';
import type { EvmHistory } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

const waitForEvmTransactionStatus = async (
  hash: string,
  replaceCallback: (hash: string) => any,
  cancelCallback: (hash: string) => any
) => {
  try {
    const ethersInstance = await ethersUtil.getEthersInstance();
    await ethersInstance.waitForTransaction(hash);
  } catch (error: any) {
    if (ethers.isError(error, 'TRANSACTION_REPLACED')) {
      if (error.reason === 'cancelled') {
        cancelCallback(error.replacement.hash);
      } else {
        replaceCallback(error.replacement.hash);
      }
    }
  }
};

export const waitForEvmTransactionMined = async (hash?: string, updatedCallback?: (hash: string) => void) => {
  if (!hash) throw new Error('[waitForEvmTransactionMined]: hash cannot be empty!');

  await waitForEvmTransactionStatus(
    hash,
    async (replaceHash: string) => {
      updatedCallback?.(replaceHash);
      await waitForEvmTransactionMined(replaceHash, updatedCallback);
    },
    (cancelHash) => {
      throw new Error(`[waitForEvmTransactionMined]: The transaction was canceled by the user [${cancelHash}]`);
    }
  );
};

export const getEvmTransactionRecieptByHash = async (
  transactionHash: string
): Promise<{ fee: string; blockHash: string; blockNumber: number; from: string } | null> => {
  try {
    const receipt = await ethersUtil.getEvmTransactionReceipt(transactionHash);

    if (!receipt) throw new Error(`Transaction receipt "${transactionHash}" not found`);

    const { from, gasPrice, gasUsed, blockNumber, blockHash } = receipt;

    const fee = ethersUtil.calcEvmFee(gasPrice, gasUsed);

    return { fee, blockHash, blockNumber, from };
  } catch (error) {
    return null;
  }
};

export const getTransactionEvents = async (blockHash: string, transactionHash: string, api: ApiPromise) => {
  const extrinsics = await soraApi.system.getExtrinsicsFromBlock(blockHash, api);
  const extrinsicIndex = extrinsics.findIndex((ext) => ext.hash.toString() === transactionHash);

  if (extrinsicIndex === -1) throw new Error(`Unable to find extrinsic "${transactionHash}" in block "${blockHash}"`);

  const blockEvents = await soraApi.system.getBlockEvents(blockHash, api);
  const transactionEvents = blockEvents.filter(
    ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === extrinsicIndex
  );

  return transactionEvents;
};

export const findEventInBlock = async ({
  api,
  blockId,
  section,
  method,
}: {
  api: ApiPromise;
  blockId: string;
  section: string;
  method: string;
}) => {
  const blockEvents = await soraApi.system.getBlockEvents(blockId, api);
  const event = blockEvents.find(({ event }) => event.section === section && event.method === method);

  if (!event) throw new Error('Event not found');

  return event.event.data;
};

export const isOutgoingTransaction = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return false;

  return [Operation.EthBridgeOutgoing, Operation.EvmOutgoing, Operation.SubstrateOutgoing].includes(transaction.type);
};

export const isUnsignedTx = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return true;

  if (isBridgeOperation(transaction.type)) return isUnsignedEthTx(transaction as BridgeHistory);
  if (isEvmOperation(transaction.type)) return isUnsignedEvmTx(transaction as EvmHistory);
  if (isSubstrateOperation(transaction.type)) return isUnsignedSubTx(transaction as SubHistory);

  return true;
};
