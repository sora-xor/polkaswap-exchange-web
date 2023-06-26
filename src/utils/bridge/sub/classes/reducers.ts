import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';

import { delay } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { waitForSoraTransactionHash } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';

import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';

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
          handler: async (id) => {
            throw new Error(`[${this.constructor.name}]: Not implemented yet :(`);
          },
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
            const nonce = await this.checkTxSoraMessageNonce(currentId);
            await this.waitForCollatorMessage(id, nonce);
            // await this.subscribeOnTxBySoraHash(currentId);
            await this.onComplete(currentId);
            return currentId;
          },
        });
      }

      case BridgeTxStatus.Failed: {
        return await this.handleState(transaction.id, {
          nextState: BridgeTxStatus.Pending,
          rejectState: BridgeTxStatus.Failed,
          handler: async (id) => {
            throw new Error(`[${this.constructor.name}]: Not implemented yet :(`);
          },
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

  private async checkTxSoraMessageNonce(id: string): Promise<number> {
    const eventData = await waitForSoraTransactionHash({
      section: 'bridgeProxy',
      method: 'burn',
      eventSection: 'substrateBridgeOutboundChannel',
      eventMethod: 'MessageAccepted',
    })(id, this.getTransaction);

    const tx = this.getTransaction(id);
    const messageNonce = eventData[1].toNumber();
    const payload = { ...tx.payload, messageNonce };

    this.updateTransactionParams(id, { payload });

    return messageNonce;
  }

  private async waitForCollatorMessage(id: string, nonce: number) {
    const collator = subConnector.getAdapterForNetwork(SubNetwork.Mainnet);

    await collator.connect();

    let subscription!: Subscription;

    try {
      const messageHash = await new Promise((resolve, reject) => {
        const observable = collator.apiRx.query.system.events();

        subscription = observable.subscribe((events) => {
          let messageHash = '';
          let messageNonce = 0;

          events.forEach((ev) => {
            if (ev.phase.isApplyExtrinsic) {
              if (ev.event.section === 'substrateDispatch' && ev.event.method === 'MessageDispatched') {
                messageNonce = ev.event.data[0].messageNonce.toNumber();
              }
              if (ev.event.section === 'parachainSystem' && ev.event.method === 'UpwardMessageSent') {
                messageHash = ev.event.data.messageHash.toString();
              }
            }
          });

          if (messageNonce === nonce) {
            resolve(messageHash);
          }
        });
      });

      this.updateTransactionParams(id, { externalHash: messageHash });
    } finally {
      subscription.unsubscribe();
    }

    await collator.stop();
  }

  private async subscribeOnTxBySoraHash(id: string): Promise<void> {
    const { from, externalNetwork, hash } = this.getTransaction(id);

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
