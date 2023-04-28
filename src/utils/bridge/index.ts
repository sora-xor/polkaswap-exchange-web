import first from 'lodash/fp/first';
import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import { SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import store from '@/store';

import { bridgeApi } from './api';
import { STATES } from './types';
import {
  getTransaction,
  updateHistoryParams,
  waitForIncomingRequest,
  waitForApprovedRequest,
  waitForSoraTransactionHash,
  waitForEvmTransaction,
  getEvmTxRecieptByHash,
} from './utils';

import type { BridgeHistory } from '@sora-substrate/util';
import type { HandleTransactionPayload } from './types';
import type { EthBridgeHistory } from './history';
import type { SignTxResult } from '@/store/bridge/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

type SignedEvmTxResult = SignTxResult;

type SignEvm = (id: string) => Promise<SignedEvmTxResult>;
type SignSora = (id: string) => Promise<void>;
type GetActiveHistoryItem = () => Nullable<BridgeHistory>;
type GetBridgeHistoryInstance = () => Promise<EthBridgeHistory>;
type ShowNotification = (tx: BridgeHistory) => void;

interface BridgeCommonOptions {
  updateHistory: FnWithoutArgs;
  showNotification: ShowNotification;
  getActiveHistoryItem: GetActiveHistoryItem;
  getBridgeHistoryInstance: GetBridgeHistoryInstance;
}

interface BridgeOptions extends BridgeCommonOptions {
  signEvm: {
    [Operation.EthBridgeOutgoing]: SignEvm;
    [Operation.EthBridgeIncoming]: SignEvm;
  };
  signSora: {
    [Operation.EthBridgeOutgoing]: SignSora;
  };
}

interface BridgeReducerOptions extends BridgeCommonOptions {
  signEvm: SignEvm;
  signSora?: SignSora;
}

class BridgeTransactionStateHandler {
  protected readonly signEvm!: SignEvm;
  protected readonly signSora!: SignSora | undefined;
  protected readonly updateHistory!: FnWithoutArgs;
  protected readonly showNotification!: ShowNotification;
  protected readonly getActiveHistoryItem!: GetActiveHistoryItem;
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance;

  constructor({
    signEvm,
    signSora,
    updateHistory,
    showNotification,
    getActiveHistoryItem,
    getBridgeHistoryInstance,
  }: BridgeReducerOptions) {
    this.signEvm = signEvm;
    this.signSora = signSora;
    this.updateHistory = updateHistory;
    this.showNotification = showNotification;
    this.getActiveHistoryItem = getActiveHistoryItem;
    this.getBridgeHistoryInstance = getBridgeHistoryInstance;
  }

  async handleState(id: string, { status, nextState, rejectState, handler }: HandleTransactionPayload): Promise<void> {
    try {
      const transaction = getTransaction(id);

      if (transaction.status === BridgeTxStatus.Done) return;
      if (status && transaction.status !== status) {
        this.updateTransactionParams(id, { status });
      }

      if (typeof handler === 'function') {
        await handler(id);
      }

      this.updateTransactionParams(id, { transactionState: nextState });
    } catch (error) {
      console.error(error);

      const transaction = getTransaction(id);
      const failed = transaction.status === BridgeTxStatus.Failed;

      this.updateTransactionParams(id, {
        status: BridgeTxStatus.Failed,
        transactionState: rejectState,
        endTime: failed ? transaction.endTime : Date.now(),
      });
    }
  }

  updateTransactionParams(id: string, params = {}): void {
    updateHistoryParams(id, params);

    this.updateHistory();
  }

  onComplete(id: string): void {
    this.updateTransactionParams(id, { endTime: Date.now() });
    const tx = getTransaction(id);
    const { type, assetAddress } = tx;
    if (type === Operation.EthBridgeIncoming && assetAddress) {
      const asset = store.getters.wallet.account.accountAssetsAddressTable[assetAddress];
      if (!asset) {
        // Add asset to account assets
        store.dispatch.wallet.account.addAsset(assetAddress);
      }
    }
    this.showNotification(tx);
  }

  updateTransactionStep(id: string): void {
    this.updateTransactionParams(id, { transactionStep: 2 });
  }

  async beforeSubmit(id: string): Promise<void> {
    const activeHistoryItem = this.getActiveHistoryItem();

    if (!activeHistoryItem || activeHistoryItem.id !== id) {
      throw new Error(`[Bridge]: Transaction ${id} stopped, user should sign transaction in ui`);
    }
  }

  async onEvmPending(id: string): Promise<void> {
    await waitForEvmTransaction(id);

    const tx = getTransaction(id);
    const { ethereumNetworkFee, blockHeight } = (await getEvmTxRecieptByHash(tx.ethereumHash as string)) || {};

    if (!ethereumNetworkFee || !blockHeight) {
      this.updateTransactionParams(id, { ethereumHash: undefined, ethereumNetworkFee: undefined });
      throw new Error(`[Bridge]: Ethereum transaction not found, hash: ${tx.ethereumHash}. 'ethereumHash' is reset`);
    }

    // In BridgeHistory 'blockHeight' will store evm block number
    this.updateTransactionParams(id, { ethereumNetworkFee, blockHeight });
  }

  async onEvmSubmitted(id: string): Promise<void> {
    this.updateTransactionParams(id, { transactionState: STATES.EVM_PENDING });

    const tx = getTransaction(id);

    if (!tx.ethereumHash) {
      await this.beforeSubmit(id);

      try {
        const { hash: ethereumHash, fee } = await this.signEvm(id);

        this.updateTransactionParams(id, {
          ethereumHash,
          ethereumNetworkFee: fee ?? tx.ethereumNetworkFee,
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

class EthBridgeOutgoingStateReducer extends BridgeTransactionStateHandler {
  async changeState(transaction: BridgeHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case STATES.INITIAL: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
        });
      }

      case STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_PENDING,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => {
            await this.beforeSubmit(id);
            this.updateTransactionParams(id, { transactionState: STATES.SORA_PENDING });

            const { txId, blockId } = getTransaction(id);

            // transaction not signed
            if (!txId) {
              if (!this.signSora) throw new Error('[Bridge] signSora method is not defined');

              await this.signSora(id);
            }

            // signed sora transaction has to be parsed by subquery
            if (txId && !blockId) {
              // format account address to sora format
              const address = bridgeApi.formatAddress(bridgeApi.account.pair.address);
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

      case STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => {
            const hash = await waitForSoraTransactionHash(id);

            this.updateTransactionParams(id, { hash });

            const tx = getTransaction(id);

            const { to } = await waitForApprovedRequest(tx);

            this.updateTransactionParams(id, { to });
          },
        });
      }

      case STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => this.updateTransactionStep(id),
        });
      }

      case STATES.SORA_REJECTED:
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
        });

      case STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.EVM_PENDING,
          rejectState: STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id),
        });
      }

      case STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_COMMITED,
          rejectState: STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id),
        });
      }

      case STATES.EVM_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: STATES.EVM_COMMITED,
          rejectState: STATES.EVM_REJECTED,
          handler: async (id: string) => this.onComplete(id),
        });
      }

      case STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.EVM_SUBMITTED,
          rejectState: STATES.EVM_REJECTED,
        });
      }
    }
  }
}

