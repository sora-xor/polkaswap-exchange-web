import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { combineLatest } from 'rxjs';

import { delay } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { waitForSoraTransactionHash } from '@/utils/bridge/common/utils';
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
            this.beforeSubmit(id);
            this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });
            await this.checkTxId(id);
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

  private async checkTxId(id: string): Promise<void> {
    const { txId } = this.getTransaction(id);
    // transaction not signed
    if (!txId) {
      await this.signExternal(id);
      // update history to change tx status in ui
      this.updateHistory();
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
            this.beforeSubmit(id);
            this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });
            await this.checkTxId(id);
            await this.waitForTxStatus(id);
            await this.checkTxBlockId(id);
            await this.checkTxSoraHash(id);
            const nonce = await this.checkTxSoraMessageNonce(id);
            const messageHash = await this.waitForCollatorMessage(id, nonce);
            await this.waitForDestinationMessage(id, messageHash);
            await this.onComplete(id);
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
    const tx = this.getTransaction(id);

    if (tx.payload?.messageNonce) return tx.payload.messageNonce;

    const eventData = await waitForSoraTransactionHash({
      section: 'bridgeProxy',
      method: 'burn',
      eventSection: 'substrateBridgeOutboundChannel',
      eventMethod: 'MessageAccepted',
    })(id, this.getTransaction);

    const messageNonce = eventData[1].toNumber();
    const payload = { ...tx.payload, messageNonce };

    this.updateTransactionParams(id, { payload });

    return messageNonce;
  }

  // [TODO] Remove nonce as arg after history fix in js-lib
  private async waitForCollatorMessage(id: string, nonce: number) {
    const collator = subConnector.getAdapterForNetwork(SubNetwork.Mainnet);

    await collator.connect();

    let subscription!: Subscription;
    let messageHash!: string;

    try {
      messageHash = await new Promise((resolve) => {
        const eventsObservable = collator.apiRx.query.system.events();

        subscription = eventsObservable.subscribe((events) => {
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

      const tx = this.getTransaction(id);
      const payload = { ...tx.payload, messageHash };

      this.updateTransactionParams(id, payload);
    } finally {
      subscription.unsubscribe();
    }

    await collator.stop();

    return messageHash;
  }

  private async waitForDestinationMessage(id: string, messageHash: string) {
    const tx = this.getTransaction(id);
    const network = tx.externalNetwork as SubNetwork;
    const adapter = subConnector.getAdapterForNetwork(network);

    if (!adapter.connected) {
      await adapter.connect();
    }

    let subscription!: Subscription;
    let blockNumber!: number;
    let extrinsicIndex!: number;

    try {
      await new Promise<void>((resolve, reject) => {
        const eventsObservable = adapter.apiRx.query.system.events();
        const blockNumberObservable = adapter.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockNum]) => {
          for (const ev of events) {
            if (ev.phase.isApplyExtrinsic && ev.event.section === 'ump' && ev.event.method === 'ExecutedUpward') {
              const eventMessageHash = ev.event.data[0].toString();

              if (eventMessageHash === messageHash) {
                blockNumber = blockNum.toNumber();
                extrinsicIndex = ev.phase.asApplyExtrinsic.toNumber();
                resolve();
              }
            }
          }
        });
      });

      const blockHash = await adapter.api.rpc.chain.getBlockHash(blockNumber);
      const blockData = await adapter.api.rpc.chain.getBlock(blockHash);
      const extrinsic = blockData.block.extrinsics.at(extrinsicIndex);
      const externalHash = extrinsic?.hash.toString() ?? '';

      this.updateTransactionParams(id, { externalHash, blockHeight: blockHash.toString() });
    } finally {
      subscription.unsubscribe();
    }

    if (subConnector.adapter !== adapter) {
      await adapter.stop();
    }
  }
}
