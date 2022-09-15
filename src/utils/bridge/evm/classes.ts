import type { EvmHistory } from '@sora-substrate/util/build/evm/types';
import { EvmTxStatus } from '@sora-substrate/util/build/evm/consts';

import { evmBridgeApi } from '@/utils/bridge/evm/api';
import { BridgeTransactionStateHandler } from '@/utils/bridge/common/classes';

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
            this.updateTransactionParams(id, { transactionState: EvmTxStatus.Pending });

            const { txId, blockId, to, amount, assetAddress } = this.getTransaction(id);

            if (!amount) throw new Error(`[${this.constructor.name}]: Transaction "amount" cannot be empty`);
            if (!assetAddress)
              throw new Error(`[${this.constructor.name}]: Transaction "assetAddress" cannot be empty`);
            if (!to) throw new Error(`[${this.constructor.name}]: Transaction recipient "to" cannot be empty`);

            const asset = this.getAssetByAddress(assetAddress);

            if (!asset || !asset.externalAddress)
              throw new Error(`[${this.constructor.name}]: Transaction asset is not registered: ${assetAddress}`);

            // if transaction is not signed, submit extrinsic
            if (!txId) {
              await evmBridgeApi.burn(asset, to, amount, id);
            }

            // signed sora transaction has to be parsed by subquery
            if (!this.getTransaction(id).blockId) {
              // TODO [EVM] Add restoration from subquery if blockId is not exists
              console.info(`[${this.constructor.name}]: Implement blockId restoration`);
            }

            if (!this.getTransaction(id).hash) {
              const hash = await waitForSoraTransactionHash(id);

              this.updateTransactionParams(id, { hash });
            }

            // TODO [EVM] implement subscription
            console.info(`[${this.constructor.name}]: Implement subscription`);

            // TODO [EVM] check transaction state change issue
            this.onComplete(id);
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
}

export class EvmBridgeIncomingReducer extends BridgeTransactionStateHandler<EvmHistory> {}
