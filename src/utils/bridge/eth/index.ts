import first from 'lodash/fp/first';
import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import { SUBQUERY_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import { getEvmTransactionRecieptByHash } from '@/utils/bridge/utils';
import { Bridge, BridgeTransactionStateHandler } from '@/utils/bridge/common/classes';

import { ethBridgeApi } from '@/utils/bridge/eth/api';
import {
  getTransaction,
  waitForApprovedRequest,
  waitForIncomingRequest,
  waitForSoraTransactionHash,
  waitForEvmTransaction,
  updateHistoryParams,
} from '@/utils/bridge/eth/utils';

import store from '@/store';

import type { BridgeHistory } from '@sora-substrate/util';
import type { EthBridgeHistory } from '@/utils/bridge/eth/history';
import type { BridgeConstructorOptions } from '@/utils/bridge/common/classes';
import type { BridgeTransaction, BridgeReducerOptions, GetBridgeHistoryInstance } from '@/utils/bridge/common/types';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

type EthBridgeReducerOptions<T extends BridgeTransaction> = BridgeReducerOptions<T> & {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
};

class EthBridgeTransactionStateHandler extends BridgeTransactionStateHandler<BridgeHistory> {
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance<EthBridgeHistory>;

  constructor(options: EthBridgeReducerOptions<BridgeHistory>) {
    super(options);

    this.getBridgeHistoryInstance = options.getBridgeHistoryInstance;
  }

  updateTransactionStep(id: string): void {
    this.updateTransactionParams(id, { transactionStep: 2 });
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
    this.updateTransactionParams(id, { transactionState: ETH_BRIDGE_STATES.EVM_PENDING });

    const tx = this.getTransaction(id);

    if (!tx.externalHash) {
      this.beforeSubmit(id);

      try {
        const { hash: externalHash, fee } = await this.signEvm(id);

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
            this.updateTransactionParams(id, { ethereumHash: transaction.hash });
            return;
          }
        }
        throw error;
      }
    }
  }
}

class EthBridgeOutgoingReducer extends EthBridgeTransactionStateHandler {
  async changeState(transaction: BridgeHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            this.beforeSubmit(id);
            this.updateTransactionParams(id, { transactionState: ETH_BRIDGE_STATES.SORA_PENDING });

            const { txId, blockId } = getTransaction(id);

            // transaction not signed
            if (!txId) {
              if (!this.signSora) throw new Error('[Bridge] signSora method is not defined');

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
          nextState: ETH_BRIDGE_STATES.SORA_COMMITED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => {
            const hash = await waitForSoraTransactionHash(id);

            this.updateTransactionParams(id, { hash });

            const tx = this.getTransaction(id);

            const { to } = await waitForApprovedRequest(tx);

            this.updateTransactionParams(id, { to });
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => this.updateTransactionStep(id),
        });
      }

      case ETH_BRIDGE_STATES.SORA_REJECTED:
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_COMMITED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: ETH_BRIDGE_STATES.EVM_COMMITED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => this.onComplete(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }
    }
  }
}

class EthBridgeIncomingReducer extends EthBridgeTransactionStateHandler {
  async changeState(transaction: BridgeHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case ETH_BRIDGE_STATES.INITIAL: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.EVM_PENDING,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.EVM_COMMITED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
          handler: async (id: string) => this.updateTransactionStep(id),
        });
      }

      case ETH_BRIDGE_STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.EVM_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.EVM_REJECTED,
        });
      }

      case ETH_BRIDGE_STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.SORA_PENDING,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
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
          },
        });
      }

      case ETH_BRIDGE_STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: ETH_BRIDGE_STATES.SORA_COMMITED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
          handler: async (id: string) => this.onComplete(id),
        });
      }

      case ETH_BRIDGE_STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: ETH_BRIDGE_STATES.SORA_SUBMITTED,
          rejectState: ETH_BRIDGE_STATES.SORA_REJECTED,
        });
      }
    }
  }
}

interface EthBridgeConstructorOptions
  extends BridgeConstructorOptions<BridgeHistory, EthBridgeTransactionStateHandler> {
  getBridgeHistoryInstance: GetBridgeHistoryInstance<EthBridgeHistory>;
}

export class EthBridge extends Bridge<BridgeHistory, EthBridgeTransactionStateHandler, EthBridgeConstructorOptions> {}

const ethBridge = new EthBridge({
  reducers: {
    [Operation.EthBridgeIncoming]: EthBridgeIncomingReducer,
    [Operation.EthBridgeOutgoing]: EthBridgeOutgoingReducer,
  },
  signEvm: {
    [Operation.EthBridgeIncoming]: (id: string) => store.dispatch.bridge.signEvmTransactionEvmToSora(id),
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEvmTransactionSoraToEvm(id),
  },
  signSora: {
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signSoraTransactionSoraToEvm(id),
  },
  boundaryStates: {
    done: BridgeTxStatus.Done,
    failed: BridgeTxStatus.Failed,
  },
  // assets
  addAsset: (assetAddress: string) => store.dispatch.wallet.account.addAsset(assetAddress),
  getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
  // transaction
  getTransaction,
  updateTransaction: updateHistoryParams,
  // ui integration
  showNotification: (tx: BridgeHistory) => store.commit.bridge.setNotificationData(tx as any),
  updateHistory: () => {
    console.info('updateHistory');
  },
  getActiveTransaction: () => {
    console.info('getActiveTransaction');
    return null;
  },
  addTransactionToProgress: (id: string) => store.commit.bridge.addTxIdInProgress(id),
  removeTransactionFromProgress: (id: string) => store.commit.bridge.removeTxIdFromProgress(id),
  // updateHistory: () => store.commit.bridge.setHistory(),
  // getActiveTransaction: () => store.getters.bridge.historyItem,
  getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
});

// export default appBridge;
