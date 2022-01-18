import { BridgeTxStatus, Operation } from '@sora-substrate/util';
import ethersUtil from '@/utils/ethers-util';

import store from '@/store';

import { bridgeApi } from './api';
import { STATES } from './types';
import {
  getTransaction,
  updateHistoryParams,
  waitForRequest,
  waitForApprovedRequest,
  waitForExtrinsicFinalization,
  waitForEvmTransaction,
} from './utils';

import type { BridgeHistory } from '@sora-substrate/util';
import type { HandleTransactionPayload, BridgeTransactionHandler } from './types';

class BridgeTransactionStateHandler {
  static async handleState(
    id: string,
    { status, nextState, rejectState, handler }: HandleTransactionPayload
  ): Promise<void> {
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

  static async updateTransactionParams(id: string, params = {}) {
    updateHistoryParams(id, params);

    await store.dispatch('bridge/getHistory');
  }

  static async onComplete(id: string): Promise<void> {
    await this.updateTransactionParams(id, { endTime: Date.now() });
  }

  static async updateTransactionStep(id: string): Promise<void> {
    await this.updateTransactionParams(id, { transactionStep: 2 });
  }

  static async onEvmPending(id: string): Promise<void> {
    await waitForEvmTransaction(id);

    const tx = getTransaction(id);
    const { effectiveGasPrice, gasUsed } = await ethersUtil.getEvmTransactionReceipt(tx.ethereumHash as string);
    const ethereumNetworkFee = ethersUtil.calcEvmFee(effectiveGasPrice.toNumber(), gasUsed.toNumber());

    await this.updateTransactionParams(id, { ethereumNetworkFee });
  }

  static async onEvmSubmitted(id: string, { signEvm }): Promise<void> {
    await this.updateTransactionParams(id, { transactionState: STATES.EVM_PENDING, signed: false });

    const tx = getTransaction(id);

    if (!tx.signed) {
      const { hash: ethereumHash, fee } = await signEvm(id);

      await this.updateTransactionParams(id, {
        ethereumHash,
        ethereumNetworkFee: fee ?? tx.ethereumNetworkFee,
        signed: true,
      });
    }
  }
}

class EthBridgeOutgoingStateReducer extends BridgeTransactionStateHandler {
  static async signEvm(id: string): Promise<void> {
    return await store.dispatch('bridge/signEvmTransactionSoraToEvm', id);
  }

  static async changeState(transaction: BridgeHistory): Promise<void> {
    if (!transaction.id) throw new Error('TX ID cannot be empty');

    switch (transaction.transactionState) {
      case STATES.INITIAL: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
        });
      }

      case STATES.SORA_SUBMITTED: {
        const handler = async (id: string) => {
          await this.updateTransactionParams(id, { transactionState: STATES.SORA_PENDING });

          const tx = getTransaction(id);

          if (!tx.signed) {
            const evmAccount = await ethersUtil.getAccount();

            if (!tx.amount) throw new Error('[Bridge]: TX amount cannot be empty');

            const asset = store.getters['assets/getAssetDataByAddress'](tx.assetAddress);

            if (!asset || !asset.externalAddress) throw new Error(`Asset not registered: ${tx.assetAddress}`);

            await bridgeApi.transferToEth(asset, evmAccount, tx.amount, tx.id);

            await this.updateTransactionParams(id, { signed: true });
          }
        };

        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_PENDING,
          rejectState: STATES.SORA_REJECTED,
          handler,
        });
      }

      case STATES.SORA_PENDING: {
        const handler = async (id: string) => {
          const tx = await waitForExtrinsicFinalization(id);

          await this.updateTransactionParams(id, tx);

          if (!tx.hash) throw new Error('[Bridge]: TX hash cannot be empty');

          const { to, hash } = await waitForApprovedRequest(tx.hash);

          await this.updateTransactionParams(id, { to, hash });
        };

        return await this.handleState(transaction.id, {
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler,
        });
      }

      case STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_SUBMITTED,
          rejectState: STATES.SORA_REJECTED,
          handler: this.updateTransactionStep,
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
          handler: (id) => this.onEvmSubmitted(id, { signEvm: this.signEvm }),
        });
      }

      case STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_COMMITED,
          rejectState: STATES.EVM_REJECTED,
          handler: this.onEvmPending,
        });
      }

      case STATES.EVM_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: STATES.EVM_COMMITED,
          rejectState: STATES.EVM_REJECTED,
          handler: this.onComplete,
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
  static async signEvm(id: string): Promise<void> {
    return await store.dispatch('bridge/signEvmTransactionEvmToSora', id);
  }

  static async changeState(transaction: BridgeHistory): Promise<void> {
    if (!transaction.id) throw new Error('TX ID cannot be empty');

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
          handler: (id) => this.onEvmSubmitted(id, { signEvm: this.signEvm }),
        });
      }

      case STATES.EVM_PENDING: {
        return await this.handleState(transaction.id, {
          nextState: STATES.EVM_COMMITED,
          rejectState: STATES.EVM_REJECTED,
          handler: this.onEvmPending,
        });
      }

      case STATES.EVM_COMMITED: {
        return await this.handleState(transaction.id, {
          nextState: STATES.SORA_SUBMITTED,
          rejectState: STATES.EVM_REJECTED,
          handler: this.updateTransactionStep,
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
        const handler = async (id: string) => {
          await this.updateTransactionParams(id, { transactionState: STATES.SORA_PENDING, signed: false });

          const tx = getTransaction(id);

          if (!tx.signed) {
            // TODO: check it for other types of bridge
            // const transferType = isXorAccountAsset(getters.asset) ? RequestType.TransferXOR : RequestType.Transfer
            // await bridgeApi.requestFromEth(ethereumHash, transferType)

            await this.updateTransactionParams(id, { signed: true });
          }
        };

        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Pending,
          nextState: STATES.SORA_PENDING,
          rejectState: STATES.SORA_REJECTED,
          handler,
        });
      }

      case STATES.SORA_PENDING: {
        const handler = async (id: string) => {
          const tx = getTransaction(id);

          if (!tx.ethereumHash) throw new Error('Hash cannot be empty!');

          await waitForRequest(tx.ethereumHash);
        };

        return await this.handleState(transaction.id, {
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler,
        });
      }

      case STATES.SORA_COMMITED: {
        return await this.handleState(transaction.id, {
          status: BridgeTxStatus.Done,
          nextState: STATES.SORA_COMMITED,
          rejectState: STATES.SORA_REJECTED,
          handler: this.onComplete,
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

class Bridge {
  static readonly TX_TYPE_REDUCERS = {
    [Operation.EthBridgeOutgoing]: EthBridgeOutgoingStateReducer,
    [Operation.EthBridgeIncoming]: EthBridgeIncomingStateReducer,
  };

  static async handleTransaction(id: string) {
    const transaction = getTransaction(id);

    const { type } = transaction;
    const reducer = this.TX_TYPE_REDUCERS[type];

    if (!reducer) throw new Error(`[Bridge]: Unsupported operation '${type}'`);

    const handler = reducer.changeState;

    await this.process(transaction, handler);
  }

  private static async process(transaction: BridgeHistory, handler: BridgeTransactionHandler) {
    await handler(transaction);

    const tx = getTransaction(transaction.id as string);

    if (![BridgeTxStatus.Done, BridgeTxStatus.Failed].includes(tx.status as BridgeTxStatus)) {
      await this.process(tx, handler);
    }
  }
}

export { bridgeApi, Bridge };
export * from './utils';
export * from './types';
