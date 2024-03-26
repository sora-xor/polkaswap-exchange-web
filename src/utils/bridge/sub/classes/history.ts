import { FPNumber, Operation } from '@sora-substrate/util';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { api } from '@soramitsu/soraneo-wallet-web';

import { ZeroStringValue } from '@/consts';
import { rootActionContext } from '@/store';
import { getBlockEventsByTxIndex } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector, subBridgeConnector } from '@/utils/bridge/sub/classes/adapter';
import {
  getDepositedBalance,
  getMessageAcceptedNonces,
  getMessageDispatchedNonces,
  isMessageDispatchedNonces,
  formatSubAddress,
  getReceivedAmount,
} from '@/utils/bridge/sub/utils';

import type { ApiPromise } from '@polkadot/api';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { BridgeTransactionData } from '@sora-substrate/util/build/bridgeProxy/types';
import type { ActionContext } from 'vuex';

const hasFinishedState = (item: Nullable<SubHistory>) => {
  if (!item) return false;

  return [BridgeTxStatus.Done, BridgeTxStatus.Failed].includes(item.transactionState as BridgeTxStatus);
};

const getType = (isOutgoing: boolean) => {
  return isOutgoing ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
};

const getBlockHeights = (isOutgoing: boolean, tx: BridgeTransactionData) => {
  return isOutgoing ? [tx.startBlock, tx.endBlock] : [tx.endBlock, tx.startBlock];
};

const getTxEvents = (blockEvents: any[], txIndex: number) => {
  return blockEvents.filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === txIndex);
};

const findTxInBlock = async (blockHash: string, soraHash: string) => {
  const blockEvents = await api.system.getBlockEvents(blockHash);

  const event = blockEvents.find(
    ({ event }) => api.api.events.bridgeProxy.RequestStatusUpdate.is(event) && event.data?.[0]?.toString() === soraHash
  );

  if (!event) throw new Error('Unable to find "bridgeProxy.RequestStatusUpdate" event');

  const txIndex = event.phase.asApplyExtrinsic.toNumber();
  const txEvents = getTxEvents(blockEvents, txIndex);
  const extrinsics = await api.system.getExtrinsicsFromBlock(blockHash);
  const tx = extrinsics[txIndex];
  const txHash = tx.hash.toString();

  return { hash: txHash, events: txEvents };
};

class SubBridgeHistory extends SubNetworksConnector {
  get soraApi(): ApiPromise {
    return subBridgeApi.api;
  }

  get parachainApi(): ApiPromise | undefined {
    return this.soraParachain?.api;
  }

  get externalApi(): ApiPromise {
    return this.network.api;
  }

  public async clearHistory(
    network: SubNetwork,
    inProgressIds: Record<string, boolean>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    // don't remove history, what in progress and from another network
    const ids = Object.entries(subBridgeApi.history).reduce<string[]>((acc, [id, item]) => {
      if (!(id in inProgressIds) && (item as SubHistory).externalNetwork === network) {
        acc.push(id);
      }
      return acc;
    }, []);
    subBridgeApi.removeHistory(...ids);
    await updateCallback?.();
  }

  public async updateAccountHistory(
    address: string,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    try {
      const transactions = await subBridgeApi.getUserTransactions(address, this.network.subNetwork);

      if (!transactions.length) return;

      const currentHistory = subBridgeApi.historyList as SubHistory[];

      for (const tx of transactions) {
        const id = tx.soraHash;
        const localHistoryItem = currentHistory.find((item) => item.hash === id);

        // don't restore transaction what is in process in app
        if ((localHistoryItem?.id as string) in inProgressIds) continue;
        if (hasFinishedState(localHistoryItem)) continue;

        await this.start();

        const historyItemData = await this.txDataToHistory(tx, assetDataByAddress);

        if (!historyItemData) continue;

        // update or create local history item
        if (localHistoryItem) {
          subBridgeApi.saveHistory({ ...localHistoryItem, ...historyItemData } as SubHistory);
        } else {
          subBridgeApi.generateHistoryItem(historyItemData);
        }

        await updateCallback?.();
      }
    } finally {
      this.stop();
    }
  }

