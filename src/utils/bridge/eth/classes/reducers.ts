import { SUBQUERY_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import first from 'lodash/fp/first';

import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { IBridgeReducerOptions, GetBridgeHistoryInstance, SignExternal } from '@/utils/bridge/common/types';
import { getTransactionEvents, waitForEvmTransactionMined } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import type { EthBridgeHistory } from '@/utils/bridge/eth/classes/history';
import {
  getTransaction,
  getTransactionFee,
  waitForApprovedRequest,
  waitForIncomingRequest,
} from '@/utils/bridge/eth/utils';
import ethersUtil from '@/utils/ethers-util';

import type { IBridgeTransaction } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { EthHistory } from '@sora-substrate/util/build/bridgeProxy/eth/types';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

type EthBridgeReducerOptions<T extends IBridgeTransaction> = IBridgeReducerOptions<T> & {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
  signExternalOutgoing: SignExternal;
  signExternalIncoming: SignExternal;
};

export class EthBridgeReducer extends BridgeReducer<EthHistory> {
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance<EthBridgeHistory>;
  protected readonly signExternalOutgoing!: SignExternal;
  protected readonly signExternalIncoming!: SignExternal;

  constructor(options: EthBridgeReducerOptions<EthHistory>) {
    super(options);

    this.getBridgeHistoryInstance = options.getBridgeHistoryInstance;
    this.signExternalOutgoing = options.signExternalOutgoing;
    this.signExternalIncoming = options.signExternalIncoming;
  }

  async onEvmPending(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const hash = tx.externalHash;

    if (!hash) throw new Error(`[${this.constructor.name}]: Ethereum transaction hash is empty`);

    const txResponse = await ethersUtil.getEvmTransaction(hash);
    const txReceipt = await waitForEvmTransactionMined(txResponse, (replacedTx) => {
      if (replacedTx) {
        this.updateTransactionParams(id, {
          externalHash: replacedTx.hash,
          externalNetworkFee: getTransactionFee(replacedTx),
        });
      }
    });

    const { fee, blockNumber, blockHash } = txReceipt || {};

    if (!(fee && blockNumber && blockHash)) {
      this.updateTransactionParams(id, { externalHash: undefined, externalNetworkFee: undefined });
      throw new Error(
        `[${this.constructor.name}]: Ethereum transaction not found, hash: ${tx.externalHash}. 'externalHash' is reset`
      );
    }

    // In EthHistory 'blockHeight' will store evm block number
    this.updateTransactionParams(id, {
      externalNetworkFee: fee.toString(),
      externalBlockHeight: blockNumber,
      externalBlockId: blockHash,
    });
  }

  async onEvmSubmitted(id: string, signExternal: SignExternal): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx.externalHash) {
      this.beforeSubmit(id);

      try {
        const signedTx = await signExternal(id);
        // update after sign
        this.updateTransactionParams(id, {
          externalHash: signedTx.hash,
          externalNetworkFee: getTransactionFee(signedTx),
        });
      } catch (error: any) {
        // maybe transaction already completed, try to restore ethereum transaction hash
        if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
          const { to, hash, startTime } = tx;
          const bridgeHistory = await this.getBridgeHistoryInstance();
          const transaction = await bridgeHistory.findEthTxBySoraHash(
            to as string,
            hash as string,
            startTime as number
          );

          if (transaction) {
            this.updateTransactionParams(id, { externalHash: transaction.hash });
            return;
          }
        }
        throw error;
      }
    }
  }
}

export class EthBridgeOutgoingReducer extends EthBridgeReducer {
  async changeState(transaction: EthHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL:
      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            this.beforeSubmit(id);

            const tx = getTransaction(id);

            // transaction not signed
            if (!tx.txId) {
              await this.beforeSign(id);
              const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;
              await ethBridgeApi.transfer(asset, tx.to as string, tx.amount as string, id);
            }

            // signed sora transaction has to be parsed by subquery
            if (tx.txId && !tx.blockId) {
              // format account address to sora format
              const address = ethBridgeApi.formatAddress(ethBridgeApi.account!.pair.address);
              const bridgeHistory = await this.getBridgeHistoryInstance();
              const historyItem = first(await bridgeHistory.fetchHistoryElements(address, 0, [tx.txId]));

              if (historyItem) {
                this.updateTransactionParams(id, {
                  blockId: historyItem.blockHash,
                  hash: (historyItem.data as SUBQUERY_TYPES.HistoryElementEthBridgeOutgoing).requestHash,
                });
              } else {
                throw new Error(`[Bridge]: Can not restore TX from Subquery: ${tx.txId}`);
              }
            }
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            await this.waitForTransactionStatus(id);
            await this.waitForTransactionBlockId(id);

            const { blockId, txId, hash: soraHash } = this.getTransaction(id);

            if (!soraHash) {
              const transactionEvents = await getTransactionEvents(blockId as string, txId as string, ethBridgeApi.api);
              const requestEvent = transactionEvents.find((e) =>
                ethBridgeApi.api.events.ethBridge.RequestRegistered.is(e.event)
              );
              const hash = requestEvent.event.data[0].toString();

              this.updateTransactionParams(id, { hash });
            }

            const tx = this.getTransaction(id);

            const { to } = await waitForApprovedRequest(tx);

            this.updateTransactionParams(id, { to });
          },
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id, this.signExternalOutgoing),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_COMMITED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => {
            await this.onEvmPending(id);
            await this.onComplete(id);
          },
        });
      }

      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }
    }
  }
}

export class EthBridgeIncomingReducer extends EthBridgeReducer {
  async changeState(transaction: EthHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL:
      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id, this.signExternalIncoming),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id),
        });
      }

      case ETH_BRIDGE_STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_COMMITED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            const tx = this.getTransaction(id);
            const { hash, blockId } = await waitForIncomingRequest(tx);
            this.updateTransactionParams(id, { hash, blockId });
            await this.onComplete(id);
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }
    }
  }
}
