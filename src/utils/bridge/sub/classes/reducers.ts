import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';

import { subBridgeApi } from '@/utils/bridge/sub/api';
import { BridgeReducer } from '@/utils/bridge/common/classes';

import { delay } from '@/utils';
import { waitForSoraTransactionHash } from '@/utils/bridge/common/utils';

import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';

type SubBridgeReducerOptions<T extends SubHistory> = IBridgeReducerOptions<T> & {
  removeTransactionByHash: RemoveTransactionByHash<SubHistory>;
};

const { BLOCK_PRODUCE_TIME } = WALLET_CONSTS;

export class SubBridgeReducer extends BridgeReducer<SubHistory> {
  protected readonly removeTransactionByHash!: RemoveTransactionByHash<SubHistory>;

  constructor(options: SubBridgeReducerOptions<SubHistory>) {
    super(options);

    this.removeTransactionByHash = options.removeTransactionByHash;
  }
}

export class SubBridgeIncomingReducer extends SubBridgeReducer {
  async changeState(transaction: SubHistory): Promise<void> {
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

export class SubBridgeOutgoingReducer extends SubBridgeReducer {
  async changeState(transaction: SubHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);

    switch (transaction.transactionState) {
      case BridgeTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Done,
          rejectState: BridgeTxStatus.Failed,
          handler: async (id: string) => {
            const currentId = id;
            this.beforeSubmit(currentId);
            this.updateTransactionParams(currentId, { transactionState: BridgeTxStatus.Pending });
            await this.checkTxId(currentId);
            await this.waitForTxStatus(currentId);
            await this.checkTxBlockId(currentId);
            await this.checkTxSoraHash(currentId);
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
    const tx = this.getTransaction(id);

    if (!tx.txId) {
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

  private async waitForTxStatus(id: string): Promise<void> {
    const { status } = this.getTransaction(id);

    if (status) return Promise.resolve();

    await delay(1_000);
    await this.waitForTxStatus(id);
  }

  private async waitForSoraBlockId(id: string): Promise<void> {
    const { blockId } = this.getTransaction(id);

    if (blockId) return Promise.resolve();

    await delay(1_000);
    await this.waitForSoraBlockId(id);
  }

  private async checkTxSoraHash(id: string): Promise<string> {
    const hash = await waitForSoraTransactionHash({
      section: 'bridgeProxy',
      extrincicMethod: 'burn',
      eventMethod: 'RequestStatusUpdate',
    })(id, this.getTransaction);

    this.updateTransactionParams(id, { hash });

    return hash;
  }

  private async subscribeOnTxBySoraHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx) {
      throw new Error(`[${this.constructor.name}]: Transaction ${id} not found`);
    }

    const { from, externalNetwork, hash } = tx;

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
        const observable = subBridgeApi.subscribeOnTransactionDetails(from, externalNetwork, hash);

        if (!observable) throw new Error(`[${this.constructor.name}]: Unable to subscribe on transacton data`);

        subscription = observable.subscribe((data) => {
          if (!data) {
            return reject(new Error(`[${this.constructor.name}]: Unable to get transacton data by "hash": "${hash}"`));
          }

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
