import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { combineLatest } from 'rxjs';

import { delay } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { waitForSoraTransactionHash } from '@/utils/bridge/common/utils';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';

import { subBridgeApi } from '../api';

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

  protected async waitForTxStatus(id: string): Promise<void> {
    const { status } = this.getTransaction(id);

    if (status) return Promise.resolve();

    await delay(1_000);
    await this.waitForTxStatus(id);
  }

  protected async waitForTxBlockId(id: string): Promise<void> {
    const { blockId } = this.getTransaction(id);

    if (blockId) return Promise.resolve();

    await delay(1_000);
    await this.waitForTxBlockId(id);
  }

  protected async checkTxBlockId(id: string): Promise<void> {
    const { txId } = this.getTransaction(id);

    if (!txId) {
      throw new Error(`[${this.constructor.name}]: Transaction "id" is empty, first sign the transaction`);
    }

    try {
      await Promise.race([
        this.waitForTxBlockId(id),
        new Promise((resolve, reject) => setTimeout(reject, BLOCK_PRODUCE_TIME * 3)),
      ]);
    } catch (error) {
      console.info(`[${this.constructor.name}]: Implement "blockId" restoration`);
    }
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

            const [nonce] = await Promise.all([this.waitForCollatorMessageNonce(id), this.updateTxIncomingData(id)]);

            await this.waitForSoraInboundMessageNonce(id, nonce);
            await this.waitSoraBlockByHash(id);
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
      await this.signExternal(id);
      // update history to change tx status in ui
      this.updateHistory();
    }
  }

  private async updateTxIncomingData(id: string): Promise<void> {
    await this.waitForTxStatus(id);
    await this.checkTxBlockId(id);

    const { txId, blockId } = this.getTransaction(id);

    this.updateTransactionParams(id, {
      externalHash: txId,
      blockHeight: blockId,
    });
  }

  private async waitForCollatorMessageNonce(id: string): Promise<number> {
    const collator = subConnector.getAdapterForNetwork(SubNetwork.Mainnet);

    let subscription!: Subscription;
    let messageNonce!: number;

    try {
      await collator.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = collator.apiRx.query.system.events();

        subscription = eventsObservable.subscribe((events) => {
          const messageAcceptedEvent = events.find(
            (e) =>
              e.phase.isApplyExtrinsic &&
              e.event.section === 'substrateBridgeOutboundChannel' &&
              e.event.method === 'MessageAccepted'
          );

          if (!messageAcceptedEvent) return;

          const assetAddedToChannelEvent = events.find(
            (e) => e.phase.isApplyExtrinsic && e.event.section === 'xcmApp' && e.event.method === 'AssetAddedToChannel'
          );

          if (!assetAddedToChannelEvent) {
            reject(new Error(`[${this.constructor.name}]: Unable to find "xcmApp.AssetAddedToChannel" event`));
          }

          console.log(assetAddedToChannelEvent.toJSON());

          // [TODO]: check assetAddedToChannelEvent data

          messageNonce = messageAcceptedEvent.event.data[1].toNumber();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();
    }

    await collator.stop();

    const tx = this.getTransaction(id);
    const payload = { ...tx.payload, messageNonce };

    this.updateTransactionParams(id, { payload });

    return messageNonce;
  }

  private async waitForSoraInboundMessageNonce(id: string, nonce: number): Promise<void> {
    let subscription!: Subscription;
    let soraHash!: string;

    try {
      await new Promise<void>((resolve, reject) => {
        const eventsObservable = subBridgeApi.apiRx.query.system.events();

        subscription = eventsObservable.subscribe((events) => {
          const substrateDispatchEvent = events.find(
            (e) =>
              e.phase.isApplyExtrinsic &&
              e.event.section === 'substrateDispatch' &&
              e.event.method === 'MessageDispatched'
          );

          if (!substrateDispatchEvent) return;

          const eventNonce = substrateDispatchEvent.event.data[0].messageNonce.toNumber();

          if (eventNonce > nonce) {
            reject(new Error(`[${this.constructor.name}]: Unable to continue track transaction`));
          }

          if (eventNonce !== nonce) return;

          const bridgeProxyEvent = events.find(
            (e) =>
              e.phase.isApplyExtrinsic && e.event.section === 'bridgeProxy' && e.event.method === 'RequestStatusUpdate'
          );

          if (!bridgeProxyEvent) {
            reject(new Error(`[${this.constructor.name}]: Unable to find "bridgeProxy.RequestStatusUpdate" event`));
          }

          soraHash = bridgeProxyEvent.event.data[0].toString();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();
    }

    this.updateTransactionParams(id, {
      hash: soraHash,
    });
  }

  private async waitSoraBlockByHash(id: string): Promise<void> {
    const { hash, to, externalNetwork } = this.getTransaction(id);

    if (!(hash && to && externalNetwork)) {
      throw new Error(`[${this.constructor.name}] Lost transaction params`);
    }

    let subscription!: Subscription;
    let soraBlockNumber!: number;

    try {
      await new Promise<void>((resolve) => {
        subscription = subBridgeApi.subscribeOnTransactionDetails(to, externalNetwork, hash).subscribe((data) => {
          if (data?.endBlock) {
            soraBlockNumber = data.endBlock;
            resolve();
          }
        });
      });
    } finally {
      subscription.unsubscribe();
    }

    const soraBlockHash = await subBridgeApi.api.rpc.chain.getBlockHash(soraBlockNumber);

    this.updateTransactionParams(id, {
      blockId: soraBlockHash,
    });
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
            const nonce = await this.waitForSoraOutboundMessageNonce(id);
            const messageHash = await this.waitForCollatorMessageHash(id, nonce);
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

  private async waitForSoraOutboundMessageNonce(id: string): Promise<number> {
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
  private async waitForCollatorMessageHash(id: string, nonce: number) {
    const collator = subConnector.getAdapterForNetwork(SubNetwork.Mainnet);

    let subscription!: Subscription;
    let messageHash!: string;

    try {
      await collator.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = collator.apiRx.query.system.events();

        subscription = eventsObservable.subscribe((events) => {
          const substrateDispatchEvent = events.find(
            (e) =>
              e.phase.isApplyExtrinsic &&
              e.event.section === 'substrateDispatch' &&
              e.event.method === 'MessageDispatched'
          );

          if (!substrateDispatchEvent) return;

          const eventNonce = substrateDispatchEvent.event.data[0].messageNonce.toNumber();

          if (eventNonce > nonce) {
            reject(
              new Error(
                `[${this.constructor.name}]: Unable to continue track transaction, collator outbound channel nonce ${eventNonce} is larger than tx nonce ${nonce}`
              )
            );
          }

          if (eventNonce !== nonce) return;

          const parachainSystemEvent = events.find(
            (e) =>
              e.phase.isApplyExtrinsic &&
              e.event.section === 'parachainSystem' &&
              e.event.method === 'UpwardMessageSent'
          );

          if (!parachainSystemEvent) {
            reject(new Error(`[${this.constructor.name}]: Unable to find "parachainSystem.UpwardMessageSent" event`));
          }

          messageHash = parachainSystemEvent.event.data.messageHash.toString();

          resolve();
        });
      });

      const tx = this.getTransaction(id);
      const payload = { ...tx.payload, messageHash };

      this.updateTransactionParams(id, { payload });
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

    let subscription!: Subscription;
    let blockNumber!: number;
    let extrinsicIndex!: number;

    try {
      if (!adapter.connected) {
        await adapter.connect();
      }

      await new Promise<void>((resolve) => {
        const eventsObservable = adapter.apiRx.query.system.events();
        const blockNumberObservable = adapter.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockNum]) => {
          const umpExecutedUpwardEvent = events.find(
            (e) => e.phase.isApplyExtrinsic && e.event.section === 'ump' && e.event.method === 'ExecutedUpward'
          );

          if (!umpExecutedUpwardEvent) return;

          const eventMessageHash = umpExecutedUpwardEvent.event.data[0].toString();

          if (eventMessageHash === messageHash) {
            blockNumber = blockNum.toNumber();
            extrinsicIndex = umpExecutedUpwardEvent.phase.asApplyExtrinsic.toNumber();
            resolve();
          }
        });
      });
    } finally {
      subscription.unsubscribe();
    }

    const blockHash = await adapter.api.rpc.chain.getBlockHash(blockNumber);
    const blockData = await adapter.api.rpc.chain.getBlock(blockHash);
    const extrinsic = blockData.block.extrinsics.at(extrinsicIndex);
    const externalHash = extrinsic?.hash.toString() ?? '';

    this.updateTransactionParams(id, { externalHash, blockHeight: blockHash.toString() });

    if (subConnector.adapter !== adapter) {
      await adapter.stop();
    }
  }
}
