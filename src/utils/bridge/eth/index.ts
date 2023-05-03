import first from 'lodash/fp/first';
import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import { SUBQUERY_TYPES, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import { getEvmTransactionRecieptByHash } from '@/utils/bridge/utils';

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
import type { SignTxResult } from '@/store/bridge/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

const { ETH_BRIDGE_STATES } = WALLET_CONSTS;

type HandleTransactionPayload = {
  status?: BridgeTxStatus;
  nextState: WALLET_CONSTS.ETH_BRIDGE_STATES;
  rejectState: WALLET_CONSTS.ETH_BRIDGE_STATES;
  handler?: (id: string) => Promise<void>;
};

type SignedEvmTxResult = SignTxResult;

type AddAsset = (address: string) => Promise<void>;
type GetAssetByAddress = (address: string) => Nullable<RegisteredAccountAssetWithDecimals>;
type SignEvm = (id: string) => Promise<SignedEvmTxResult>;
type SignSora = (id: string) => Promise<void>;
type GetActiveHistoryItem = () => Nullable<BridgeHistory>;
type GetBridgeHistoryInstance = () => Promise<EthBridgeHistory>;
type GetTransaction = (id: string) => BridgeHistory;
type ShowNotification = (tx: BridgeHistory) => void;

interface Constructable<T> {
  new (...args: any): T;
}

type BridgeOperations =
  | Operation.EthBridgeOutgoing
  | Operation.EthBridgeIncoming
  | Operation.EvmOutgoing
  | Operation.EvmIncoming;

interface BridgeCommonOptions {
  addAsset: AddAsset;
  getAssetByAddress: GetAssetByAddress;
  getActiveHistoryItem: GetActiveHistoryItem;
  getBridgeHistoryInstance: GetBridgeHistoryInstance;
  getTransaction: GetTransaction;
  showNotification: ShowNotification;
  updateHistory: VoidFunction;
}

interface BridgeConstructorOptions<BridgeReducer, TransactionStatuses> extends BridgeCommonOptions {
  reducers: Partial<Record<BridgeOperations, Constructable<BridgeReducer>>>;
  signEvm: Partial<Record<BridgeOperations, SignEvm>>;
  signSora: Partial<Record<BridgeOperations, SignSora>>;
  stopOn: TransactionStatuses[];
}

interface BridgeReducerOptions extends BridgeCommonOptions {
  signEvm: SignEvm;
  signSora?: SignSora;
}

class BridgeTransactionStateHandler {
  protected readonly signEvm!: SignEvm;
  protected readonly signSora!: SignSora | undefined;
  protected readonly addAsset!: AddAsset;
  protected readonly getAssetByAddress!: GetAssetByAddress;
  protected readonly updateHistory!: FnWithoutArgs;
  protected readonly showNotification!: ShowNotification;
  protected readonly getActiveHistoryItem!: GetActiveHistoryItem;
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance;
  protected readonly getTransaction!: GetTransaction;

  constructor({
    signEvm,
    signSora,
    addAsset,
    getAssetByAddress,
    updateHistory,
    showNotification,
    getActiveHistoryItem,
    getBridgeHistoryInstance,
    getTransaction,
  }: BridgeReducerOptions) {
    this.signEvm = signEvm;
    this.signSora = signSora;
    this.addAsset = addAsset;
    this.getAssetByAddress = getAssetByAddress;
    this.updateHistory = updateHistory;
    this.showNotification = showNotification;
    this.getActiveHistoryItem = getActiveHistoryItem;
    this.getBridgeHistoryInstance = getBridgeHistoryInstance;
    this.getTransaction = getTransaction;
  }

  async changeState(tx: any): Promise<void> {
    console.info('changeState implementation is required!');
  }

  async handleState(id: string, { status, nextState, rejectState, handler }: HandleTransactionPayload): Promise<void> {
    try {
      const transaction = this.getTransaction(id);

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

      const transaction = this.getTransaction(id);
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
    const tx = this.getTransaction(id);
    const { type, assetAddress } = tx;
    if (type === Operation.EthBridgeIncoming && assetAddress) {
      if (!this.getAssetByAddress(assetAddress)) {
        // Add asset to account assets
        this.addAsset(assetAddress);
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

    const tx = this.getTransaction(id);
    const { evmNetworkFee, blockHeight } = (await getEvmTransactionRecieptByHash(tx.externalHash as string)) || {};

    if (!evmNetworkFee || !blockHeight) {
      this.updateTransactionParams(id, { externalHash: undefined, externalNetworkFee: undefined });
      throw new Error(`[Bridge]: Ethereum transaction not found, hash: ${tx.externalHash}. 'externalHash' is reset`);
    }

    // In BridgeHistory 'blockHeight' will store evm block number
    this.updateTransactionParams(id, { externalNetworkFee: evmNetworkFee, blockHeight });
  }

  async onEvmSubmitted(id: string): Promise<void> {
    this.updateTransactionParams(id, { transactionState: ETH_BRIDGE_STATES.EVM_PENDING });

    const tx = this.getTransaction(id);

    if (!tx.externalHash) {
      await this.beforeSubmit(id);

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

class EthBridgeOutgoingStateReducer extends BridgeTransactionStateHandler {
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
            await this.beforeSubmit(id);
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

class EthBridgeIncomingStateReducer extends BridgeTransactionStateHandler {
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

class Bridge<BridgeReducer extends BridgeTransactionStateHandler, TransactionStatuses> {
  protected reducers!: Partial<Record<BridgeOperations, BridgeReducer>>;
  protected readonly getTransaction!: GetTransaction;
  protected readonly stopOn!: TransactionStatuses[];

  constructor({
    reducers,
    signEvm,
    signSora,
    stopOn,
    getTransaction,
    ...rest
  }: BridgeConstructorOptions<BridgeReducer, TransactionStatuses>) {
    this.getTransaction = getTransaction;
    this.stopOn = stopOn;
    this.reducers = Object.entries(reducers).reduce((acc, [operation, Reducer]) => {
      acc[operation] = new Reducer({
        ...rest,
        getTransaction,
        signEvm: signEvm[operation],
        signSora: signSora[operation],
      });
      return acc;
    }, {});
  }

  async handleTransaction(id: string) {
    const transaction = this.getTransaction(id);
    const { type } = transaction;

    if (!(type in this.reducers)) {
      throw new Error(`[Bridge]: Unsupported operation '${type}'`);
    }

    const reducer = this.reducers[type];

    if (reducer) {
      await this.process(transaction, reducer);
    }
  }

  private async process(transaction: BridgeHistory, reducer: BridgeReducer) {
    await reducer.changeState(transaction);

    const tx = this.getTransaction(transaction.id as string);

    if (!this.stopOn.includes(tx.status as unknown as TransactionStatuses)) {
      await this.process(tx, reducer);
    }
  }
}

// const appBridge = new Bridge<EthBridgeIncomingStateReducer | EthBridgeOutgoingStateReducer, BridgeTxStatus>({
//   reducers: {
//     [Operation.EthBridgeIncoming]: EthBridgeIncomingStateReducer,
//     [Operation.EthBridgeOutgoing]: EthBridgeOutgoingStateReducer,
//   },
//   signEvm: {
//     [Operation.EthBridgeIncoming]: (id: string) => store.dispatch.bridge.signEvmTransactionEvmToSora(id),
//     [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEvmTransactionSoraToEvm(id),
//   },
//   signSora: {
//     [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signSoraTransactionSoraToEvm(id),
//   },
//   stopOn: [BridgeTxStatus.Done, BridgeTxStatus.Failed],
//   addAsset: (assetAddress: string) => store.dispatch.wallet.account.addAsset(assetAddress),
//   updateHistory: () => store.commit.bridge.setHistory(),
//   showNotification: (tx: BridgeHistory) => store.commit.bridge.setNotificationData(tx),
//   getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
//   getActiveHistoryItem: () => store.getters.bridge.historyItem,
//   getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
//   getTransaction,
// });

// export default appBridge;
