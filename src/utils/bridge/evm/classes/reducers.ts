import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { delay } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { waitForSoraTransactionHash } from '@/utils/bridge/common/utils';
import { evmBridgeApi } from '@/utils/bridge/evm/api';

import type { EvmHistory } from '@sora-substrate/util/build/bridgeProxy/evm/types';
import type { Subscription } from 'rxjs';

type EvmBridgeReducerOptions<T extends EvmHistory> = IBridgeReducerOptions<T> & {
  removeTransactionByHash: RemoveTransactionByHash<EvmHistory>;
};

const { BLOCK_PRODUCE_TIME } = WALLET_CONSTS;

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
      case BridgeTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Done,
          rejectState: BridgeTxStatus.Failed,
          handler: async (id: string) => {
            throw new Error(`[${this.constructor.name}]: Not implemented yet :(`);
          },
        });
      }

      case BridgeTxStatus.Failed: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Pending,
          rejectState: BridgeTxStatus.Failed,
        });
      }
    }
  }
}

export class EvmBridgeOutgoingReducer extends EvmBridgeReducer {
  async changeState(transaction: EvmHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);

    switch (transaction.transactionState) {
      case BridgeTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Done,
          rejectState: BridgeTxStatus.Failed,
          handler: async (id: string) => {
            let currentId = id;
            this.beforeSubmit(currentId);
            this.updateTransactionParams(currentId, { transactionState: BridgeTxStatus.Pending });
            await this.checkTxId(currentId);
            await this.checkTxBlockId(currentId);

            currentId = await this.checkTxSoraHash(currentId);
            await this.subscribeOnTxBySoraHash(currentId);
            await this.onComplete(currentId);
          },
        });
      }

      case BridgeTxStatus.Failed: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Pending,
          rejectState: BridgeTxStatus.Failed,
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
      await Promise.race([
        this.waitForSoraBlockId(id),
        new Promise((resolve, reject) => setTimeout(reject, BLOCK_PRODUCE_TIME * 3)),
      ]);
    } catch (error) {
      console.info(`[${this.constructor.name}]: Implement "blockId" restoration`);
    }
  }

  private async waitForSoraBlockId(id: string): Promise<void> {
    const { blockId } = this.getTransaction(id);

    if (blockId) return Promise.resolve();

    await delay(1_000);
    await this.waitForSoraBlockId(id);
  }

  private async checkTxSoraHash(id: string): Promise<string> {
    const tx = this.getTransaction(id);

    if (tx.hash) return tx.hash;

    const eventData = await waitForSoraTransactionHash({
      section: 'bridgeProxy',
      method: 'burn',
      eventMethod: 'RequestStatusUpdate',
    })(id, this.getTransaction);

    const hash = eventData[0].toString();

    this.updateTransactionParams(id, { hash });

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
      await new Promise<BridgeTxStatus>((resolve, reject) => {
        const observable = evmBridgeApi.subscribeOnTransactionDetails(from, externalNetwork, hash);

        if (!observable) throw new Error(`[${this.constructor.name}]: Unable to subscribe on transacton data`);

        subscription = observable.subscribe((data) => {
          if (!data) {
            return reject(new Error(`[${this.constructor.name}]: Unable to get transacton data by "hash": "${hash}"`));
          }

          this.removeTransactionByHash({ tx: { hash }, force: true });

          const status = data.status;

          switch (status) {
            case BridgeTxStatus.Done:
            case BridgeTxStatus.Failed: {
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
