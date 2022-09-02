import first from 'lodash/fp/first';
import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import { SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';
import { ethers } from 'ethers';

import store from '@/store';
import { getEvmTransactionRecieptByHash } from '@/utils/bridge/utils';

import { ethBridgeApi } from '@/utils/bridge/eth/api';
import { ETH_BRIDGE_STATES } from '@/utils/bridge/eth/types';
import {
  getTransaction,
  waitForApprovedRequest,
  waitForIncomingRequest,
  waitForSoraTransactionHash,
  waitForEvmTransaction,
  updateHistoryParams,
} from '@/utils/bridge/eth/utils';

import type { BridgeHistory } from '@sora-substrate/util';
import type { EthBridgeHistory } from '@/utils/bridge/eth/history';
import type { SignTxResult } from '@/store/bridge/types';
import type { RegisteredAccountAssetWithDecimals } from '@/store/assets/types';

type HandleTransactionPayload = {
  status?: BridgeTxStatus;
  nextState: ETH_BRIDGE_STATES;
  rejectState: ETH_BRIDGE_STATES;
  handler?: (id: string) => Promise<void>;
};

type SignedEvmTxResult = SignTxResult;

type SignEvm = (id: string) => Promise<SignedEvmTxResult>;
type GetAssetByAddress = (address: string) => Nullable<RegisteredAccountAssetWithDecimals>;
type GetActiveHistoryItem = () => Nullable<BridgeHistory>;
type GetBridgeHistoryInstance = () => Promise<EthBridgeHistory>;
type ShowNotification = (tx: BridgeHistory) => void;

interface BridgeCommonOptions {
  updateHistory: VoidFunction;
  showNotification: ShowNotification;
  getAssetByAddress: GetAssetByAddress;
  getActiveHistoryItem: GetActiveHistoryItem;
  getBridgeHistoryInstance: GetBridgeHistoryInstance;
}

interface BridgeOptions extends BridgeCommonOptions {
  sign: {
    [Operation.EthBridgeOutgoing]: SignEvm;
    [Operation.EthBridgeIncoming]: SignEvm;
  };
}

interface BridgeReducerOptions extends BridgeCommonOptions {
  signEvm: SignEvm;
}

class BridgeTransactionStateHandler {
  protected readonly signEvm!: SignEvm;
  protected readonly updateHistory!: VoidFunction;
  protected readonly showNotification!: ShowNotification;
  protected readonly getAssetByAddress!: GetAssetByAddress;
  protected readonly getActiveHistoryItem!: GetActiveHistoryItem;
  protected readonly getBridgeHistoryInstance!: GetBridgeHistoryInstance;

  constructor({
    signEvm,
    updateHistory,
    showNotification,
    getAssetByAddress,
    getActiveHistoryItem,
    getBridgeHistoryInstance,
  }: BridgeReducerOptions) {
    this.signEvm = signEvm;
    this.updateHistory = updateHistory;
    this.showNotification = showNotification;
    this.getAssetByAddress = getAssetByAddress;
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
    const { evmNetworkFee, blockHeight } = (await getEvmTransactionRecieptByHash(tx.ethereumHash as string)) || {};

    if (!evmNetworkFee || !blockHeight) {
      this.updateTransactionParams(id, { ethereumHash: undefined, ethereumNetworkFee: undefined });
      throw new Error(`[Bridge]: Ethereum transaction not found, hash: ${tx.ethereumHash}. 'ethereumHash' is reset`);
    }

    // In BridgeHistory 'blockHeight' will store evm block number
    this.updateTransactionParams(id, { ethereumNetworkFee: evmNetworkFee, blockHeight });
  }

  async onEvmSubmitted(id: string): Promise<void> {
    this.updateTransactionParams(id, { transactionState: ETH_BRIDGE_STATES.EVM_PENDING });

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

            const { txId, blockId, to, amount, assetAddress } = getTransaction(id);

            if (!amount) throw new Error('[Bridge]: TX "amount" cannot be empty');
            if (!assetAddress) throw new Error('[Bridge]: TX "assetAddress" cannot be empty');
            if (!to) throw new Error('[Bridge]: TX "to" cannot be empty');

            const asset = this.getAssetByAddress(assetAddress);

            if (!asset || !asset.externalAddress)
              throw new Error(`[Bridge]: TX asset is not registered: ${assetAddress}`);

            // transaction not signed
            if (!txId) {
              await ethBridgeApi.transferToEth(asset, to, amount, id);
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

            const tx = getTransaction(id);

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
            const tx = getTransaction(id);
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

  constructor({ sign, ...rest }: BridgeOptions) {
    this.reducers = Object.entries(Bridge.OPERATION_REDUCERS).reduce((acc, [operation, Reducer]) => {
      if (!(operation in acc)) {
        const reducer = new Reducer({ ...rest, signEvm: sign[operation] });

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
  sign: {
    [Operation.EthBridgeIncoming]: (id: string) => store.dispatch.bridge.signEvmTransactionEvmToSora(id),
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch.bridge.signEvmTransactionSoraToEvm(id),
  },
  updateHistory: () => store.commit.bridge.setHistory(),
  showNotification: (tx: BridgeHistory) => store.commit.bridge.setNotificationData(tx),
  getAssetByAddress: (address: string) => store.getters.assets.assetDataByAddress(address),
  getActiveHistoryItem: () => store.getters.bridge.historyItem,
  getBridgeHistoryInstance: () => store.dispatch.bridge.getEthBridgeHistoryInstance(),
});

export default appBridge;
