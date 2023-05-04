import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import type { Subscription } from 'rxjs';

import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { BridgeReducer } from '@/utils/bridge/common/classes';

import { delay } from '@/utils';
import { waitForSoraTransactionHash } from '@/utils/bridge/evm/utils';

import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';

type EvmBridgeReducerOptions<T extends EvmHistory> = IBridgeReducerOptions<T> & {
  removeTransactionByHash: RemoveTransactionByHash<EvmHistory>;
};

export class EvmBridgeReducer extends BridgeReducer<EvmHistory> {
  protected readonly removeTransactionByHash!: RemoveTransactionByHash<EvmHistory>;

  constructor(options: EvmBridgeReducerOptions<EvmHistory>) {
    super(options);

    this.removeTransactionByHash = options.removeTransactionByHash;
  }
}

export class EvmBridgeIncomingReducer extends EvmBridgeReducer {
  async changeState(transaction: EvmHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);

    switch (transaction.transactionState) {
      case EvmTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: EvmTxStatus.Done,
          rejectState: EvmTxStatus.Failed,
          handler: async (id: string) => {
            throw new Error(`[${this.constructor.name}]: Not implemented yet :(`);
          },
        });
      }

      case EvmTxStatus.Failed: {
        return await this.handleState(transaction.id, {
          nextState: EvmTxStatus.Pending,
          rejectState: EvmTxStatus.Failed,
        });
      }
    }
  }
}

export class EvmBridgeOutgoingReducer extends EvmBridgeReducer {
  async changeState(transaction: EvmHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);

    switch (transaction.transactionState) {
      case EvmTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: EvmTxStatus.Done,
          rejectState: EvmTxStatus.Failed,
          handler: async (id: string) => {
            let currentId = id;
            try {
              this.beforeSubmit(currentId);
              await this.updateTransactionParams(currentId, { transactionState: EvmTxStatus.Pending });
              await this.checkTxId(currentId);
              await this.checkTxBlockId(currentId);

              currentId = await this.checkTxSoraHash(currentId);
              await this.subscribeOnTxBySoraHash(currentId);
              await this.onComplete(currentId);
            } finally {
              this.removeTransactionFromProgress(currentId);
            }
          },
        });
      }

      case EvmTxStatus.Failed: {
        return await this.handleState(transaction.id, {
          nextState: EvmTxStatus.Pending,
          rejectState: EvmTxStatus.Failed,
        });
      }
    }
  }

  private async checkTxId(id: string): Promise<void> {
    const { txId } = this.getTransaction(id);

    // transaction not signed
    if (!txId) {
      await this.signSora(id);
      // update history to change tx status in ui
      this.updateHistory();
    }
  }

  private async checkTxBlockId(id: string): Promise<void> {
    const { txId } = this.getTransaction(id);

    if (!txId) {
      throw new Error(`[${this.constructor.name}]: Transaction "id" is empty, first sign the transaction`);
    }

    try {
      await Promise.race([this.waitForSoraBlockId(id), new Promise((resolve, reject) => setTimeout(reject, 18000))]);
    } catch (error) {
      console.info(`[${this.constructor.name}]: Implement "blockId" restoration`);
    }
  }

  private async waitForSoraBlockId(id: string): Promise<void> {
    const { blockId } = this.getTransaction(id);

    if (blockId) return Promise.resolve();

    await delay(1000);
    await this.waitForSoraBlockId(id);
  }

  private async checkTxSoraHash(id: string): Promise<string> {
    const tx = this.getTransaction(id);

    if (tx.hash) return tx.hash;

    const hash = await waitForSoraTransactionHash(id);

    await this.updateTransactionParams(id, { hash });

    return hash;
  }

  private async subscribeOnTxBySoraHash(id: string): Promise<void> {
    const { hash, externalNetwork, from } = this.getTransaction(id);

    if (!from) {
      throw new Error(
        `[${this.constructor.name}]: Transaction "from" is empty, unable to subscribe on transacton data`
      );
    }

    if (!hash) {
      throw new Error(
        `[${this.constructor.name}]: Transaction "hash" is empty, unable to subscribe on transacton data`
      );
    }

    if (!externalNetwork) {
      throw new Error(`[${this.constructor.name}]: Transaction "externalNetwork": "${externalNetwork}" is not correct`);
    }

    let subscription!: Subscription;

    try {
      await new Promise<EvmTxStatus>((resolve, reject) => {
        subscription = evmBridgeApi.subscribeOnTxDetails(from, externalNetwork, hash).subscribe((data) => {
          if (!data) {
            return reject(new Error(`[${this.constructor.name}]: Unable to get transacton data by "hash": "${hash}"`));
          }

          this.removeTransactionByHash({ tx: { hash }, force: true });

          const status = data.status;

          switch (status) {
            case EvmTxStatus.Done:
            case EvmTxStatus.Failed: {
              resolve(status);
              break;
            }
          }
        });
      });
    } finally {
      subscription.unsubscribe();
    }
  }
}