  private async txDataToHistory(
    tx: BridgeTransactionData,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>
  ): Promise<Nullable<SubHistory>> {
    const id = tx.soraHash;
    try {
      const isOutgoing = tx.direction === BridgeTxDirection.Outgoing;
      const [blockHeight, externalBlockHeight] = getBlockHeights(isOutgoing, tx);

      if (!externalBlockHeight) {
        console.info(`[${id}] External network block number is: ${externalBlockHeight}, skip;`);
        return null;
      }

      const asset = assetDataByAddress(tx.soraAssetAddress);
      const amount = FPNumber.fromCodecValue(tx.amount, asset?.decimals).toString();
      const type = getType(isOutgoing);

      const history: SubHistory = {
        id,
        blockHeight,
        type,
        hash: id,
        transactionState: tx.status,
        externalBlockHeight,
        externalNetwork: this.network.subNetwork,
        externalNetworkType: BridgeNetworkType.Sub,
        amount,
        assetAddress: asset?.address,
        symbol: asset?.symbol,
        from: tx.soraAccount,
        to: tx.externalAccount,
        soraNetworkFee: ZeroStringValue, // overrides in Outgoing
        externalNetworkFee: ZeroStringValue, // overrides in Incoming
      };

      const networkApi = this.getIntermediateApi(history);

      const [blockId, externalBlockId] = await Promise.all([
        api.system.getBlockHash(blockHeight, this.soraApi),
        api.system.getBlockHash(externalBlockHeight, networkApi),
      ]);

      history.blockId = blockId;
      history.externalBlockId = externalBlockId;

      const [{ hash, events: soraEvents }, startTime] = await Promise.all([
        findTxInBlock(blockId, id),
        api.system.getBlockTimestamp(blockId, this.soraApi),
      ]);

      history.txId = hash;
      history.startTime = history.endTime = startTime;

      if (isOutgoing) {
        return await this.processOutgoingTxExternalData({
          history,
          asset,
          soraEvents,
        });
      } else {
        return await this.processIncomingTxExternalData({ history, soraEvents });
      }
    } catch (error) {
      console.error(`[${id}]`, error);
      return null;
    }
  }

  private getIntermediateApi(history: SubHistory): ApiPromise {
    if (!history.externalNetwork) throw new Error(`[${history.txId}] externalNetwork is not defined`);

    if (subBridgeApi.isStandalone(history.externalNetwork)) return this.externalApi;

    if (!this.parachainApi) throw new Error(`[${history.txId}] Parachain Api is not exists`);

    return this.parachainApi;
  }

  private async processOutgoingTxExternalData({
    history,
    asset,
    soraEvents,
  }: {
    history: SubHistory;
    asset: Nullable<RegisteredAccountAsset>;
    soraEvents: any[];
  }): Promise<SubHistory> {
    // update SORA network fee
    const soraFeeEvent = soraEvents.find((e) => this.soraApi.events.transactionPayment.TransactionFeePaid.is(e.event));
    history.soraNetworkFee = soraFeeEvent.event.data[1].toString();
    // sended from SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageAcceptedNonces(soraEvents, this.soraApi);
    // api for Standalone network or SORA parachain
    const networkApi = this.getIntermediateApi(history);
    const networkBlockId = history.externalBlockId as string;
    // Network block events
    const networkEvents = await api.system.getBlockEvents(networkBlockId, networkApi);
    const networkEventsReversed = [...networkEvents].reverse();
    // Network received nonces
    const messageDispatchedIndex = networkEventsReversed.findIndex((e) =>
      isMessageDispatchedNonces(soraBatchNonce, soraMessageNonce, e, networkApi)
    );

    if (messageDispatchedIndex === -1) {
      throw new Error(`[${history.id}] Message sent from SORA to network is not found in block "${networkBlockId}"`);
    }

    if (history.externalNetwork === SubNetworkId.Liberland) {
      return await this.processOutgoingToLiberland(history);
    }

    // SORA Parachain extrinsic events for next search
    const parachainExtrinsicEvents = networkEventsReversed.slice(messageDispatchedIndex);
    // sended from SORA Parachain to Relaychain message hash
    const outgoingMessageToRelaychain = parachainExtrinsicEvents.find((e) =>
      networkApi.events.parachainSystem.UpwardMessageSent.is(e.event)
    );

    if (outgoingMessageToRelaychain) {
      history.parachainBlockId = history.externalBlockId;
      history.parachainBlockHeight = history.externalBlockHeight;

      // message hash sended to Relaychain
      const messageHash = outgoingMessageToRelaychain.event.data.messageHash.toString();

      return await this.processOutgoingToRelaychain(history, asset, messageHash);
    } else {
      return await this.processOutgoingToSoraParachain(history, asset, parachainExtrinsicEvents);
    }
  }

