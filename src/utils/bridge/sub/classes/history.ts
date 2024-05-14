import { FPNumber, Operation } from '@sora-substrate/util';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import { api } from '@soramitsu/soraneo-wallet-web';

import { ZeroStringValue } from '@/consts';
import { rootActionContext } from '@/store';
import { getBlockEventsByTxIndex } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import {
  getDepositedBalance,
  getMessageAcceptedNonces,
  getMessageDispatchedNonces,
  isMessageDispatchedNonces,
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

  return { tx, txEvents, blockEvents };
};

class SubBridgeHistory extends SubNetworksConnector {
  get soraApi(): ApiPromise {
    return subBridgeApi.api;
  }

  get soraParachainApi(): ApiPromise | undefined {
    return this.soraParachain?.api;
  }

  get relaychainApi(): ApiPromise | undefined {
    return this.relaychain?.api;
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
    network: SubNetwork,
    address: string,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    try {
      const transactions = await subBridgeApi.getUserTransactions(address, network);

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

      if (!asset) {
        console.info(`[${this.constructor.name}] Asset is not exists: "${tx.soraAssetAddress}, skip;"`);
        return null;
      }

      const amount = FPNumber.fromCodecValue(tx.amount, asset.decimals).toString();
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
        assetAddress: asset.address,
        symbol: asset.symbol,
        from: tx.soraAccount,
        to: tx.externalAccount,
        soraNetworkFee: ZeroStringValue, // overrides in Outgoing
        externalNetworkFee: ZeroStringValue, // overrides in Incoming
        payload: {},
      };

      const networkApi = this.getIntermediateApi(history);

      const [blockId, externalBlockId] = await Promise.all([
        api.system.getBlockHash(blockHeight, this.soraApi),
        api.system.getBlockHash(externalBlockHeight, networkApi),
      ]);

      history.blockId = blockId;
      history.externalBlockId = externalBlockId;

      const [{ tx: soraTx, txEvents: soraTxEvents, blockEvents: soraBlockEvents }, startTime] = await Promise.all([
        findTxInBlock(blockId, id),
        api.system.getBlockTimestamp(blockId, this.soraApi),
      ]);

      history.txId = soraTx.hash.toString();
      history.startTime = history.endTime = startTime;

      if (isOutgoing) {
        return await this.processOutgoingTx({
          history,
          asset,
          events: soraTxEvents,
        });
      } else {
        return await this.processIncomingTx({
          history,
          txEvents: soraTxEvents,
          blockEvents: soraBlockEvents,
        });
      }
    } catch (error) {
      console.info(`[${id}]`, error);
      return null;
    }
  }

  private getIntermediateApi(history: SubHistory): ApiPromise {
    if (!history.externalNetwork) throw new Error(`[${history.txId}] externalNetwork is not defined`);

    if (subBridgeApi.isStandalone(history.externalNetwork)) return this.externalApi;

    if (!this.soraParachainApi) throw new Error(`[${history.txId}] SORA Parachain Api is not exists`);

    return this.soraParachainApi;
  }

  private async processOutgoingTx({
    history,
    asset,
    events,
  }: {
    history: SubHistory;
    asset: RegisteredAccountAsset;
    events: any[];
  }): Promise<Nullable<SubHistory>> {
    const { soraParachainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');

    // update SORA network fee
    const soraFeeEvent = events.find((e) => this.soraApi.events.transactionPayment.TransactionFeePaid.is(e.event));
    history.soraNetworkFee = soraFeeEvent.event.data[1].toString();
    // sended from SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageAcceptedNonces(events, this.soraApi);
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

    const externalNetwork = history.externalNetwork as SubNetwork;

    if (externalNetwork === SubNetworkId.Liberland) {
      return await this.processOutgoingToLiberland(history);
    }

    // SORA Parachain extrinsic events for next search
    const parachainExtrinsicEvents = networkEventsReversed.slice(messageDispatchedIndex);
    // sended from SORA Parachain to Relaychain message hash (1)
    const messageToRelaychain = parachainExtrinsicEvents.find((e) =>
      networkApi.events.parachainSystem.UpwardMessageSent.is(e.event)
    );
    // sended from SORA Parachain to Parachain message hash (2)
    const messageToParachain = parachainExtrinsicEvents.find((e) =>
      networkApi.events.xcmpQueue.XcmpMessageSent.is(e.event)
    );

    if (!messageToRelaychain && !messageToParachain) {
      return await this.processOutgoingToSoraParachain(history, asset, parachainExtrinsicEvents);
    }

    const isRelaychain = subBridgeApi.isRelayChain(externalNetwork) && messageToRelaychain;
    const isParachain = subBridgeApi.isParachain(externalNetwork) && messageToParachain;

    if (!isRelaychain && !isParachain) {
      console.info(`[${history.id}] not "${externalNetwork}" transaction, skip;`);
      return null;
    }

    this.updateSoraParachainBlockData(history);

    const messageHash = (messageToRelaychain ?? messageToParachain).event.data.messageHash.toString();
    const relayChainBlockNumber = await subBridgeApi.soraParachainApi.getRelayChainBlockNumber(
      history.parachainBlockId as string,
      soraParachainApi
    );

    let startSearch!: number;
    let endSearch!: number;

    if (isRelaychain) {
      // Relaychain should have received message in this blocks range
      [startSearch, endSearch] = [relayChainBlockNumber + 2, relayChainBlockNumber + 4];
    } else {
      // Parachain block, found through relaychain validation data (start block for search)
      const parachainBlockId = await this.findParachainBlockIdOnRelaychain(history, relayChainBlockNumber);
      const parachainBlockNumber = await api.system.getBlockNumber(parachainBlockId, this.externalApi);
      // Parachain should have receive message in this blocks range
      [startSearch, endSearch] = [parachainBlockNumber, parachainBlockNumber + 6];
    }

    return await this.processOutgoingTxOnDestination(history, asset, messageHash, startSearch, endSearch);
  }

  private async processOutgoingToLiberland(history: SubHistory): Promise<SubHistory> {
    history.amount2 = history.amount;
    history.externalTransferFee = ZeroStringValue;
    history.to = this.network.formatAddress(history.to);

    return history;
  }

  private async processOutgoingToSoraParachain(
    history: SubHistory,
    asset: RegisteredAccountAsset,
    extrinsicEvents: any[]
  ) {
    const { soraParachain, soraParachainApi } = this;

    if (!(soraParachain && soraParachainApi)) throw new Error('SORA Parachain Api is not exists');

    try {
      const [receivedAmount, externalEventIndex] = getDepositedBalance(
        extrinsicEvents,
        history.to as string,
        soraParachainApi
      );
      // balances.Deposit event index
      history.externalEventIndex = externalEventIndex;

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
    history.to = soraParachain.formatAddress(history.to);

    return history;
  }

  private async processIncomingTx({
    history,
    txEvents,
    blockEvents,
  }: {
    history: SubHistory;
    txEvents: any[];
    blockEvents: any[];
  }): Promise<Nullable<SubHistory>> {
    const { soraApi, soraParachainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');

    // Token is minted to account event
    const [_, eventIndex] = getDepositedBalance(blockEvents, history.from as string, this.soraApi);
    history.payload.eventIndex = eventIndex;

    // find SORA hash event index
    const requestStatusUpdateEventIndex = txEvents.findIndex((e) => {
      if (!soraApi.events.bridgeProxy.RequestStatusUpdate.is(e.event)) return false;

      const hash = e.event.data[0].toString();

      return hash === history.id;
    });
    // Received on SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageDispatchedNonces(
      txEvents.slice(requestStatusUpdateEventIndex),
      soraApi
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
        `[${history.id}] Message sended to SORA from external network not found. Block "${networkBlockId}"`
      );
    }

    const networkExtrinsicIndex = messageToSoraEvent.phase.asApplyExtrinsic.toNumber();
    const networkExtrinsicEvents = getTxEvents(networkEvents, networkExtrinsicIndex);

    // is tx signed on SORA Parachain or Standalone network
    const feeEvent = networkExtrinsicEvents.find((e) =>
      networkApi.events.transactionPayment.TransactionFeePaid.is(e.event)
    );

    if (feeEvent) {
      const signer = feeEvent.event.data[0].toString(); // signer is spent balance for fee

      if (!subBridgeApi.isStandalone(history.externalNetwork as SubNetwork)) {
        history.externalNetwork = subBridgeApi.getSoraParachain(history.externalNetwork as SubNetwork);
      }

      history.externalNetworkFee = feeEvent.event.data[1].toString();
      history.to = this.network.formatAddress(signer);

      return history;
    }

    // If transfer received from Parachain, extrinsic events should have xcmpQueue.Success event
    const messageEvent = networkExtrinsicEvents.find((e) => soraParachainApi.events.xcmpQueue.Success.is(e.event));
    const externalNetwork = history.externalNetwork as SubNetwork;
    const isRelayChain = subBridgeApi.isRelayChain(externalNetwork) && !messageEvent;
    const isParachain =
      subBridgeApi.isParachain(externalNetwork) && !subBridgeApi.isSoraParachain(externalNetwork) && messageEvent;

    if (!isRelayChain && !isParachain) {
      console.info(`[${history.id}] not "${externalNetwork}" transaction, skip;`);
      return null;
    }

    this.updateSoraParachainBlockData(history);

    const relayChainBlockNumber = await subBridgeApi.soraParachainApi.getRelayChainBlockNumber(
      history.parachainBlockId as string,
      soraParachainApi
    );

    if (isParachain) {
      const messageHash = messageEvent.event.data.messageHash.toString();
      // Parachain block, found through relaychain validation data
      const parachainBlockId = await this.findParachainBlockIdOnRelaychain(history, relayChainBlockNumber);

      return await this.processIncomingFromParachain(history, parachainBlockId, messageHash);
    } else {
      return await this.processIncomingFromRelaychain(history, relayChainBlockNumber);
    }
  }

  private async processIncomingFromRelaychain(history: SubHistory, relayChainBlockNumber: number): Promise<SubHistory> {
    const { soraParachain, soraParachainApi } = this;

    if (!(soraParachain && soraParachainApi)) throw new Error('SORA Parachain Api is not exists');

    const soraParachainId = soraParachain.getParachainId();

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

          if (!(parachainId === soraParachainId && receiver === from)) {
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
          history.externalHash = extrinsic.hash.toString();
          history.to = this.network.formatAddress(signer);

          return history;
        } catch {
          continue;
        }
      }
    }

    console.info(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${endSearch}; ${startSearch}]`
    );

    return history;
  }

  private async findParachainBlockIdOnRelaychain(history: SubHistory, relayChainBlockNumber: number) {
    const { network, soraParachainApi, relaychainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');
    if (!relaychainApi) throw new Error('Relaychain Api is not exists');

    // relay chain should have send validation data in this blocks range
    const startSearch = relayChainBlockNumber;
    const endSearch = startSearch - 2;

    for (let relaychainBlockHeight = startSearch; relaychainBlockHeight >= endSearch; relaychainBlockHeight--) {
      const blockId = await api.system.getBlockHash(relaychainBlockHeight, relaychainApi);
      const events = await api.system.getBlockEvents(blockId, relaychainApi);

      for (const e of events) {
        if (!relaychainApi.events.paraInclusion.CandidateIncluded.is(e.event)) continue;

        const { descriptor } = e.event.data[0];

        if (descriptor.paraId.toNumber() !== network.getParachainId()) continue;

        history.relaychainBlockHeight = relaychainBlockHeight;
        history.relaychainBlockId = blockId;

        // parachain block hash
        return descriptor.paraHead.toString();
      }
    }

    throw new Error(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${endSearch}; ${startSearch}]`
    );
  }

  private async processIncomingFromParachain(history: SubHistory, parachainBlockId: string, messageHash: string) {
    const { externalApi, network } = this;

    const soraParachainId = network.getSoraParachainId();
    const [parachainBlockEvents, parachainBlockExtrinsics] = await Promise.all([
      api.system.getBlockEvents(parachainBlockId, externalApi),
      api.system.getExtrinsicsFromBlock(parachainBlockId, externalApi),
    ]);

    for (const [extrinsicIndex, extrinsic] of parachainBlockExtrinsics.entries()) {
      if (!(extrinsic.method.section === 'xTokens' && extrinsic.method.method === 'transfer')) continue;

      try {
        const [_currencyId, _amount, dest] = extrinsic.args;
        const xcmJunctions = (dest as any).asV3.interior.asX2;
        const paraId = xcmJunctions[0].asParachain.toNumber();
        const accountId = xcmJunctions[1].asAccountId32.id.toString();
        const receiver = subBridgeApi.formatAddress(accountId);
        const from = subBridgeApi.formatAddress(history.from as string);

        if (!(paraId === soraParachainId && receiver === from)) {
          continue;
        }

        const extrinsicEvents = parachainBlockEvents.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === extrinsicIndex
        );
        const messageSentEvent = extrinsicEvents.find((e) => externalApi.events.xcmpQueue.XcmpMessageSent.is(e.event));

        if (!messageSentEvent) continue;
        if (messageSentEvent.event.data[0].toString() !== messageHash) continue;

        const parachainBlockHeight = await api.system.getBlockNumber(parachainBlockId, externalApi);
        const signer = extrinsic.signer.toString();
        const feeEvent = extrinsicEvents.find((e) =>
          externalApi.events.transactionPayment.TransactionFeePaid.is(e.event)
        );

        history.externalNetworkFee = feeEvent.event.data[1].toString();
        history.externalBlockId = parachainBlockId;
        history.externalBlockHeight = parachainBlockHeight;
        history.externalHash = extrinsic.hash.toString();
        history.to = this.network.formatAddress(signer);

        return history;
      } catch (error) {
        continue;
      }
    }

    return history;
  }

  private async processOutgoingTxOnDestination(
    history: SubHistory,
    asset: RegisteredAccountAsset,
    messageHash: string,
    startSearch: number,
    endSearch: number
  ) {
    for (let blockHeight = startSearch; blockHeight <= endSearch; blockHeight++) {
      try {
        const blockId = await api.system.getBlockHash(blockHeight, this.externalApi);
        const blockEvents = await api.system.getBlockEvents(blockId, this.externalApi);

        const messageQueueEventIndex = blockEvents.findIndex(({ event }) => {
          if (this.externalApi.events.messageQueue.Processed.is(event)) {
            const messageHashMatches = event.data[0].toString() === messageHash;

            return messageHashMatches;
          }
          return false;
        });

        if (messageQueueEventIndex === -1) continue;

        history.externalBlockId = blockId;
        history.externalBlockHeight = blockHeight;
        history.to = this.network.formatAddress(history.to);

        const [receivedAmount, externalEventIndex] = getDepositedBalance(
          blockEvents.slice(0, messageQueueEventIndex),
          history.to,
          this.externalApi
        );

        // Deposit event index
        history.externalEventIndex = externalEventIndex;

        const { amount, transferFee } = getReceivedAmount(
          history.amount as string,
          receivedAmount,
          asset?.externalDecimals
        );

        history.amount2 = amount;
        history.externalTransferFee = transferFee;

        return history;
      } catch {
        continue;
      }
    }

    console.info(`[${history.id}] Transaction not found in blocks range [${startSearch}; ${endSearch}]`);

    history.transactionState = BridgeTxStatus.Failed;

    return history;
  }

  private updateSoraParachainBlockData(history: SubHistory): void {
    history.parachainBlockId = history.externalBlockId;
    history.parachainBlockHeight = history.externalBlockHeight;
    history.externalBlockId = undefined;
    history.externalBlockHeight = undefined;
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
        bridge: { inProgressIds, subBridgeConnector },
      } = rootState;

      if (!networkSelected) return;

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const subBridgeHistory = new SubBridgeHistory();
      const network = networkSelected as SubNetwork;

      await subBridgeHistory.init(network, subBridgeConnector);

      if (clearHistory) {
        await subBridgeHistory.clearHistory(network, inProgressIds, updateCallback);
      }

      await subBridgeHistory.updateAccountHistory(network, address, inProgressIds, assetDataByAddress, updateCallback);
    } catch (error) {
      console.error(error);
    }
  };
