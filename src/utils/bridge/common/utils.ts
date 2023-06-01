import { ethers } from 'ethers';
import { Operation } from '@sora-substrate/util';
import { api, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { IBridgeTransaction } from '@sora-substrate/util';

import ethersUtil from '@/utils/ethers-util';
import { delay } from '@/utils';

import type { GetTransaction } from '@/utils/bridge/common/types';

const { BLOCK_PRODUCE_TIME } = WALLET_CONSTS; // Block production time

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
): Promise<{ evmNetworkFee: string; blockHeight: number; from: string } | null> => {
  try {
    const {
      from,
      effectiveGasPrice,
      gasUsed,
      blockNumber: blockHeight,
    } = await ethersUtil.getEvmTransactionReceipt(transactionHash);

    const evmNetworkFee = ethersUtil.calcEvmFee(effectiveGasPrice.toNumber(), gasUsed.toNumber());

    return { evmNetworkFee, blockHeight, from };
  } catch (error) {
    return null;
  }
};

export const isOutgoingTransaction = (transaction: Nullable<IBridgeTransaction>): boolean => {
  if (!transaction?.type) return false;

  return [Operation.EthBridgeOutgoing, Operation.EvmOutgoing, Operation.SubstrateOutgoing].includes(transaction.type);
};

export const waitForSoraTransactionHash =
  <T extends IBridgeTransaction>(options: { section: string; extrincicMethod: string; eventMethod: string }) =>
  async (id: string, getTransaction: GetTransaction<T>): Promise<string> => {
    const tx = getTransaction(id);

    console.log(tx);

    if (tx.hash) return tx.hash;

    if (tx.status) {
      const blockId = tx.blockId;

      if (!blockId) throw new Error('[Bridge]: Unable to retrieve transaction hash, transaction "blockId" is empty');

      const extrinsics = await api.system.getExtrinsicsFromBlock(blockId);

      if (extrinsics.length) {
        const blockEvents = await api.system.getBlockEvents(blockId);

        const extrinsicIndex = extrinsics.findIndex((item) => {
          const {
            signer,
            method: { method, section },
          } = item;

          return signer.toString() === tx.from && section === options.section && method === options.extrincicMethod;
        });

        if (!Number.isFinite(extrinsicIndex)) throw new Error('[Bridge]: Transaction was failed');

        const event = blockEvents.find(
          ({ phase, event }) =>
            phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(extrinsicIndex) &&
            event.section === options.section &&
            event.method === options.eventMethod
        );

        if (!event) {
          throw new Error('[Bridge]: Transaction was failed');
        }

        const hash = event.event.data[0].toString();

        return hash;
      }
    }

    await delay(BLOCK_PRODUCE_TIME);

    return await waitForSoraTransactionHash(options)(id, getTransaction);
  };
