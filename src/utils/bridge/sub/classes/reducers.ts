import { FPNumber } from '@sora-substrate/util';
import { BridgeTxStatus } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { api } from '@soramitsu/soraneo-wallet-web';
import { combineLatest } from 'rxjs';

import { ZeroStringValue } from '@/consts';
import { conditionalAwait } from '@/utils';
import { BridgeReducer } from '@/utils/bridge/common/classes';
import { getTransactionEvents } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector, subBridgeConnector } from '@/utils/bridge/sub/classes/adapter';
import { SubTransferType } from '@/utils/bridge/sub/types';
import {
  getBridgeProxyHash,
  getDepositedBalance,
  getMessageAcceptedNonces,
  isMessageDispatchedNonces,
  isAssetAddedToChannel,
  determineTransferType,
  getReceivedAmount,
  getParachainSystemMessageHash,
} from '@/utils/bridge/sub/utils';

import type { ApiRx } from '@polkadot/api';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { Subscription } from 'rxjs';

export class SubBridgeReducer extends BridgeReducer<SubHistory> {
  protected asset!: RegisteredAccountAsset;
  protected connector!: SubNetworksConnector;
  protected transferType!: SubTransferType;

  initConnector(id: string): void {
    const { externalNetwork } = this.getTransaction(id);

    if (!externalNetwork) throw new Error(`[${this.constructor.name}]: Transaction "externalNetwork" is not defined`);

    this.transferType = determineTransferType(externalNetwork);

    this.connector = new SubNetworksConnector();
    this.connector.init(externalNetwork, subBridgeConnector);
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

  async saveParachainBlock(id: string): Promise<void> {
    // get current sora parachain block number
    const parachainStartBlock = (await this.connector.soraParachain.adapter.api.query.system.number()).toNumber();
    // update history data
    this.updateTransactionParams(id, {
      payload: {
        parachainStartBlock,
      },
    });
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
    await this.connector.network.adapter.transfer(asset, tx.to as string, tx.amount as string, id);
    // store sora parachain block number when tx was signed
    await this.saveParachainBlock(id);
  }

  private async updateTxSigningData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (!(tx.externalBlockId && tx.externalHash)) {
      this.updateTransactionParams(id, {
        externalHash: tx.txId, // network tx hash
        externalBlockId: tx.blockId, // network block hash
      });
    }
  }

