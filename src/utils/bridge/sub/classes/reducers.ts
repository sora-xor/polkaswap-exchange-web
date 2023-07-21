import { FPNumber } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { combineLatest } from 'rxjs';

import { BridgeReducer } from '@/utils/bridge/common/classes';
import { getBlockEvents } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';
import type { SubAdapter } from '@/utils/bridge/sub/classes/adapter';

import type { ApiPromise } from '@polkadot/api';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';

export class SubBridgeReducer extends BridgeReducer<SubHistory> {
  protected subNetworkAdapter!: SubAdapter;
  protected soraParachainAdapter!: SubAdapter;

  createConnections(id: string): void {
    const { externalNetwork } = this.getTransaction(id);

    if (!externalNetwork) throw new Error(`[${this.constructor.name}]: Transaction "externalNetwork" is not defined`);

    const soraParachainNetwork = subBridgeApi.getSoraParachain(externalNetwork);

    this.subNetworkAdapter = subConnector.getAdapterForNetwork(externalNetwork);
    this.soraParachainAdapter = subConnector.getAdapterForNetwork(soraParachainNetwork);
  }

  async closeConnections(): Promise<void> {
    await Promise.all([this.subNetworkAdapter?.stop(), this.soraParachainAdapter?.stop()]);
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

  isTransactionNonces(tx: SubHistory, substrateDispatchEvent: any): boolean {
    if (!substrateDispatchEvent) return false;

    const { batchNonce, messageNonce } = substrateDispatchEvent.event.data[0];

    const eventBatchNonce = batchNonce.unwrap().toNumber();
    const eventMessageNonce = messageNonce.toNumber();

    if (eventBatchNonce > tx.payload.batchNonce) {
      throw new Error(
        `[${this.constructor.name}]: Unable to continue track transaction, parachain channel batch nonce ${eventBatchNonce} is larger than tx batch nonce ${tx.payload.batchNonce}`
      );
    }

    return tx.payload?.batchNonce === eventBatchNonce && tx.payload?.messageNonce === eventMessageNonce;
  }

  getMessageAcceptedNonces(api: ApiPromise, events: Array<any>): [number, number] {
    const messageAcceptedEvent = events.find((e) =>
      api.events.substrateBridgeOutboundChannel.MessageAccepted.is(e.event)
    );

    if (!messageAcceptedEvent) {
      throw new Error(
        `[${this.constructor.name}]: Unable to find "substrateBridgeOutboundChannel.MessageAccepted" event`
      );
    }

    const batchNonce = messageAcceptedEvent.event.data[1].toNumber();
    const messageNonce = messageAcceptedEvent.event.data[2].toNumber();

    return [batchNonce, messageNonce];
  }

  getBridgeProxyHash(api: ApiPromise, events: Array<any>): string {
    const bridgeProxyEvent = events.find((e) => api.events.bridgeProxy.RequestStatusUpdate.is(e.event));

    if (!bridgeProxyEvent) {
      throw new Error(`[${this.constructor.name}]: Unable to find "bridgeProxy.RequestStatusUpdate" event`);
    }

    return bridgeProxyEvent.event.data[0].toString();
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
            try {
              this.beforeSubmit(id);
              this.createConnections(id);
              this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });

              await this.checkTxId(id);
              await Promise.all([this.updateTxIncomingData(id), this.waitForSoraParachainNonce(id)]);
              await this.waitForSoraInboundMessageNonce(id);
              await this.waitSoraBlockByHash(id);
              await this.onComplete(id);
            } finally {
              this.closeConnections();
            }
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
    const tx = this.getTransaction(id);

