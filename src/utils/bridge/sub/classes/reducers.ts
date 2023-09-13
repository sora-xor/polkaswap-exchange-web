import { FPNumber } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { combineLatest } from 'rxjs';

import { ZeroStringValue } from '@/consts';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import { getTransactionEvents } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { getMessageAcceptedNonces, isMessageDispatchedNonces, isAssetAddedToChannel } from '@/utils/bridge/sub/utils';

import type { ApiPromise, ApiRx } from '@polkadot/api';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';

export class SubBridgeReducer extends BridgeReducer<SubHistory> {
  protected asset!: RegisteredAccountAsset;
  protected connector!: SubNetworksConnector;

  initConnector(id: string): void {
    const { externalNetwork } = this.getTransaction(id);

    if (!externalNetwork) throw new Error(`[${this.constructor.name}]: Transaction "externalNetwork" is not defined`);

    this.connector = new SubNetworksConnector();
    this.connector.init(externalNetwork);
  }

  async closeConnector(): Promise<void> {
    await this.connector.stop();
  }

  async getHashesByBlockNumber(blockHeight: number, apiRx: ApiRx) {
    let blockId = '';

    if (Number.isFinite(blockHeight)) {
      let subscription!: Subscription;

      try {
        await new Promise<void>((resolve) => {
          subscription = api.system.getBlockHashObservable(blockHeight, apiRx).subscribe((hash) => {
            if (hash) {
              blockId = hash;
              resolve();
            }
          });
        });
      } finally {
        subscription.unsubscribe();
      }
    }

    return {
      blockHeight,
      blockId,
    };
  }

