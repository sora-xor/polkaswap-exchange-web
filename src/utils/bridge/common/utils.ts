import { Operation, isBridgeOperation, isEvmOperation, isSubstrateOperation } from '@sora-substrate/util';
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

    await ethersInstance.waitForTransaction(hash, confirmations, timeout);
  } catch (error: any) {
    if (ethers.isError(error, 'TRANSACTION_REPLACED')) {
      if (error.reason === 'repriced' || error.reason === 'replaced') {
        replaceCallback(error.replacement.hash);
      } else {
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
    const receipt = await ethersUtil.getEvmTransactionReceipt(transactionHash);

    if (!receipt) throw new Error(`Transaction receipt "${transactionHash}" not found`);

    const { from, gasPrice, gasUsed, blockNumber, blockHash } = receipt;

    const fee = ethersUtil.calcEvmFee(Number(gasPrice), Number(gasUsed));

    return { fee, blockHash, blockNumber, from };
  } catch (error) {
    return null;
  }
};

export const findUserTxIdInBlock = async (
  api: ApiPromise,
  blockHash: string,
  soraHash: string,
  eventMethod: string,
  eventSection: string
): Promise<string | undefined> => {
  const blockEvents = await getBlockEvents(api, blockHash);

  const event = blockEvents.find(
    ({ phase, event }) =>
      phase.isApplyExtrinsic &&
      event.section === eventSection &&
      event.method === eventMethod &&
      event.data?.[0]?.toString() === soraHash
  );

  if (!event) return undefined;

  const index = event.phase.asApplyExtrinsic.toNumber();
  const extrinsics = await getBlockExtrinsics(api, blockHash);
  const userExtrinsic = extrinsics[index];

  return userExtrinsic.hash.toString();
};

export const getBlockHash = async (api: ApiPromise, blockNumber: number): Promise<string> => {
  if (!blockNumber) return '';

  const result = await api.rpc.chain.getBlockHash(blockNumber);

  return result.toString();
};

export const getBlockExtrinsics = async (api: ApiPromise, blockHash: string) => {
  const signedBlock = await api.rpc.chain.getBlock(blockHash);

  return signedBlock.block?.extrinsics.toArray() ?? [];
};

export const getBlockEvents = async (api: ApiPromise, blockHash: string) => {
  const apiInstanceAtBlock = await api.at(blockHash);
  const blockEvents = (await apiInstanceAtBlock.query.system.events()).toArray();

  return blockEvents;
};

export const getBlockTimestamp = async (api: ApiPromise, blockHash: string): Promise<number> => {
  const apiInstanceAtBlock = await api.at(blockHash);
  const timestamp = await apiInstanceAtBlock.query.timestamp.now();

  return timestamp.toNumber();
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
