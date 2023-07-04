import { FPNumber } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import { combineLatest } from 'rxjs';

import { delay } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { findEventInBlock } from '@/utils/bridge/common/utils';
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
            await Promise.all([this.waitForCollatorMessageNonce(id), this.updateTxIncomingData(id)]);
            await this.waitForSoraInboundMessageNonce(id);
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

    if (txId) return;
    // transaction not signed
    await this.signExternal(id);
    // update history to change tx status in ui
    this.updateHistory();
  }

  private async updateExternalNetworkFee(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const network = tx.externalNetwork as SubNetwork;
    const blockId = tx.externalBlockId as string;
    const adapter = subConnector.getAdapterForNetwork(network);

    if (!adapter.connected) {
      await adapter.connect();
    }

    const eventData = await findEventInBlock({
      api: adapter.api,
      blockId,
      section: 'transactionPayment',
      method: 'TransactionFeePaid',
    });

    const decimals = adapter.api.registry.chainDecimals[0];

    if (subConnector.adapter !== adapter) {
      await adapter.stop();
    }

    // decimals hardcoded
    const txFee = FPNumber.fromCodecValue(eventData[1].toString(), decimals);
    const existingFee = FPNumber.fromCodecValue(tx.externalNetworkFee ?? '0', decimals);
    const externalNetworkFee = txFee.add(existingFee).toCodecString();

    this.updateTransactionParams(id, { externalNetworkFee });
  }

  private async updateTxIncomingData(id: string): Promise<void> {
    await this.waitForTxStatus(id);
    await this.checkTxBlockId(id);

    const { txId, blockId } = this.getTransaction(id);

    this.updateTransactionParams(id, {
      externalHash: txId, // parachain tx hash
      externalBlockId: blockId, // parachain block hash
    });

    await this.updateExternalNetworkFee(id);
  }

  private async waitForCollatorMessageNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.messageNonce) return;

    const collator = subConnector.getAdapterForNetwork(SubNetwork.RococoSora);

    let subscription!: Subscription;
    let messageNonce!: number;
    let batchNonce!: number;
    let recipientAmount!: number;

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

          const { amount, recipient } = assetAddedToChannelEvent.event.data[0].asTransfer;
          const address = subBridgeApi.formatAddress(recipient.toString());

          if (address !== tx.to) return;

          // [TODO]: check assetAddedToChannelEvent data

          batchNonce = messageAcceptedEvent.event.data[1].toNumber();
          messageNonce = messageAcceptedEvent.event.data[2].toNumber();
          recipientAmount = amount.toNumber();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();
    }

    await collator.stop();

    const decimals = (
      await subBridgeApi.api.query.substrateBridgeApp.sidechainPrecision(tx.externalNetwork, tx.assetAddress)
    )
      .unwrap()
      .toNumber();

    const { amount, externalNetworkFee: prevFee, payload: prevPayload } = this.getTransaction(id);

    const fpAmount = new FPNumber(amount as string);
    const fpAmount2 = FPNumber.fromCodecValue(recipientAmount, decimals);
    const xcmFee = fpAmount.sub(fpAmount2);

    const amount2 = fpAmount2.toString();
    const externalNetworkFee = FPNumber.fromCodecValue(prevFee as string, decimals)
      .add(xcmFee)
      .toCodecString();
    const payload = { ...prevPayload, messageNonce, batchNonce };

    this.updateTransactionParams(id, { amount2, externalNetworkFee, payload });
  }

  private async waitForSoraInboundMessageNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash) return;

    const batchNonce = tx.payload.batchNonce;
    const messageNonce = tx.payload.messageNonce;

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

          const eventMessageNonce = substrateDispatchEvent.event.data[0].messageNonce.toNumber();
          const eventBatchNonce = substrateDispatchEvent.event.data[0].batchNonce.unwrap().toNumber();

          if (eventBatchNonce > batchNonce) {
            reject(new Error(`[${this.constructor.name}]: Unable to continue track transaction`));
          }

          if (eventBatchNonce !== batchNonce || eventMessageNonce !== messageNonce) return;

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
      blockHeight: soraBlockNumber,
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
            await this.waitForSoraOutboundMessageNonce(id);
            await this.waitForCollatorMessageHash(id);
            await this.waitForDestinationMessageHash(id);
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

  private async checkTxSoraHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash) return;

    const eventData = await findEventInBlock({
      api: subBridgeApi.api,
      blockId: tx.blockId as string,
      section: 'bridgeProxy',
      method: 'RequestStatusUpdate',
    });

    const hash = eventData[0].toString();

    this.updateTransactionParams(id, { hash });
  }

  private async waitForSoraOutboundMessageNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.messageNonce) return;

    const eventData = await findEventInBlock({
      api: subBridgeApi.api,
      blockId: tx.blockId as string,
      section: 'substrateBridgeOutboundChannel',
      method: 'MessageAccepted',
    });

    const batchNonce = eventData[1].toNumber();
    const messageNonce = eventData[2].toNumber();
    const payload = { ...tx.payload, batchNonce, messageNonce };

    this.updateTransactionParams(id, { payload });
  }

  private async waitForCollatorMessageHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.messageHash) return;

    const batchNonce = tx.payload.batchNonce;
    const messageNonce = tx.payload.messageNonce;

    const collator = subConnector.getAdapterForNetwork(SubNetwork.RococoSora);

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

          const eventBatchNonce = substrateDispatchEvent.event.data[0].batchNonce.unwrap().toNumber();
          const eventMessageNonce = substrateDispatchEvent.event.data[0].messageNonce.toNumber();

          if (eventBatchNonce > batchNonce) {
            reject(
              new Error(
                `[${this.constructor.name}]: Unable to continue track transaction, collator outbound channel batch nonce ${eventBatchNonce} is larger than tx batch nonce ${batchNonce}`
              )
            );
          }

          if (eventBatchNonce !== batchNonce || eventMessageNonce !== messageNonce) return;

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
    } finally {
      subscription.unsubscribe();
    }

    await collator.stop();

    const payload = { ...tx.payload, messageHash };

    this.updateTransactionParams(id, { payload });
  }

  private async waitForDestinationMessageHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const messageHash = tx.payload.messageHash;
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

    this.updateTransactionParams(id, {
      externalHash, // parachain tx hash
      externalBlockId: blockHash.toString(), // parachain block hash
      externalBlockHeight: blockNumber, // parachain block number
    });

    if (subConnector.adapter !== adapter) {
      await adapter.stop();
    }
  }
}