  private async updateTxExternalData(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    await this.connector.network.adapter.connect();

    const blockHash = tx.externalBlockId as string;
    const transactionHash = tx.externalHash as string;
    const transactionEvents = await getTransactionEvents(
      blockHash,
      transactionHash,
      this.connector.network.adapter.api
    );

    const feeEvent = transactionEvents.find((e) =>
      this.connector.network.adapter.api.events.transactionPayment.TransactionFeePaid.is(e.event)
    );

    if (feeEvent) {
      const externalNetworkFee = feeEvent.event.data[1].toString();

      this.updateTransactionParams(id, { externalNetworkFee });
    }

    if (this.transferType !== SubTransferType.SoraParachain) {
      const xcmEvent = transactionEvents.find((e) =>
        this.connector.network.adapter.api.events.xcmPallet.Attempted.is(e.event)
      );

      if (!xcmEvent?.event?.data?.[0]?.isComplete) {
        throw new Error(`[${this.constructor.name}]: Transaction is not completed`);
      }
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
      await this.connector.soraParachain.adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(this.connector.soraParachain.adapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(this.connector.soraParachain.adapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(
          ([eventsVec, blockHeight]) => {
            try {
              if (blockHeight > parachainStartBlock + 3) {
                throw new Error(
                  `[${this.constructor.name}]: Sora parachain should have received message from ${tx.externalNetwork}`
                );
              }

              const events = [...eventsVec.toArray()].reverse();

              const assetAddedToChannelEventIndex = events.findIndex((e) =>
                isAssetAddedToChannel(e, this.asset, to, sended, this.connector.soraParachain.adapter.api)
              );

              if (assetAddedToChannelEventIndex === -1) {
                return;
              }

              recipientAmount = events[assetAddedToChannelEventIndex].event.data[0].asTransfer.amount.toString();
              blockNumber = blockHeight;
              [batchNonce, messageNonce] = getMessageAcceptedNonces(
                events.slice(assetAddedToChannelEventIndex),
                this.connector.soraParachain.adapter.api
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

      if (this.transferType !== SubTransferType.SoraParachain) {
        // run non blocking process promise
        this.getHashesByBlockNumber(blockNumber, this.connector.soraParachain.adapter.apiRx)
          .then(({ blockHeight, blockId }) =>
            this.updateTransactionParams(id, {
              parachainBlockHeight: blockHeight, // parachain block number
              parachainBlockId: blockId, // parachain block hash
            })
          )
          .finally(() => {
            this.closeConnector();
          });
      }
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

            soraHash = getBridgeProxyHash(events.slice(substrateDispatchEventIndex), subBridgeApi.api);

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
              await this.waitForRelaychainMessageHash(id);
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

  protected updateReceivedAmount(id: string, receivedAmount: string): void {
    const tx = this.getTransaction(id);
    const { amount, transferFee } = getReceivedAmount(tx.amount as string, receivedAmount, this.asset.externalDecimals);

    this.updateTransactionParams(id, {
      amount2: amount,
      externalNetworkFee: ZeroStringValue,
      externalTransferFee: transferFee,
    });
  }

  private async checkTxId(id: string): Promise<void> {
    const tx = this.getTransaction(id);
    const asset = this.getAssetByAddress(tx.assetAddress as string) as RegisteredAccountAsset;

    this.asset = { ...asset };

    if (tx.txId) return;
    // open connections
    await this.connector.start();
    // sign transaction
    await subBridgeApi.transfer(asset, tx.to as string, tx.amount as string, tx.externalNetwork as SubNetwork, id);
    // store sora parachain block number when tx was signed
    await this.saveParachainBlock(id);
  }

  private async waitForSoraHashAndNonces(id: string): Promise<void> {
    const tx = this.getTransaction(id);

    if (tx.hash && Number.isFinite(tx.payload?.batchNonce) && Number.isFinite(tx.payload?.messageNonce)) return;

    const blockHash = tx.blockId as string;
    const transactionHash = tx.txId as string;
    const transactionEvents = await getTransactionEvents(blockHash, transactionHash, subBridgeApi.api);

    const hash = getBridgeProxyHash(transactionEvents, subBridgeApi.api);
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
    let amount!: string;

    try {
      await this.connector.soraParachain.adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(this.connector.soraParachain.adapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(this.connector.soraParachain.adapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(
          ([eventsVec, blockHeight]) => {
            try {
              const events = [...eventsVec.toArray()].reverse();
              const substrateDispatchEventIndex = events.findIndex((e) =>
                isMessageDispatchedNonces(
                  tx.payload.batchNonce,
                  tx.payload.messageNonce,
                  e,
                  this.connector.soraParachain.adapter.api
                )
              );

              if (substrateDispatchEventIndex === -1) return;

              blockNumber = blockHeight;

              if (this.transferType === SubTransferType.SoraParachain) {
                amount = getDepositedBalance(
                  events.slice(substrateDispatchEventIndex),
                  tx.to as string,
                  this.connector.soraParachain.adapter.api
                );
              } else {
                messageHash = getParachainSystemMessageHash(
                  events.slice(substrateDispatchEventIndex),
                  this.connector.soraParachain.adapter.api
                );
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } finally {
      subscription.unsubscribe();

      const updateBlockData = () =>
        this.getHashesByBlockNumber(blockNumber, this.connector.soraParachain.adapter.apiRx)
          .then(({ blockHeight, blockId }) => {
            const [blockHeightAttr, blockIdAttr] =
              this.transferType === SubTransferType.SoraParachain
                ? ['externalBlockHeight', 'externalBlockId']
                : ['parachainBlockHeight', 'parachainBlockId'];

            this.updateTransactionParams(id, {
              [blockHeightAttr]: blockHeight,
              [blockIdAttr]: blockId,
            });
          })
          .finally(() => {
            this.connector.soraParachain.adapter.stop();
          });

      await conditionalAwait(updateBlockData, this.transferType === SubTransferType.SoraParachain);
    }

    if (this.transferType === SubTransferType.SoraParachain) {
      this.updateReceivedAmount(id, amount);
    } else {
      const payload = { ...tx.payload, messageHash };
      this.updateTransactionParams(id, { payload });
    }
  }

  private async waitForRelaychainMessageHash(id: string): Promise<void> {
    if (this.transferType === SubTransferType.SoraParachain) return;

    const tx = this.getTransaction(id);
    const messageHash = tx.payload.messageHash as string;

    if (!messageHash) throw new Error(`[${this.constructor.name}]: Transaction payload messageHash cannot be empty`);

    let subscription!: Subscription;
    let blockNumber!: number;
    let amount!: string;

    try {
      await this.connector.network.adapter.connect();

      await new Promise<void>((resolve, reject) => {
        const eventsObservable = api.system.getEventsObservable(this.connector.network.adapter.apiRx);
        const blockNumberObservable = api.system.getBlockNumberObservable(this.connector.network.adapter.apiRx);

        subscription = combineLatest([eventsObservable, blockNumberObservable]).subscribe(
          ([eventsVec, blockHeight]) => {
            try {
              const events = [...eventsVec.toArray()].reverse();
              const messageQueueProcessedEventIndex = events.findIndex(
                (e) =>
                  this.connector.network.adapter.api.events.messageQueue.Processed.is(e.event) &&
                  e.event.data[0].toString() === messageHash
              );

              if (messageQueueProcessedEventIndex === -1) return;

              blockNumber = blockHeight;
              amount = getDepositedBalance(
                events.slice(messageQueueProcessedEventIndex),
                tx.to as string,
                this.connector.network.adapter.api
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

      // run blocking process promise
      await this.getHashesByBlockNumber(blockNumber, this.connector.network.adapter.apiRx)
        .then(({ blockHeight, blockId }) =>
          this.updateTransactionParams(id, {
            externalBlockHeight: blockHeight, // parachain block number
            externalBlockId: blockId, // parachain block hash
          })
        )
        .finally(() => {
          this.connector.network.adapter.stop();
        });
    }

    this.updateReceivedAmount(id, amount);
  }
}