  getBridgeProxyHash(events: Array<any>, api: ApiPromise): string {
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
              this.initConnector(id);
              this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });

              await this.checkTxId(id);
              await Promise.all([this.updateTxIncomingData(id), this.waitForSoraParachainNonce(id)]);
              await this.waitForSoraInboundMessageNonce(id);
              await this.waitSoraBlockByHash(id);
              await this.onComplete(id);
            } finally {
              this.closeConnector();
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
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;

    this.asset = { ...asset };

    if (tx.txId) return;
    // transaction not signed
    await this.beforeSign(id);
    // open connections
    await this.connector.start();
    // sign transaction
    await this.connector.networkAdapter.transfer(asset, tx.to as string, tx.amount as string, id);
    // store sora parachain block number when tx was signed in external network
    const parachainStartBlock = (await this.connector.parachainAdapter.api.query.system.number()).toNumber();
    // update history to change tx status in ui
    this.updateTransactionParams(id, {
      payload: {
        parachainStartBlock,
      },
    });
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

  private async updateTxExternalData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    await this.connector.networkAdapter.connect();

    if (!tx.externalBlockHeight) {
      const externalBlockHeight = await api.system.getBlockNumber(
        tx.externalBlockId as string,
        this.connector.networkAdapter.api
      );

      this.updateTransactionParams(id, {
        externalBlockHeight, // parachain block number
      });
    }

    const blockHash = tx.externalBlockId as string;
    const transactionHash = tx.externalHash as string;
    const transactionEvents = await getTransactionEvents(blockHash, transactionHash, this.connector.networkAdapter.api);

    const feeEvent = transactionEvents.find((e) =>
      this.connector.networkAdapter.api.events.transactionPayment.TransactionFeePaid.is(e.event)
    );
    const xcmEvent = transactionEvents.find((e) =>
      this.connector.networkAdapter.api.events.xcmPallet.Attempted.is(e.event)
    );

    if (feeEvent) {
      const externalNetworkFee = feeEvent.event.data[1].toString();

      this.updateTransactionParams(id, { externalNetworkFee });
    }

    if (!xcmEvent?.event?.data?.[0]?.isComplete) {
      throw new Error(`[${this.constructor.name}]: Transaction is not completed`);
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

    const parachainStartBlock = tx.payload.parachainStartBlock as number;
    const sended = new FPNumber(tx.amount as string, this.asset.externalDecimals).toCodecString();
    const to = tx.to as string;

    let subscription!: Subscription;
    let messageNonce!: number;
    let batchNonce!: number;
    let recipientAmount!: number;
    let blockNumber!: number;

    try {
      await this.connector.parachainAdapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(this.connector.parachainAdapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(this.connector.parachainAdapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(
          ([eventsVec, blockHeight]) => {
            try {
              if (blockHeight > parachainStartBlock + 3) {
                throw new Error(
                  `[${this.constructor.name}]: Sora parachain should have received message from ${tx.externalNetwork}`
                );
              }

              const events = [...eventsVec.toArray()].reverse();
              const downwardMessagesProcessedEvent = events.find((e) =>
                this.connector.parachainAdapter.api.events.parachainSystem.DownwardMessagesProcessed.is(e.event)
              );

              if (!downwardMessagesProcessedEvent) return;

              const assetAddedToChannelEventIndex = events.findIndex((e) =>
                isAssetAddedToChannel(e, this.asset, to, sended, this.connector.parachainAdapter.api)
              );

              if (assetAddedToChannelEventIndex === -1) {
                throw new Error(`[${this.constructor.name}]: Unable to find "xcmApp.AssetAddedToChannel" event`);
              }

              recipientAmount = events[assetAddedToChannelEventIndex].event.data[0].asTransfer.amount.toString();
              blockNumber = blockHeight;
              [batchNonce, messageNonce] = getMessageAcceptedNonces(
                events.slice(assetAddedToChannelEventIndex),
                this.connector.parachainAdapter.api
              );

              resolve();
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } finally {
      subscription.unsubscribe();

      // run non blocking process promise
      this.getHashesByBlockNumber(blockNumber, this.connector.parachainAdapter.apiRx)
        .then(({ blockHeight, blockId }) =>
          this.updateTransactionParams(id, {
            parachainBlockHeight: blockHeight, // parachain block number
            parachainBlockId: blockId, // parachain block hash
          })
        )
        .finally(() => this.closeConnector());
    }

    const { payload: prevPayload } = this.getTransaction(id);

    const received = FPNumber.fromCodecValue(recipientAmount, this.asset.externalDecimals);
    const amount2 = received.toString();
    const payload = { ...prevPayload, messageNonce, batchNonce };

    this.updateTransactionParams(id, { amount2, payload });
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
      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(subBridgeApi.apiRx);

        subscription = eventsObservable.subscribe((eventsVec) => {
          try {
            const events = [...eventsVec.toArray()].reverse();
            const substrateDispatchEventIndex = events.findIndex((e) =>
              isMessageDispatchedNonces(tx.payload.batchNonce, tx.payload.messageNonce, e, subBridgeApi.api)
            );

            if (substrateDispatchEventIndex === -1) return;

            soraHash = this.getBridgeProxyHash(events.slice(substrateDispatchEventIndex), subBridgeApi.api);

            resolve();
          } catch (error) {
            reject(error);
          }
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

    const soraBlockHash = await api.system.getBlockHash(soraBlockNumber, subBridgeApi.api);

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
            try {
              this.beforeSubmit(id);
              this.initConnector(id);
              this.updateTransactionParams(id, { transactionState: BridgeTxStatus.Pending });

              await this.checkTxId(id);
              await this.waitForTransactionStatus(id);
              await this.waitForTransactionBlockId(id);
              await this.waitForSoraHashAndNonces(id);
              await this.waitForSoraParachainMessageHash(id);
              await this.waitForDestinationMessageHash(id);
              await this.onComplete(id);
            } finally {
              this.closeConnector();
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
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;

    this.asset = { ...asset };

    if (tx.txId) return;
    // transaction not signed
    await this.beforeSign(id);
    await subBridgeApi.transfer(asset, tx.to as string, tx.amount as string, tx.externalNetwork as SubNetwork, id);
    // update history to change tx status in ui
    this.updateHistory();
  }

  private async waitForSoraHashAndNonces(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash && Number.isFinite(tx.payload?.batchNonce) && Number.isFinite(tx.payload?.messageNonce)) return;

    const blockHash = tx.blockId as string;
    const transactionHash = tx.txId as string;
    const transactionEvents = await getTransactionEvents(blockHash, transactionHash, subBridgeApi.api);

    const hash = this.getBridgeProxyHash(transactionEvents, subBridgeApi.api);
    this.updateTransactionParams(id, { hash });

    const [batchNonce, messageNonce] = getMessageAcceptedNonces(transactionEvents, subBridgeApi.api);
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

    try {
      await this.connector.parachainAdapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(this.connector.parachainAdapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(this.connector.parachainAdapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(
          ([eventsVec, blockHeight]) => {
            try {
              const events = [...eventsVec.toArray()].reverse();
              const substrateDispatchEventIndex = events.findIndex((e) =>
                isMessageDispatchedNonces(
                  tx.payload.batchNonce,
                  tx.payload.messageNonce,
                  e,
                  this.connector.parachainAdapter.api
                )
              );

              if (substrateDispatchEventIndex === -1) return;

              blockNumber = blockHeight;

              const parachainSystemEvent = events
                .slice(substrateDispatchEventIndex)
                .find((e) => this.connector.parachainAdapter.api.events.parachainSystem.UpwardMessageSent.is(e.event));

              if (!parachainSystemEvent) {
                throw new Error(`[${this.constructor.name}]: Unable to find "parachainSystem.UpwardMessageSent" event`);
              }

              messageHash = parachainSystemEvent.event.data.messageHash.toString();

              resolve();
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } finally {
      subscription.unsubscribe();

      // run non blocking proccess promise
      this.getHashesByBlockNumber(blockNumber, this.connector.parachainAdapter.apiRx)
        .then(({ blockHeight, blockId }) =>
          this.updateTransactionParams(id, {
            parachainBlockHeight: blockHeight, // parachain block number
            parachainBlockId: blockId, // parachain block hash
          })
        )
        .finally(() => this.connector.parachainAdapter.stop());
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
    let amount!: string;

    try {
      await this.connector.networkAdapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(this.connector.networkAdapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(this.connector.networkAdapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(
          ([eventsVec, blockHeight]) => {
            try {
              const events = [...eventsVec.toArray()].reverse();
              const messageQueueProcessedEventIndex = events.findIndex(
                (e) =>
                  this.connector.networkAdapter.api.events.messageQueue.Processed.is(e.event) &&
                  e.event.data[0].toString() === messageHash
              );

              if (messageQueueProcessedEventIndex === -1) return;

              blockNumber = blockHeight;

              // Native token for network
              const balancesDepositEvent = events
                .slice(messageQueueProcessedEventIndex)
                .find(
                  (e) =>
                    this.connector.networkAdapter.api.events.balances.Deposit.is(e.event) &&
                    subBridgeApi.formatAddress(e.event.data.who.toString()) === tx.to
                );

              if (!balancesDepositEvent)
                throw new Error(`[${this.constructor.name}]: Unable to find "balances.Deposit" event`);

              amount = balancesDepositEvent.event.data.amount.toString();

              resolve();
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } finally {
      subscription.unsubscribe();

      // run blocking process promise
      await this.getHashesByBlockNumber(blockNumber, this.connector.networkAdapter.apiRx)
        .then(({ blockHeight, blockId }) =>
          this.updateTransactionParams(id, {
            externalBlockHeight: blockHeight, // parachain block number
            externalBlockId: blockId, // parachain block hash
          })
        )
        .finally(() => this.connector.networkAdapter.stop());
    }

    const received = FPNumber.fromCodecValue(amount, this.asset.externalDecimals);
    const amount2 = received.toString();

    this.updateTransactionParams(id, {
      amount2,
      externalNetworkFee: ZeroStringValue,
    });
  }
}
