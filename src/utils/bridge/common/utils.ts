import { Operation, isBridgeOperation, isEvmOperation, isSubstrateOperation } from '@sora-substrate/util';
import { api } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import { isUnsignedTx as isUnsignedEthTx } from '@/utils/bridge/eth/utils';
import { isUnsignedTx as isUnsignedEvmTx } from '@/utils/bridge/evm/utils';
import { isUnsignedTx as isUnsignedSubTx } from '@/utils/bridge/sub/utils';
import ethersUtil from '@/utils/ethers-util';

import type { ApiPromise } from '@polkadot/api';
import type { IBridgeTransaction, BridgeHistory } from '@sora-substrate/util';
import type { EvmHistory } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';

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

export const getEvmTransactionRecieptByHash = async (
  transactionHash: string
): Promise<{ fee: string; blockHash: string; blockNumber: number; from: string } | null> => {
  try {
    const { from, effectiveGasPrice, gasUsed, blockNumber, blockHash } = await ethersUtil.getEvmTransactionReceipt(
      transactionHash
    );

    const fee = ethersUtil.calcEvmFee(effectiveGasPrice.toNumber(), gasUsed.toNumber());

    return { fee, blockHash, blockNumber, from };
  } catch (error) {
    return null;
  }
};

export const findUserTxIdInBlock = async (
  blockHash: string,
  soraHash: string,
  eventMethod: string,
  eventSection: string
): Promise<string | undefined> => {
  const blockEvents = await api.system.getBlockEvents(blockHash);

  const event = blockEvents.find(
    ({ phase, event }) =>
      phase.isApplyExtrinsic &&
      event.section === eventSection &&
      event.method === eventMethod &&
      event.data?.[0]?.toString() === soraHash
  );

  if (!event) return undefined;

  const index = event.phase.asApplyExtrinsic.toNumber();
  const extrinsics = await api.system.getExtrinsicsFromBlock(blockHash);
  const userExtrinsic = extrinsics[index];

  return userExtrinsic.hash.toString();
};

export const getBlockEvents = async (api: ApiPromise, blockHash: string) => {
  const apiInstanceAtBlock = await api.at(blockHash);
  const blockEvents = (await apiInstanceAtBlock.query.system.events()).toArray();

  return blockEvents;
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
  const blockEvents = await getBlockEvents(api, blockId);
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
