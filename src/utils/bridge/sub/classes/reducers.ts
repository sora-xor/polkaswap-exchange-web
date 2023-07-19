import { FPNumber } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { combineLatest } from 'rxjs';

import { BridgeReducer } from '@/utils/bridge/common/classes';
import type { RemoveTransactionByHash, IBridgeReducerOptions } from '@/utils/bridge/common/types';
import { findEventInBlock, getBlockEvents } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';
import type { SubAdapter } from '@/utils/bridge/sub/classes/adapter';

import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';

type SubBridgeReducerOptions<T extends SubHistory> = IBridgeReducerOptions<T> & {
  removeTransactionByHash: RemoveTransactionByHash<SubHistory>;
};

export class SubBridgeReducer extends BridgeReducer<SubHistory> {
  protected readonly removeTransactionByHash!: RemoveTransactionByHash<SubHistory>;

  constructor(options: SubBridgeReducerOptions<SubHistory>) {
    super(options);

    this.removeTransactionByHash = options.removeTransactionByHash;
  }

  async getAssetExternalDecimals(externalNetwork: SubNetwork, soraAssetId: string): Promise<number> {
    const data = await subBridgeApi.api.query.substrateBridgeApp.sidechainPrecision(externalNetwork, soraAssetId);
    const decimals = data.unwrap().toNumber();

    return decimals;
  }

