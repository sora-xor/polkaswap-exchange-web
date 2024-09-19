import { FPNumber, Operation } from '@sora-substrate/sdk';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/sdk/build/bridgeProxy/consts';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
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
  getParachainSystemMessageHash,
  isMessageDispatchedNonces,
  getReceivedAmount,
  isParaInclusion,
  isTransactionFeePaid,
  isBridgeProxyHash,
  isMessageAccepted,
  isQueueMessage,
} from '@/utils/bridge/sub/utils';

import type { ApiPromise } from '@polkadot/api';
import type { RegisteredAccountAsset } from '@sora-substrate/sdk/build/assets/types';
import type { SubNetwork, SubHistory } from '@sora-substrate/sdk/build/bridgeProxy/sub/types';
import type { BridgeTransactionData } from '@sora-substrate/sdk/build/bridgeProxy/types';
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

  const event = blockEvents.find((e) => isBridgeProxyHash(e, soraHash));

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
    assets: string[],
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    try {
      const transactions = await subBridgeApi.getUserTransactions(address, network);

      if (!transactions.length) return;

      const currentHistory = subBridgeApi.historyList as SubHistory[];

      for (const tx of transactions) {
        const { soraHash: id, soraAssetAddress } = tx;

        if (!assets.includes(soraAssetAddress)) continue;

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
    // update SORA network fee
    const soraFeeEvent = events.find((e) => isTransactionFeePaid(e));
    history.soraNetworkFee = soraFeeEvent.event.data[1].toString();
    // sended from SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageAcceptedNonces(events);
    // api for Standalone network or SORA parachain
    const networkApi = this.getIntermediateApi(history);
    const networkBlockId = history.externalBlockId as string;
    // Network block events
    const networkEvents = await api.system.getBlockEvents(networkBlockId, networkApi);
    const networkEventsReversed = [...networkEvents].reverse();
    // Network received nonces
    const messageDispatchedIndex = networkEventsReversed.findIndex((e) =>
      isMessageDispatchedNonces(soraBatchNonce, soraMessageNonce, e)
    );

    if (messageDispatchedIndex === -1) {
      throw new Error(`[${history.id}] Message sent from SORA to network is not found in block "${networkBlockId}"`);
    }

    const externalNetwork = history.externalNetwork as SubNetwork;

    if (externalNetwork === SubNetworkId.Liberland) {
      return await this.processOutgoingToLiberland(history);
    }

    const { soraParachainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');

    // SORA Parachain extrinsic events for next search
    const parachainExtrinsicEvents = networkEventsReversed.slice(messageDispatchedIndex);
    // sended from SORA Parachain message hash (1)
    const messageHash = getParachainSystemMessageHash(parachainExtrinsicEvents);

    if (!messageHash) {
      return await this.processOutgoingToSoraParachain(history, asset, parachainExtrinsicEvents);
    }

    const isRelaychain = subBridgeApi.isRelayChain(externalNetwork);
    const isParachain = subBridgeApi.isParachain(externalNetwork);

    if (!isRelaychain && !isParachain) {
      console.info(`[${history.id}] not "${externalNetwork}" transaction, skip;`);
      return null;
    }

    this.updateSoraParachainBlockData(history);

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
      const parachainBlockId = await this.findParachainBlockIdOnRelaychain(history, relayChainBlockNumber, true);
      const parachainBlockNumber = await api.system.getBlockNumber(parachainBlockId, this.externalApi);
      // Parachain should have receive message in this blocks range
      [startSearch, endSearch] = [parachainBlockNumber, parachainBlockNumber + 6];
    }

    return await this.processOutgoingTxOnDestination(history, asset, messageHash, startSearch, endSearch);
  }

  private async processOutgoingToLiberland(history: SubHistory): Promise<SubHistory> {
    history.amount2 = history.amount;
    history.externalTransferFee = ZeroStringValue;
    history.to = this.network.formatAddress(history.to as string);

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
        soraParachain
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
    history.to = soraParachain.formatAddress(history.to as string);

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
    // Token is minted to account event
    const [_, eventIndex] = getDepositedBalance(blockEvents, history.from as string, subBridgeApi);
    history.payload.eventIndex = eventIndex;

    // find SORA hash event index
    const requestStatusUpdateEventIndex = txEvents.findIndex((e) => isBridgeProxyHash(e, history.id as string));
    // Received on SORA nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageDispatchedNonces(
      txEvents.slice(requestStatusUpdateEventIndex)
    );
    // api for Standalone network or SORA parachain
    const networkApi = this.getIntermediateApi(history);
    const networkBlockId = history.externalBlockId as string;
    // Network block events
    const networkEvents = await api.system.getBlockEvents(networkBlockId, networkApi);
    // Network message sended to SORA
    const messageToSoraEvent = networkEvents.find((e) => {
      if (!isMessageAccepted(e)) return false;

      const [networkBatchNonce, networkMessageNonce] = getMessageAcceptedNonces([e]);

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
    const feeEvent = networkExtrinsicEvents.find((e) => isTransactionFeePaid(e));

    if (feeEvent) {
      const signer = feeEvent.event.data[0].toString(); // signer is spent balance for fee

      if (!subBridgeApi.isStandalone(history.externalNetwork as SubNetwork)) {
        history.externalNetwork = subBridgeApi.getSoraParachain(history.externalNetwork as SubNetwork);
      }

      history.externalNetworkFee = feeEvent.event.data[1].toString();
      history.to = this.network.formatAddress(signer);

      return history;
    }

    const { soraParachainApi } = this;
    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');

    // If transfer received from Parachain, extrinsic events should have xcmpQueue.Success event
    const messageEvent = networkExtrinsicEvents.find((e) => isQueueMessage(e));
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
      const messageHash = messageEvent.event.data[0].toString();
      // Parachain block, found through relaychain validation data
      const parachainBlockId = await this.findParachainBlockIdOnRelaychain(history, relayChainBlockNumber, false);

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
    const endSearch = startSearch - 10;

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
          const feeEvent = extrinsicEvents.find((e) => isTransactionFeePaid(e));

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

  private async findParachainBlockIdOnRelaychain(
    history: SubHistory,
    relayChainBlockNumber: number,
    isOutgoing: boolean
  ) {
    const { network, soraParachainApi, relaychainApi } = this;

    if (!soraParachainApi) throw new Error('SORA Parachain Api is not exists');
    if (!relaychainApi) throw new Error('Relaychain Api is not exists');

    // relay chain should have send validation data in this blocks range
    const startSearch = relayChainBlockNumber;
    const blocksRange = 10;
    const endSearch = isOutgoing ? startSearch + blocksRange : startSearch - blocksRange;

    for (let relaychainBlockHeight = startSearch; relaychainBlockHeight !== endSearch; ) {
      const blockId = await api.system.getBlockHash(relaychainBlockHeight, relaychainApi);
      const events = await api.system.getBlockEvents(blockId, relaychainApi);

      for (const e of events) {
        if (!isParaInclusion(e)) continue;

        const { descriptor } = e.event.data[0];

        const descriptorParaId = descriptor.paraId.toNumber();
        const paraId = network.getParachainId();

        if (descriptorParaId !== paraId) continue;

        history.relaychainBlockHeight = relaychainBlockHeight;
        history.relaychainBlockId = blockId;

        // parachain block hash
        return descriptor.paraHead.toString();
      }

      relaychainBlockHeight = isOutgoing ? relaychainBlockHeight + 1 : relaychainBlockHeight - 1;
    }

    throw new Error(
      `[${history.id}] Relaychain transaction for SORA Parachain block "${history.parachainBlockId}" not found in blocks range [${endSearch}; ${startSearch}]`
    );
  }

  private async processIncomingFromParachain(history: SubHistory, parachainBlockId: string, messageHash: string) {
    const { externalApi } = this;

    const [parachainBlockEvents, parachainBlockExtrinsics] = await Promise.all([
      api.system.getBlockEvents(parachainBlockId, externalApi),
      api.system.getExtrinsicsFromBlock(parachainBlockId, externalApi),
    ]);

    for (const [extrinsicIndex, extrinsic] of parachainBlockExtrinsics.entries()) {
      if (!(extrinsic.method.section === 'xTokens' || extrinsic.method.section === 'polkadotXcm')) continue;

      try {
        const extrinsicEvents = parachainBlockEvents.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === extrinsicIndex
        );

        const messageSentHash = getParachainSystemMessageHash(extrinsicEvents);

        if (messageSentHash !== messageHash) continue;

        const parachainBlockHeight = await api.system.getBlockNumber(parachainBlockId, externalApi);
        const signer = extrinsic.signer.toString();
        const feeEvent = extrinsicEvents.find((e) => isTransactionFeePaid(e));

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
      let isReliableMessage = false;

      try {
        const blockId = await api.system.getBlockHash(blockHeight, this.externalApi);
        const blockEvents = await api.system.getBlockEvents(blockId, this.externalApi);

        const messageEventIndex = blockEvents.findIndex((e) => {
          if (isQueueMessage(e)) {
            isReliableMessage = e.event.data[0].toString() === messageHash;

            return true;
          }
          return false;
        });

        if (messageEventIndex === -1) continue;

        history.externalBlockId = blockId;
        history.externalBlockHeight = blockHeight;
        history.to = this.network.formatAddress(history.to as string);

        const [receivedAmount, externalEventIndex] = getDepositedBalance(
          blockEvents.slice(0, messageEventIndex),
          history.to,
          this.network
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
        if (isReliableMessage) {
          break;
        } else {
          continue;
        }
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
        assets: { registeredAssets },
        web3: { networkSelected },
        bridge: { inProgressIds, subBridgeConnector },
      } = rootState;

      if (!networkSelected) return;

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const subBridgeHistory = new SubBridgeHistory();
      const network = networkSelected as SubNetwork;
      const assets = Object.keys(registeredAssets);

      await subBridgeHistory.init(network, subBridgeConnector);

      if (clearHistory) {
        await subBridgeHistory.clearHistory(network, inProgressIds, updateCallback);
      }

      await subBridgeHistory.updateAccountHistory(
        network,
        address,
        assets,
        inProgressIds,
        assetDataByAddress,
        updateCallback
      );
    } catch (error) {
      console.error(error);
    }
  };