    if (tx.txId) return;
    // transaction not signed
    await this.beforeSign(id);
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;
    await this.subNetworkAdapter.connect();
    await this.subNetworkAdapter.transfer(asset, tx.to as string, tx.amount as string, id);
    // update history to change tx status in ui
    this.updateHistory();
  }

  private async updateTxExternalData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    await this.subNetworkAdapter.connect();

    if (!tx.externalBlockHeight) {
      const api = await this.subNetworkAdapter.api.at(tx.externalBlockId as string);
      const externalBlockHeight = (await api.query.system.number()).toNumber();

      this.updateTransactionParams(id, {
        externalBlockHeight, // parachain block number
      });
    }

    const events = await getBlockEvents(this.subNetworkAdapter.api, tx.externalBlockId as string);

    const feeEvent = events.find((e) =>
      this.subNetworkAdapter.api.events.transactionPayment.TransactionFeePaid.is(e.event)
    );
    const xcmEvent = events.find((e) => this.subNetworkAdapter.api.events.xcmPallet.Attempted.is(e.event));

    if (feeEvent) {
      const externalNetworkFee = feeEvent.event.data[1].toString();

      this.updateTransactionParams(id, { externalNetworkFee });
    }

    if (!xcmEvent?.event?.data?.[0]?.isComplete) {
      throw new Error(`[${this.constructor.name}]: Transaction is not completed`);
    }
  }

  private async updateTxSigningData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!(tx.externalBlockId && tx.externalHash)) {
      this.updateTransactionParams(id, {
        externalHash: tx.txId, // parachain tx hash
        externalBlockId: tx.blockId, // parachain block hash
      });
    }
  }

  private async updateTxIncomingData(id: string): Promise<void> {
    await this.waitForTransactionStatus(id);
    await this.waitForTransactionBlockId(id);
    await this.updateTxSigningData(id);
    await this.updateTxExternalData(id);
    await this.subNetworkAdapter.stop();
  }

  private async waitForSoraParachainNonce(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.batchNonce) return;

    let subscription!: Subscription;
    let messageNonce!: number;
    let batchNonce!: number;
    let recipientAmount!: number;
    let blockNumber!: number;
    let extrinsicIndex!: number;

    try {
      await this.soraParachainAdapter.connect();

      await new Promise<void>((resolve) => {
        const eventsObservable = this.soraParachainAdapter.apiRx.query.system.events();
        const blockNumberObservable = this.soraParachainAdapter.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockHeight]) => {
          const downwardMessagesProcessedEvent = events.find((e) =>
            this.soraParachainAdapter.api.events.parachainSystem.DownwardMessagesProcessed.is(e.event)
          );

          if (!downwardMessagesProcessedEvent) return;

          blockNumber = blockHeight.toNumber();
          extrinsicIndex = downwardMessagesProcessedEvent.phase.asApplyExtrinsic.toNumber();

          [batchNonce, messageNonce] = this.getMessageAcceptedNonces(this.soraParachainAdapter.api, events);

          const assetAddedToChannelEvent = events.find((e) =>
            this.soraParachainAdapter.api.events.xcmApp.AssetAddedToChannel.is(e.event)
          );

          if (!assetAddedToChannelEvent) {
            throw new Error(`[${this.constructor.name}]: Unable to find "xcmApp.AssetAddedToChannel" event`);
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
      this.getHashesByBlockNumber(this.soraParachainAdapter, blockNumber, extrinsicIndex)
        .then(({ blockHeight, blockId, txId }) =>
          this.updateTransactionParams(id, {
            parachainBlockHeight: blockHeight, // parachain block number
            parachainBlockId: blockId, // parachain block hash
            parachainHash: txId, // parachain tx hash
          })
        )
        .finally(() => this.soraParachainAdapter.stop());
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
    const tx = this.getTransaction(id);

    if (tx.hash) return;

    if (!Number.isFinite(tx.payload?.batchNonce))
      throw new Error(`[${this.constructor.name}]: Transaction batchNonce is incorrect`);

    if (!Number.isFinite(tx.payload?.messageNonce))
      throw new Error(`[${this.constructor.name}]: Transaction messageNonce is incorrect`);

    let subscription!: Subscription;
    let soraHash!: string;

    try {
      await new Promise<void>((resolve) => {
        const eventsObservable = subBridgeApi.apiRx.query.system.events();

        subscription = eventsObservable.subscribe((events) => {
          const substrateDispatchEvent = events.find((e) =>
            subBridgeApi.api.events.substrateDispatch.MessageDispatched.is(e.event)
          );

          if (!this.isTransactionNonces(tx, substrateDispatchEvent)) return;

          soraHash = this.getBridgeProxyHash(subBridgeApi.api, events);

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
            this.createConnections(id);
            this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });

            await this.checkTxId(id);
            await this.waitForTransactionStatus(id);
            await this.waitForTransactionBlockId(id);
            await this.waitForSoraHashAndNonces(id);
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
    const tx = this.getTransaction(id);

    if (tx.txId) return;
    // transaction not signed
    await this.beforeSign(id);
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;
    await subBridgeApi.transfer(asset, tx.to as string, tx.amount as string, tx.externalNetwork as SubNetwork, id);
    // update history to change tx status in ui
    this.updateHistory();
  }

  private async waitForSoraHashAndNonces(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash && Number.isFinite(tx.payload?.batchNonce) && Number.isFinite(tx.payload?.messageNonce)) return;

    const events = await getBlockEvents(subBridgeApi.api, tx.blockId as string);

    const hash = this.getBridgeProxyHash(subBridgeApi.api, events);
    this.updateTransactionParams(id, { hash });

    const [batchNonce, messageNonce] = this.getMessageAcceptedNonces(subBridgeApi.api, events);
    const payload = { ...tx.payload, batchNonce, messageNonce };
    this.updateTransactionParams(id, { payload });
  }

  private async waitForSoraParachainMessageHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.payload?.messageHash) return;

    if (!Number.isFinite(tx.payload?.batchNonce))
      throw new Error(`[${this.constructor.name}]: Transaction batchNonce is incorrect`);

    if (!Number.isFinite(tx.payload?.messageNonce))
      throw new Error(`[${this.constructor.name}]: Transaction messageNonce is incorrect`);

    let subscription!: Subscription;
    let messageHash!: string;
    let blockNumber!: number;
    let extrinsicIndex!: number;

    try {
      await this.soraParachainAdapter.connect();

      await new Promise<void>((resolve) => {
        const eventsObservable = this.soraParachainAdapter.apiRx.query.system.events();
        const blockNumberObservable = this.soraParachainAdapter.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockHeight]) => {
          const substrateDispatchEvent = events.find((e) =>
            this.soraParachainAdapter.api.events.substrateDispatch.MessageDispatched.is(e.event)
          );

          if (!this.isTransactionNonces(tx, substrateDispatchEvent)) return;

          blockNumber = blockHeight.toNumber();
          extrinsicIndex = substrateDispatchEvent.phase.asApplyExtrinsic.toNumber();

          const parachainSystemEvent = events.find((e) =>
            this.soraParachainAdapter.api.events.parachainSystem.UpwardMessageSent.is(e.event)
          );

          if (!parachainSystemEvent) {
            throw new Error(`[${this.constructor.name}]: Unable to find "parachainSystem.UpwardMessageSent" event`);
          }

          messageHash = parachainSystemEvent.event.data.messageHash.toString();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();

      // run non blocking proccess promise
      this.getHashesByBlockNumber(this.soraParachainAdapter, blockNumber, extrinsicIndex)
        .then(({ blockHeight, blockId, txId }) =>
          this.updateTransactionParams(id, {
            parachainBlockHeight: blockHeight, // parachain block number
            parachainBlockId: blockId, // parachain block hash
            parachainHash: txId, // parachain tx hash
          })
        )
        .finally(() => this.soraParachainAdapter.stop());
    }

    const payload = { ...tx.payload, messageHash };

    this.updateTransactionParams(id, { payload });
  }

  private async waitForDestinationMessageHash(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const messageHash = tx.payload.messageHash as string;

    if (!messageHash) throw new Error(`[${this.constructor.name}]: Transaction payload messageHash cannot be empty`);

    let subscription!: Subscription;
    let blockNumber!: number;
    let extrinsicIndex!: number;
    let amount!: string;

    try {
      await this.subNetworkAdapter.connect();

      await new Promise<void>((resolve) => {
        const eventsObservable = this.subNetworkAdapter.apiRx.query.system.events();
        const blockNumberObservable = this.subNetworkAdapter.apiRx.query.system.number();

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(([events, blockNum]) => {
          const umpExecutedUpwardEvent = events.find((e) =>
            this.subNetworkAdapter.api.events.ump.ExecutedUpward.is(e.event)
          );

          if (!umpExecutedUpwardEvent) return;

          const [hash, status] = umpExecutedUpwardEvent.event.data;

          if (hash.toString() !== messageHash) return;

          blockNumber = blockNum.toNumber();
          extrinsicIndex = umpExecutedUpwardEvent.phase.asApplyExtrinsic.toNumber();

          if (!status.isComplete) throw new Error(`[${this.constructor.name}]: Transaction is incomplete`);

          // Native token for network
          const balancesDepositEvent = events.find(
            (e) =>
              this.subNetworkAdapter.api.events.balances.Deposit.is(e.event) &&
              subBridgeApi.formatAddress(e.event.data.who.toString()) === tx.to
          );

          if (!balancesDepositEvent)
            throw new Error(`[${this.constructor.name}]: Unable to find "balances.Deposit" event`);

          amount = balancesDepositEvent.event.data.amount.toString();

          resolve();
        });
      });
    } finally {
      subscription.unsubscribe();

      // run blocking process promise
      await this.getHashesByBlockNumber(this.subNetworkAdapter, blockNumber, extrinsicIndex)
        .then(({ blockHeight, blockId, txId }) =>
          this.updateTransactionParams(id, {
            externalBlockHeight: blockHeight, // parachain block number
            externalBlockId: blockId, // parachain block hash
            externalHash: txId, // parachain tx hash
          })
        )
        .finally(() => this.subNetworkAdapter.stop());
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
