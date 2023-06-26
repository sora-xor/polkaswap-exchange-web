import { SUBQUERY_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';
import first from 'lodash/fp/first';

import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { IBridgeReducerOptions, GetBridgeHistoryInstance } from '@/utils/bridge/common/types';
import { getEvmTransactionRecieptByHash, waitForSoraTransactionHash } from '@/utils/bridge/common/utils';
import { ethBridgeApi } from '@/utils/bridge/eth/api';
import type { EthBridgeHistory } from '@/utils/bridge/eth/history';
import {
  getTransaction,
  waitForApprovedRequest,
  waitForIncomingRequest,
  waitForEvmTransaction,
} from '@/utils/bridge/eth/utils';

import type { BridgeHistory, IBridgeTransaction } from '@sora-substrate/util';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

type EthBridgeReducerOptions<T extends IBridgeTransaction> = IBridgeReducerOptions<T> & {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
};

export class EthBridgeReducer extends BridgeReducer<BridgeHistory> {
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance<EthBridgeHistory>;

  constructor(options: EthBridgeReducerOptions<BridgeHistory>) {
    super(options);

    this.getBridgeHistoryInstance = options.getBridgeHistoryInstance;
  }

  async onEvmPending(id: string): Promise<void> {
    await waitForEvmTransaction(id);

    const tx = this.getTransaction(id);
    const { evmNetworkFee, blockHeight } = (await getEvmTransactionRecieptByHash(tx.externalHash as string)) || {};

    if (!evmNetworkFee || !blockHeight) {
      this.updateTransactionParams(id, { externalHash: undefined, externalNetworkFee: undefined });
      throw new Error(
        `[${this.constructor.name}]: Ethereum transaction not found, hash: ${tx.externalHash}. 'externalHash' is reset`
      );
    }

    // In BridgeHistory 'blockHeight' will store evm block number
    this.updateTransactionParams(id, { externalNetworkFee: evmNetworkFee, blockHeight });
  }

  async onEvmSubmitted(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx.externalHash) {
      this.beforeSubmit(id);

      try {
        const { hash: externalHash, fee } = await this.signExternal(id);

        this.updateTransactionParams(id, {
          externalHash,
          externalNetworkFee: fee ?? tx.externalNetworkFee,
        });
      } catch (error: any) {
        // maybe transaction already completed, try to restore ethereum transaction hash
        if (error.code === ethers.errors.UNPREDICTABLE_GAS_LIMIT) {
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
  async changeState(transaction: BridgeHistory): Promise<void> {
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

            const { txId, blockId } = getTransaction(id);

            // transaction not signed
            if (!txId) {
              await this.signSora(id);
            }

            // signed sora transaction has to be parsed by subquery
            if (txId && !blockId) {
              // format account address to sora format
              const address = ethBridgeApi.formatAddress(ethBridgeApi.account.pair.address);
              const bridgeHistory = await this.getBridgeHistoryInstance();
              const historyItem = first(await bridgeHistory.fetchHistoryElements(address, 0, [txId]));

              if (historyItem) {
                this.updateTransactionParams(id, {
                  blockId: historyItem.blockHash,
                  hash: (historyItem.data as SUBQUERY_TYPES.HistoryElementEthBridgeOutgoing).requestHash,
                });
              } else {
                throw new Error(`[Bridge]: Can not restore TX from Subquery: ${txId}`);
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
            const eventData = await waitForSoraTransactionHash({
              section: 'ethBridge',
              method: 'transferToSidechain',
              eventMethod: 'RequestRegistered',
            })(id, this.getTransaction);

            const hash = eventData[0].toString();

            this.updateTransactionParams(id, { hash });

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
          handler: async (id: string) => await this.onEvmSubmitted(id),
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
  async changeState(transaction: BridgeHistory): Promise<void> {
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
          handler: async (id: string) => await this.onEvmSubmitted(id),
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
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }
    }
  }
}
