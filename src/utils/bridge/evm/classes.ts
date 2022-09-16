import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';
import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import type { Subscription } from 'rxjs';

import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { BridgeTransactionStateHandler } from '@/utils/bridge/common/classes';

import { delay } from '@/utils';
import { waitForSoraTransactionHash } from '@/utils/bridge/evm/utils';

export class EvmBridgeOutgoingReducer extends BridgeTransactionStateHandler<EvmHistory> {
  async changeState(transaction: EvmHistory): Promise<void> {
    if (!transaction.id) throw new Error(`[${this.constructor.name}]: Transaction ID cannot be empty`);

    switch (transaction.transactionState) {
      case EvmTxStatus.Pending: {
        return await this.handleState(transaction.id, {
          nextState: EvmTxStatus.Done,
          rejectState: EvmTxStatus.Failed,
          handler: async (id: string) => {
            this.beforeSubmit(id);
            await this.updateTransactionParams(id, { transactionState: EvmTxStatus.Pending });
            await this.checkTxId(id);
            await this.checkTxBlockId(id);
            await this.checkTxSoraHash(id);
            await this.subscribeOnTxBySoraHash(id);
            await this.onComplete(id);
          },
        });
      }

      case EvmTxStatus.Done: {
        return await this.handleState(transaction.id, {
          nextState: EvmTxStatus.Done,
          rejectState: EvmTxStatus.Failed,
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
    const { txId, to, amount, assetAddress } = this.getTransaction(id);

    if (!amount) {
      throw new Error(`[${this.constructor.name}]: Transaction "amount" cannot be empty`);
    }
    if (!assetAddress) {
      throw new Error(`[${this.constructor.name}]: Transaction "assetAddress" cannot be empty`);
    }
    if (!to) {
      throw new Error(`[${this.constructor.name}]: Transaction recipient "to" cannot be empty`);
    }

    const asset = this.getAssetByAddress(assetAddress);

    if (!asset || !asset.externalAddress) {
      throw new Error(`[${this.constructor.name}]: Transaction asset is not registered: ${assetAddress}`);
    }

    // if transaction is not signed, submit extrinsic
    if (!txId) {
      await evmBridgeApi.burn(asset, to, amount, id);
    }
  }

  private async checkTxBlockId(id: string): Promise<void> {
    const { txId } = this.getTransaction(id);

    if (!txId) {
      throw new Error(`[${this.constructor.name}]: Transaction "id" is empty, first sign the transaction`);
    }

    try {
      await Promise.race([this.waitForSoraBlockId(id), new Promise((resolve, reject) => setTimeout(reject, 30000))]);
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

  private async checkTxSoraHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!tx.hash) {
      const hash = await waitForSoraTransactionHash(id);

      await this.updateTransactionParams(id, { hash });
    }
  }

  private async subscribeOnTxBySoraHash(id: string): Promise<void> {
    const { hash } = this.getTransaction(id);

    if (!hash) {
      throw new Error(
        `[${this.constructor.name}]: Transaction "hash" is empty, unable to subscribe on transacton data`
      );
    }

    let subscription!: Subscription;

    try {
      const transactionState = await new Promise<EvmTxStatus>((resolve, reject) => {
        subscription = evmBridgeApi.subscribeOnTxDetails(hash).subscribe((data) => {
          if (!data)
            reject(new Error(`[${this.constructor.name}]: Unable to get transacton data by "hash": "${hash}"`));

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

      await this.updateTransactionParams(id, { transactionState });
    } catch (error) {
      console.error(error);
    } finally {
      subscription.unsubscribe();
    }
  }
}

export class EvmBridgeIncomingReducer extends BridgeTransactionStateHandler<EvmHistory> {}