  async getHashesByBlockNumber(adapter: SubAdapter, blockHeight: number, extrinsicIndex?: number) {
    let txId = '';
    let blockId = '';

    if (Number.isFinite(blockHeight)) {
      let subscription!: Subscription;

      try {
        await new Promise<void>((resolve) => {
          subscription = adapter.apiRx.query.system.blockHash(blockHeight).subscribe((hash) => {
            if (!hash.isEmpty) {
              blockId = hash.toString();
              resolve();
            }
          });
        });
      } finally {
        subscription.unsubscribe();
      }

      if (Number.isFinite(extrinsicIndex)) {
        const blockData = await adapter.api.rpc.chain.getBlock(blockId);
        const extrinsic = blockData.block.extrinsics.at(extrinsicIndex as number);

        txId = extrinsic?.hash.toString() ?? '';
      }
    }

    return {
      blockHeight,
      blockId,
      txId,
    };
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

            await Promise.all([this.updateTxIncomingData(id), this.waitForSoraParachainNonce(id)]);

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

  private async updateTxExternalData(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const adapter = subConnector.getAdapterForNetwork(tx.externalNetwork as SubNetwork);

    try {
      await adapter.connect();

      const events = await getBlockEvents(adapter.api, tx.externalBlockId as string);

      const feeEvent = events.find((e) => adapter.api.events.transactionPayment.TransactionFeePaid.is(e.event));
      const xcmEvent = events.find((e) => adapter.api.events.xcmPallet.Attempted.is(e.event));

      if (feeEvent) {
        const externalNetworkFee = feeEvent.event.data[1].toString();

        this.updateTransactionParams(id, { externalNetworkFee });
      }

      if (!xcmEvent?.event?.data?.[0]?.isComplete) {
        throw new Error(`[${this.constructor.name}]: Transaction is not completed`);
      }
    } finally {
      subConnector.safeClose(adapter);
    }
  }

  private async updateTxSigningData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!(tx.externalBlockId && tx.externalBlockHeight && tx.externalHash)) {
      this.updateTransactionParams(id, {
        externalHash: tx.txId, // parachain tx hash
        externalBlockId: tx.blockId, // parachain block hash
        externalBlockHeight: tx.blockHeight, // parachain block number
      });
    }
  }

  private async updateTxIncomingData(id: string): Promise<void> {
    await this.waitForTransactionStatus(id);
    await this.waitForTransactionBlockId(id);
    await this.updateTxSigningData(id);
    await this.updateTxExternalData(id);
  }

  private async waitForSoraParachainNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.batchNonce) return;

    const soraParachain = subConnector.getAdapterForNetwork(SubNetwork.RococoSora);

    let subscription!: Subscription;
    let messageNonce!: number;
    let batchNonce!: number;
    let recipientAmount!: number;
    let blockNumber!: number;
    let extrinsicIndex!: number;

    try {
      await soraParachain.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = soraParachain.apiRx.query.system.events();
        const blockNumberObservable = soraParachain.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockHeight]) => {
          const downwardMessagesProcessedEvent = events.find((e) =>
            soraParachain.api.events.parachainSystem.DownwardMessagesProcessed.is(e.event)
          );

          if (!downwardMessagesProcessedEvent) return;

          blockNumber = blockHeight.toNumber();
          extrinsicIndex = downwardMessagesProcessedEvent.phase.asApplyExtrinsic.toNumber();

          const messageAcceptedEvent = events.find((e) =>
            soraParachain.api.events.substrateBridgeOutboundChannel.MessageAccepted.is(e.event)
          );

          if (!messageAcceptedEvent) {
            reject(
              new Error(
                `[${this.constructor.name}]: Unable to find "substrateBridgeOutboundChannel.MessageAccepted" event`
              )
            );
          }

          batchNonce = messageAcceptedEvent.event.data[1].toNumber();
          messageNonce = messageAcceptedEvent.event.data[2].toNumber();

          const assetAddedToChannelEvent = events.find((e) =>
            soraParachain.api.events.xcmApp.AssetAddedToChannel.is(e.event)
          );

          if (!assetAddedToChannelEvent) {
            reject(new Error(`[${this.constructor.name}]: Unable to find "xcmApp.AssetAddedToChannel" event`));
          }

          const { amount, recipient } = assetAddedToChannelEvent.event.data[0].asTransfer;
          const address = subBridgeApi.formatAddress(recipient.toString());

          if (address !== tx.to) return;

          recipientAmount = amount.toNumber();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();

      // run non blocking process promise
      this.getHashesByBlockNumber(soraParachain, blockNumber, extrinsicIndex)
        .then(({ blockHeight, blockId, txId }) => {
          this.updateTransactionParams(id, {
            parachainBlockHeight: blockHeight, // parachain block number
            parachainBlockId: blockId, // parachain block hash
            parachainHash: txId, // parachain tx hash
          });
        })
        .finally(() => subConnector.safeClose(soraParachain));
    }

    const { amount, assetAddress, externalNetwork, payload: prevPayload } = this.getTransaction(id);

    const decimals = await this.getAssetExternalDecimals(externalNetwork as SubNetwork, assetAddress as string);
    const sended = new FPNumber(amount as string, decimals);
    const received = FPNumber.fromCodecValue(recipientAmount, decimals);

    const amount2 = received.toString();
    const parachainNetworkFee = sended.sub(received).toCodecString();
    const payload = { ...prevPayload, messageNonce, batchNonce };

    this.updateTransactionParams(id, { amount2, parachainNetworkFee, payload });
  }

  private async waitForSoraInboundMessageNonce(id: string): Promise<void> {
    const { hash, payload: { batchNonce, messageNonce } = {} } = this.getTransaction(id);

    if (hash) return;

    if (!Number.isFinite(batchNonce))
      throw new Error(`[${this.constructor.name}]: Transaction batchNonce is incorrect`);

    if (!Number.isFinite(messageNonce))
      throw new Error(`[${this.constructor.name}]: Transaction messageNonce is incorrect`);

    let subscription!: Subscription;
    let soraHash!: string;

    try {
      await new Promise<void>((resolve, reject) => {
        const eventsObservable = subBridgeApi.apiRx.query.system.events();

        subscription = eventsObservable.subscribe((events) => {
          const substrateDispatchEvent = events.find((e) =>
            subBridgeApi.api.events.substrateDispatch.MessageDispatched.is(e.event)
          );

          if (!substrateDispatchEvent) return;

          const eventMessageNonce = substrateDispatchEvent.event.data[0].messageNonce.toNumber();
          const eventBatchNonce = substrateDispatchEvent.event.data[0].batchNonce.unwrap().toNumber();

          if (eventBatchNonce > batchNonce) {
            reject(new Error(`[${this.constructor.name}]: Unable to continue track transaction`));
          }

          if (eventBatchNonce !== batchNonce || eventMessageNonce !== messageNonce) return;

          const bridgeProxyEvent = events.find((e) =>
            subBridgeApi.api.events.bridgeProxy.RequestStatusUpdate.is(e.event)
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
            await this.waitForTransactionStatus(id);
            await this.waitForTransactionBlockId(id);
            await this.checkTxSoraHash(id);
            await this.waitForSoraOutboundNonce(id);
            await this.waitForSoraParachainMessageHash(id);
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

  private async waitForSoraOutboundNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.batchNonce) return;

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

  private async waitForSoraParachainMessageHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.messageHash) return;

    const batchNonce = tx.payload?.batchNonce;
    const messageNonce = tx.payload?.messageNonce;

    if (!Number.isFinite(batchNonce))
      throw new Error(`[${this.constructor.name}]: Transaction batchNonce is incorrect`);

    if (!Number.isFinite(messageNonce))
      throw new Error(`[${this.constructor.name}]: Transaction messageNonce is incorrect`);

    const soraParachain = subConnector.getAdapterForNetwork(SubNetwork.RococoSora);

    let subscription!: Subscription;
    let messageHash!: string;
    let blockNumber!: number;
    let extrinsicIndex!: number;

    try {
      await soraParachain.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = soraParachain.apiRx.query.system.events();
        const blockNumberObservable = soraParachain.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockHeight]) => {
          const substrateDispatchEvent = events.find((e) =>
            soraParachain.api.events.substrateDispatch.MessageDispatched.is(e.event)
          );

          if (!substrateDispatchEvent) return;

          const eventBatchNonce = substrateDispatchEvent.event.data[0].batchNonce.unwrap().toNumber();
          const eventMessageNonce = substrateDispatchEvent.event.data[0].messageNonce.toNumber();

          if (eventBatchNonce > batchNonce) {
            reject(
              new Error(
                `[${this.constructor.name}]: Unable to continue track transaction, parachain outbound channel batch nonce ${eventBatchNonce} is larger than tx batch nonce ${batchNonce}`
              )
            );
          }

          if (eventBatchNonce !== batchNonce || eventMessageNonce !== messageNonce) return;

          blockNumber = blockHeight.toNumber();
          extrinsicIndex = substrateDispatchEvent.phase.asApplyExtrinsic.toNumber();

          const parachainSystemEvent = events.find((e) =>
            soraParachain.api.events.parachainSystem.UpwardMessageSent.is(e.event)
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

      // run non blocking proccess promise
      this.getHashesByBlockNumber(soraParachain, blockNumber, extrinsicIndex)
        .then(({ blockHeight, blockId, txId }) => {
          this.updateTransactionParams(id, {
            parachainBlockHeight: blockHeight, // parachain block number
            parachainBlockId: blockId, // parachain block hash
            parachainHash: txId, // parachain tx hash
          });
        })
        .finally(() => subConnector.safeClose(soraParachain));
    }

    const payload = { ...tx.payload, messageHash };

    this.updateTransactionParams(id, { payload });
  }

  private async waitForDestinationMessageHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const messageHash = tx.payload.messageHash as string;

    if (!messageHash) throw new Error(`[${this.constructor.name}]: Transaction payload messageHash cannot be empty`);

    const adapter = subConnector.getAdapterForNetwork(tx.externalNetwork as SubNetwork);

    let subscription!: Subscription;
    let blockNumber!: number;
    let extrinsicIndex!: number;
    let amount!: string;

    try {
      await adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = adapter.apiRx.query.system.events();
        const blockNumberObservable = adapter.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockNum]) => {
          const umpExecutedUpwardEvent = events.find((e) => adapter.api.events.ump.ExecutedUpward.is(e.event));

          if (!umpExecutedUpwardEvent) return;

          const [hash, status] = umpExecutedUpwardEvent.event.data;

          if (hash.toString() !== messageHash) return;

          blockNumber = blockNum.toNumber();
          extrinsicIndex = umpExecutedUpwardEvent.phase.asApplyExtrinsic.toNumber();

          if (!status.isComplete) reject(new Error(`[${this.constructor.name}]: Transaction is incomplete`));

          // Native token for network
          const balancesDepositEvent = events.find(
            (e) =>
              adapter.api.events.balances.Deposit.is(e.event) &&
              subBridgeApi.formatAddress(e.event.data.who.toString()) === tx.to
          );

          if (!balancesDepositEvent)
            reject(new Error(`[${this.constructor.name}]: Unable to find "balances.Deposit" event`));

          amount = balancesDepositEvent.event.data.amount.toString();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();

      // run blocking process promise
      await this.getHashesByBlockNumber(adapter, blockNumber, extrinsicIndex)
        .then(({ blockHeight, blockId, txId }) => {
          this.updateTransactionParams(id, {
            externalBlockHeight: blockHeight, // parachain block number
            externalBlockId: blockId, // parachain block hash
            externalHash: txId, // parachain tx hash
          });
        })
        .finally(() => subConnector.safeClose(adapter));
    }

    const decimals = await this.getAssetExternalDecimals(tx.externalNetwork as SubNetwork, tx.assetAddress as string);
    const sended = new FPNumber(tx.amount as string, decimals);
    const received = FPNumber.fromCodecValue(amount, decimals);

    const amount2 = received.toString();
    const parachainNetworkFee = sended.sub(received).toCodecString();

    this.updateTransactionParams(id, {
      amount2,
      parachainNetworkFee,
    });
  }
}