class EthBridgeIncomingStateReducer extends BridgeTransactionStateHandler {
  async changeState(transaction: BridgeHistory): Promise<void> {
    if (!transaction.id) throw new Error('[Bridge]: TX ID cannot be empty');

    switch (transaction.transactionState) {
      case STATES.INITIAL: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.EVM_SUBMITTED,
          rejectState: STATES.EVM_REJECTED,
        });
      }

      case STATES.EVM_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.EVM_PENDING,
          rejectState: STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmSubmitted(id),
        });
      }

      case STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_COMMITED,
          rejectState: STATES.EVM_REJECTED,
          handler: async (id: string) => await this.onEvmPending(id),
        });
      }

      case STATES.EVM_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: STATES.SORA_SUBMITTED,
          rejectState: STATES.EVM_REJECTED,
          handler: async (id: string) => this.updateTransactionStep(id),
        });
      }

      case STATES.EVM_REJECTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.EVM_SUBMITTED,
          rejectState: STATES.EVM_REJECTED,
        });
      }

      case STATES.SORA_SUBMITTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_PENDING,
          rejectState: STATES.SORA_REJECTED,
        });
      }

      case STATES.SORA_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => {
            const tx = getTransaction(id);
            const { hash, blockId } = await waitForIncomingRequest(tx);
            this.updateTransactionParams(id, { hash, blockId });
          },
        });
      }

      case STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => this.onComplete(id),
        });
      }

      case STATES.SORA_REJECTED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
        });
      }
    }
  }
}

type BridgeReducer = EthBridgeOutgoingStateReducer | EthBridgeIncomingStateReducer;

type BridgeReducers = {
  [Operation.EthBridgeOutgoing]: BridgeReducer;
  [Operation.EthBridgeIncoming]: BridgeReducer;
};

class Bridge {
  protected reducers!: BridgeReducers;

  static readonly OPERATION_REDUCERS = {
    [Operation.EthBridgeOutgoing]: EthBridgeOutgoingStateReducer,
    [Operation.EthBridgeIncoming]: EthBridgeIncomingStateReducer,
  };

  constructor({ signEvm, signSora, ...rest }: BridgeOptions) {
    this.reducers = Object.entries(Bridge.OPERATION_REDUCERS).reduce((acc, [operation, Reducer]) => {
      if (!(operation in acc)) {
        const reducer = new Reducer({ ...rest, signEvm: signEvm[operation], signSora: signSora[operation] });

        acc[operation] = reducer;
      }
      return acc;
    }, {} as BridgeReducers);
  }

  async handleTransaction(id: string) {
    const transaction = getTransaction(id);

    const { type } = transaction;

    if (!(type in this.reducers)) {
      throw new Error(`[Bridge]: Unsupported operation '${type}'`);
    }

    const reducer = this.reducers[type];

    await this.process(transaction, reducer);
  }

  private async process(transaction: BridgeHistory, reducer: BridgeReducer) {
    await reducer.changeState(transaction);

    const tx = getTransaction(transaction.id as string);

    if (![BridgeTxStatus.Done, BridgeTxStatus.Failed].includes(tx.status as BridgeTxStatus)) {
      await this.process(tx, reducer);
    }
  }
}

const appBridge = new Bridge({
  signEvm: {
    [Operation.EthBridgeIncoming]: (id: string) => store.dispatch.bridge.signEvmTransactionEvmToSora(id),
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEvmTransactionSoraToEvm(id),
  },
  signSora: {
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signSoraTransactionSoraToEvm(id),
  },
  updateHistory: () => store.commit.bridge.setHistory(),
  showNotification: (tx: BridgeHistory) => store.commit.bridge.setNotificationData(tx),
  getActiveHistoryItem: () => store.getters.bridge.historyItem,
  getBridgeHistoryInstance: () => store.dispatch.bridge.getBridgeHistoryInstance(),
});

export { bridgeApi, appBridge };
export * from './types';
export * from './utils';
export * from './history';
