import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import ethersUtil from '@/utils/ethers-util';

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

import type { BridgeHistory, RegisteredAsset } from '@sora-substrate/util';
import type { HandleTransactionPayload } from './types';

type SignedEvmTxResult = {
  hash: string;
  fee?: string;
};

type SignEvm = (id: string) => Promise<SignedEvmTxResult>;
type GetAssetByAddress = (address: string) => RegisteredAsset;
type GetActiveHistoryItem = () => Nullable<BridgeHistory>;

interface BridgeCommonOptions {
  updateHistory: AsyncVoidFn;
  getAssetByAddress: GetAssetByAddress;
  getActiveHistoryItem: GetActiveHistoryItem;
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
  protected readonly updateHistory!: AsyncVoidFn;
  protected readonly getAssetByAddress!: GetAssetByAddress;
  protected readonly getActiveHistoryItem!: GetActiveHistoryItem;

  constructor({ signEvm, updateHistory, getAssetByAddress, getActiveHistoryItem }: BridgeReducerOptions) {
    this.signEvm = signEvm;
    this.updateHistory = updateHistory;
    this.getAssetByAddress = getAssetByAddress;
    this.getActiveHistoryItem = getActiveHistoryItem;
  }

  async handleState(id: string, { status, nextState, rejectState, handler }: HandleTransactionPayload): Promise<void> {
    try {
      const transaction = getTransaction(id);

      if (transaction.status === BridgeTxStatus.Done) return;
      if (status && transaction.status !== status) {
        await this.updateTransactionParams(id, { status });
      }

      if (typeof handler === 'function') {
        await handler(id);
      }

      await this.updateTransactionParams(id, { transactionState: nextState });
    } catch (error) {
      console.error(error);

      const transaction = getTransaction(id);
      const failed = transaction.status === BridgeTxStatus.Failed;

      await this.updateTransactionParams(id, {
        status: BridgeTxStatus.Failed,
        transactionState: rejectState,
        endTime: failed ? transaction.endTime : Date.now(),
      });
    }
  }

  async updateTransactionParams(id: string, params = {}): Promise<void> {
    updateHistoryParams(id, params);

    await this.updateHistory();
  }

  async onComplete(id: string): Promise<void> {
    await this.updateTransactionParams(id, { endTime: Date.now() });
  }

  async updateTransactionStep(id: string): Promise<void> {
    await this.updateTransactionParams(id, { transactionStep: 2 });
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
      await this.updateTransactionParams(id, { ethereumHash: undefined, ethereumNetworkFee: undefined });
      throw new Error(`[Bridge]: Ethereum transaction not found, hash: ${tx.ethereumHash}. 'ethereumHash' is reset`);
    }

    // In BridgeHistory 'blockHeight' will store evm block number
    await this.updateTransactionParams(id, { ethereumNetworkFee, blockHeight });
  }

  async onEvmSubmitted(id: string): Promise<void> {
    await this.updateTransactionParams(id, { transactionState: STATES.EVM_PENDING });

    const tx = getTransaction(id);

    if (!tx.ethereumHash) {
      await this.beforeSubmit(id);

      const { hash: ethereumHash, fee } = await this.signEvm(id);

      await this.updateTransactionParams(id, {
        ethereumHash,
        ethereumNetworkFee: fee ?? tx.ethereumNetworkFee,
      });
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
            await this.updateTransactionParams(id, { transactionState: STATES.SORA_PENDING });

            const { blockId, to, amount, assetAddress } = getTransaction(id);

            if (!amount) throw new Error('[Bridge]: TX "amount" cannot be empty');
            if (!assetAddress) throw new Error('[Bridge]: TX "assetAddress" cannot be empty');
            if (!to) throw new Error('[Bridge]: TX "to" cannot be empty');

            const asset = this.getAssetByAddress(assetAddress);

            if (!asset || !asset.externalAddress)
              throw new Error(`[Bridge]: TX asset is not registered: ${assetAddress}`);

            // signed sora transaction has to be in block chain
            if (!blockId) {
              await bridgeApi.transferToEth(asset, to, amount, id);
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

            await this.updateTransactionParams(id, { hash });

            const tx = getTransaction(id);

            const { to } = await waitForApprovedRequest(tx);

            await this.updateTransactionParams(id, { to });
          },
        });
      }

      case STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => await this.updateTransactionStep(id),
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
          handler: async (id: string) => await this.onComplete(id),
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
          handler: async (id: string) => await this.updateTransactionStep(id),
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
            await this.updateTransactionParams(id, { hash, blockId });
          },
        });
      }

      case STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler: async (id: string) => await this.onComplete(id),
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
    [Operation.EthBridgeIncoming]: (id: string) => store.dispatch('bridge/signEvmTransactionEvmToSora', id),
    [Operation.EthBridgeOutgoing]: (id: string) => store.dispatch('bridge/signEvmTransactionSoraToEvm', id),
  },
  updateHistory: () => store.dispatch('bridge/getHistory'),
  getAssetByAddress: (address: string) => store.getters['assets/getAssetDataByAddress'](address),
  getActiveHistoryItem: () => store.getters['bridge/historyItem'],
});

export { bridgeApi, appBridge };
export * from './types';
export * from './utils';