  private async processOutgoingToLiberland(history: SubHistory): Promise<SubHistory> {
    history.amount2 = history.amount;
    history.externalTransferFee = ZeroStringValue;
    history.to = formatSubAddress(history.to as string, this.externalApi.registry.chainSS58 as number);

    return history;
  }

  private async processOutgoingToSoraParachain(
    history: SubHistory,
    asset: Nullable<RegisteredAccountAsset>,
    extrinsicEvents: any[]
  ): Promise<SubHistory> {
    if (!this.parachainApi) throw new Error('[processOutgoingToSoraParachain] Parachain Api is not exists');

    try {
      const receivedAmount = getDepositedBalance(extrinsicEvents, history.to as string, this.parachainApi);

      const { amount, transferFee } = getReceivedAmount(
        history.amount as string,
        receivedAmount,
        asset?.externalDecimals
      );

      history.amount2 = amount;
      history.externalTransferFee = transferFee;
    } catch {
      // refunded
      history.transactionState = BridgeTxStatus.Failed;
    }

    history.externalNetwork = subBridgeApi.getSoraParachain(history.externalNetwork as SubNetwork);
    history.to = formatSubAddress(history.to as string, this.parachainApi.registry.chainSS58 as number);

    return history;
  }

  private async processOutgoingToRelaychain(
    history: SubHistory,
    asset: Nullable<RegisteredAccountAsset>,
    messageHash: string
  ): Promise<SubHistory> {
    if (!this.parachainApi) throw new Error('[processOutgoingToRelaychain] Parachain Api is not exists');

    const relayChainBlockNumber = await subBridgeApi.soraParachainApi.getRelayChainBlockNumber(
      history.parachainBlockId as string,
      this.parachainApi
    );
    // Relaychain should have received message in this blocks range
    const startSearch = relayChainBlockNumber + 2;
    const endSearch = startSearch + 2;

    for (let relaychainBlockHeight = startSearch; relaychainBlockHeight <= endSearch; relaychainBlockHeight++) {
      try {
        const blockId = await api.system.getBlockHash(relaychainBlockHeight, this.externalApi);
        const blockEvents = await api.system.getBlockEvents(blockId, this.externalApi);
        const blockEventsReversed = [...blockEvents].reverse();

        const messageQueueEventIndex = blockEventsReversed.findIndex(({ event }) => {
          if (this.externalApi.events.messageQueue.Processed.is(event)) {
            return event.data[0].toString() === messageHash;
          }
          return false;
        });

        if (messageQueueEventIndex === -1) continue;

        history.externalBlockId = blockId;
        history.externalBlockHeight = relaychainBlockHeight;
        history.to = formatSubAddress(history.to as string, this.externalApi.registry.chainSS58 as number);

        // Native token for network
        const receivedAmount = getDepositedBalance(
          blockEventsReversed.slice(messageQueueEventIndex),
          history.to as string,
          this.externalApi
        );
        const { amount, transferFee } = getReceivedAmount(
          history.amount as string,
          receivedAmount,
          asset?.externalDecimals
        );

        history.amount2 = amount;
        history.externalTransferFee = transferFee;

        return history;
      } catch (error) {
        console.error(error);
        continue;
      }
    }

    console.info(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${startSearch}; ${endSearch}]`
    );

    history.transactionState = BridgeTxStatus.Failed;

    return history;
  }

  private async processIncomingTxExternalData({
    history,
    soraEvents,
  }: {
    history: SubHistory;
    soraEvents: any[];
  }): Promise<Nullable<SubHistory>> {
    // find SORA hash event index
    const requestStatusUpdateEventIndex = soraEvents.findIndex((e) => {
      if (!this.soraApi.events.bridgeProxy.RequestStatusUpdate.is(e.event)) return false;

      const hash = e.event.data[0].toString();

      return hash === history.id;
    });
    // Received on SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageDispatchedNonces(
      soraEvents.slice(requestStatusUpdateEventIndex),
      this.soraApi
    );
    // api for Standalone network or SORA parachain
    const networkApi = this.getIntermediateApi(history);
    const networkBlockId = history.externalBlockId as string;
    // Network block events
    const networkEvents = await api.system.getBlockEvents(networkBlockId, networkApi);
    // Network message sended to SORA
    const messageToSoraEvent = networkEvents.find((e) => {
      if (!networkApi.events.substrateBridgeOutboundChannel.MessageAccepted.is(e.event)) return false;

      const [networkBatchNonce, networkMessageNonce] = getMessageAcceptedNonces([e], networkApi);

      return networkBatchNonce === soraBatchNonce && networkMessageNonce === soraMessageNonce;
    });

    if (!messageToSoraEvent) {
      throw new Error(
        `[${history.id}] Message sended to SORA from external network block "${networkBlockId}" not found`
      );
    }

    const networkExtrinsicIndex = messageToSoraEvent.phase.asApplyExtrinsic.toNumber();
    const networkExtrinsicEvents = getTxEvents(networkEvents, networkExtrinsicIndex);

    if (history.externalNetwork === SubNetworkId.Liberland) {
      return await this.processIncomingFromLiberland(history, networkExtrinsicEvents);
    }

    const parachainApi = this.parachainApi;

    if (!parachainApi) throw new Error('[processIncomingTxExternalData] Parachain Api is not exists');

    // If transfer received from Relaychain, extrinsic events should have downward message processed
    const incomingMessageFromRelaychain = networkExtrinsicEvents.find((e) =>
      parachainApi.events.parachainSystem.DownwardMessagesProcessed.is(e.event)
    );

    if (incomingMessageFromRelaychain) {
      history.parachainBlockId = history.externalBlockId;
      history.parachainBlockHeight = history.externalBlockHeight;
      return await this.processIncomingFromRelaychain(history);
    } else {
      return await this.processIncomingFromSoraParachain(history, networkExtrinsicEvents);
    }
  }

  private async processIncomingFromLiberland(history: SubHistory, extrinsicEvents: any[]): Promise<SubHistory> {
    const feeEvent = extrinsicEvents.find((e) =>
      this.externalApi.events.transactionPayment.TransactionFeePaid.is(e.event)
    );
    const signer = feeEvent.event.data[0].toString(); // signer is spent balance for fee

    history.externalNetworkFee = feeEvent.event.data[1].toString();
    history.to = formatSubAddress(signer, this.externalApi.registry.chainSS58 as number);

    return history;
  }

  private async processIncomingFromSoraParachain(history: SubHistory, extrinsicEvents: any[]): Promise<SubHistory> {
    const parachainApi = this.parachainApi;

    if (!parachainApi) throw new Error('[processIncomingFromSoraParachain] Parachain Api is not exists');

    const feeEvent = extrinsicEvents.find((e) => parachainApi.events.transactionPayment.TransactionFeePaid.is(e.event));
    const signer = feeEvent.event.data[0].toString(); // signer is spent balance for fee

    history.externalNetwork = subBridgeApi.getSoraParachain(history.externalNetwork as SubNetwork);
    history.externalNetworkFee = feeEvent.event.data[1].toString();
    history.to = formatSubAddress(signer, parachainApi.registry.chainSS58 as number);

    return history;
  }

  private async processIncomingFromRelaychain(history: SubHistory): Promise<SubHistory> {
    const parachainApi = this.parachainApi;
    const soraParachain = this.soraParachain;

    if (!parachainApi) throw new Error('[processIncomingFromRelaychain] Parachain Api is not exists');
    if (!soraParachain) throw new Error('[processIncomingFromRelaychain] Sora Parachain adapter is not exists');

    const relayChainBlockNumber = await subBridgeApi.soraParachainApi.getRelayChainBlockNumber(
      history.parachainBlockId as string,
      parachainApi
    );
    // relay chain should have send message in this blocks range
    const startSearch = relayChainBlockNumber;
    const endSearch = startSearch - 6;

    for (let relaychainBlockHeight = startSearch; relaychainBlockHeight >= endSearch; relaychainBlockHeight--) {
      const blockId = await api.system.getBlockHash(relaychainBlockHeight, this.externalApi);
      const extrinsics = await api.system.getExtrinsicsFromBlock(blockId, this.externalApi);

      for (const [extrinsicIndex, extrinsic] of extrinsics.entries()) {
        try {
          if (
            !(
              extrinsic.method.section === 'xcmPallet' &&
              ['reserveTransferAssets', 'limitedReserveTransferAssets'].includes(extrinsic.method.method)
            )
          )
            continue;

          const [dest, beneficiary] = extrinsic.args;
          const parachainId = (dest as any).asV3.interior.asX1.asParachain.toNumber();
          const accountId = (beneficiary as any).asV3.interior.asX1.asAccountId32.id.toString();
          const receiver = subBridgeApi.formatAddress(accountId);
          const from = subBridgeApi.formatAddress(history.from as string);

          if (!(parachainId === soraParachain.getParachainId() && receiver === from)) {
            continue;
          }

          const signer = extrinsic.signer.toString();
          const extrinsicEvents = await getBlockEventsByTxIndex(blockId, extrinsicIndex, this.externalApi);
          const feeEvent = extrinsicEvents.find((e) =>
            this.externalApi.events.transactionPayment.TransactionFeePaid.is(e.event)
          );

          history.externalNetworkFee = feeEvent.event.data[1].toString();
          history.externalBlockId = blockId;
          history.externalBlockHeight = relaychainBlockHeight;
          history.to = formatSubAddress(signer, this.soraApi.registry.chainSS58 as number);

          return history;
        } catch (error) {
          console.error(error);
          continue;
        }
      }
    }

    console.info(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${endSearch}; ${startSearch}]`
    );

    return history;
  }
}

/**
 * Restore Sub bridge account transactions, using parachain & external network connections
 * @param context store context
 */
export const updateSubBridgeHistory =
  (context: ActionContext<any, any>) =>
  async (clearHistory = false, updateCallback?: VoidFunction): Promise<void> => {
    try {
      const { rootState, rootGetters } = rootActionContext(context);
      const {
        wallet: {
          account: { address },
        },
        web3: { networkSelected },
        bridge: { inProgressIds },
      } = rootState;
      const {
        bridge: { networkHistoryId },
      } = rootGetters;

      if (!(networkSelected && networkHistoryId)) return;

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const subBridgeHistory = new SubBridgeHistory();

      await subBridgeHistory.init(networkHistoryId as SubNetwork, subBridgeConnector);

      if (clearHistory) {
        await subBridgeHistory.clearHistory(networkSelected as SubNetwork, inProgressIds, updateCallback);
      }

      await subBridgeHistory.updateAccountHistory(address, inProgressIds, assetDataByAddress, updateCallback);
    } catch (error) {
      console.error(error);
    }
  };
