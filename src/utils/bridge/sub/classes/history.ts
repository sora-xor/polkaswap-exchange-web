import { FPNumber, Operation } from '@sora-substrate/util';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';
import { api } from '@soramitsu/soraneo-wallet-web';

import { ZeroStringValue } from '@/consts';
import { rootActionContext } from '@/store';
import { getBlockEventsByTxIndex } from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { SubNetworksConnector } from '@/utils/bridge/sub/classes/adapter';
import { getMessageAcceptedNonces, isMessageDispatchedNonces, formatSubAddress } from '@/utils/bridge/sub/utils';

import type { ApiPromise } from '@polkadot/api';
import type { NetworkFeesObject } from '@sora-substrate/util';
import type { RegisteredAccountAsset } from '@sora-substrate/util/build/assets/types';
import type { SubNetwork } from '@sora-substrate/util/build/bridgeProxy/sub/consts';
import type { SubHistory } from '@sora-substrate/util/build/bridgeProxy/sub/types';
import type { BridgeTransactionData } from '@sora-substrate/util/build/bridgeProxy/types';
import type { ActionContext } from 'vuex';

const hasFinishedState = (item: Nullable<SubHistory>) => {
  if (!item) return false;

  return item.transactionState === BridgeTxStatus.Done;
};

const getType = (isOutgoing: boolean) => {
  return isOutgoing ? Operation.SubstrateOutgoing : Operation.SubstrateIncoming;
};

const getBlockHeights = (isOutgoing: boolean, tx: BridgeTransactionData) => {
  return isOutgoing ? [tx.startBlock, tx.endBlock] : [tx.endBlock, tx.startBlock];
};

const findTxInBlock = async (blockHash: string, soraHash: string) => {
  const blockEvents = await api.system.getBlockEvents(blockHash);

  const event = blockEvents.find(
    ({ event }) => api.api.events.bridgeProxy.RequestStatusUpdate.is(event) && event.data?.[0]?.toString() === soraHash
  );

  if (!event) throw new Error('Unable to find "bridgeProxy.RequestStatusUpdate" event');

  const txIndex = event.phase.asApplyExtrinsic.toNumber();
  const txEvents = blockEvents.filter(
    ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === txIndex
  );
  const extrinsics = await api.system.getExtrinsicsFromBlock(blockHash);
  const tx = extrinsics[txIndex];
  const txHash = tx.hash.toString();

  return { hash: txHash, events: txEvents };
};

class SubBridgeHistory extends SubNetworksConnector {
  get soraApi(): ApiPromise {
    return subBridgeApi.api;
  }

  get parachainApi(): ApiPromise {
    return this.parachainAdapter.api;
  }

  get externalApi(): ApiPromise {
    return this.networkAdapter.api;
  }

  public async clearHistory(updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> {
    subBridgeApi.clearHistory();
    await updateCallback?.();
  }

  public async updateAccountHistory(
    address: string,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    try {
      const transactions = await subBridgeApi.getUserTransactions(address, this.network);

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
      const [blockHeight, parachainBlockHeight] = getBlockHeights(isOutgoing, tx);

      if (!parachainBlockHeight) {
        console.info(`[${id}] SORA parachain block number is: ${parachainBlockHeight}, skip;`);
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
        parachainBlockHeight,
        externalNetwork: this.network,
        externalNetworkType: BridgeNetworkType.Sub,
        amount,
        assetAddress: asset?.address,
        symbol: asset?.symbol,
        from: tx.soraAccount,
      };

      const [blockId, parachainBlockId] = await Promise.all([
        api.system.getBlockHash(blockHeight, this.soraApi),
        api.system.getBlockHash(parachainBlockHeight, this.parachainApi),
      ]);

      history.blockId = blockId;
      history.parachainBlockId = parachainBlockId;

      const [{ hash, events }, startTime, relayChainBlockNumber] = await Promise.all([
        findTxInBlock(blockId, id),
        api.system.getBlockTimestamp(blockId, this.soraApi),
        subBridgeApi.soraParachainApi.getRelayChainBlockNumber(parachainBlockId, this.parachainApi),
      ]);

      history.txId = hash;
      history.startTime = history.endTime = startTime;

      if (isOutgoing) {
        await this.processOutgoingTxExternalData({
          tx,
          parachainBlockId,
          relayChainBlockNumber,
          history,
          asset,
          events,
        });
      } else {
        await this.processIncomingTxExternalData({ relayChainBlockNumber, history });
      }

      return history;
    } catch (error) {
      console.error(`[${id}]`, error);
      return null;
    }
  }

  private async processOutgoingTxExternalData({
    tx,
    parachainBlockId,
    relayChainBlockNumber,
    history,
    asset,
    events,
  }: {
    tx: BridgeTransactionData;
    parachainBlockId: string;
    relayChainBlockNumber: number;
    history: SubHistory;
    asset: Nullable<RegisteredAccountAsset>;
    events: any[];
  }): Promise<void> {
    const soraFeeEvent = events.find((e) => this.soraApi.events.transactionPayment.TransactionFeePaid.is(e.event));
    // sended from sora nonces
    const [soraBatchNonce, soraMessageNonce] = getMessageAcceptedNonces(events, this.soraApi);
    const parachainEvents = await api.system.getBlockEvents(parachainBlockId, this.parachainApi);
    const parachainEventsReversed = [...parachainEvents].reverse();
    // received on parachain sora nonces
    const parachainMessageDispatchedIndex = parachainEventsReversed.findIndex((e) =>
      isMessageDispatchedNonces(soraBatchNonce, soraMessageNonce, e, this.parachainApi)
    );
    // sended parachain message hash
    const parachainMessageSendEvent = parachainEventsReversed
      .slice(parachainMessageDispatchedIndex)
      .find((e) => this.parachainApi.events.parachainSystem.UpwardMessageSent.is(e.event));
    const messageHash = parachainMessageSendEvent.event.data.messageHash.toString();
    // relay chain should have received message in this blocks range
    const startSearch = relayChainBlockNumber + 2;
    const endSearch = startSearch + 1;

    for (let n = startSearch; n <= endSearch; n++) {
      try {
        const blockId = await api.system.getBlockHash(n, this.externalApi);
        const blockEvents = await api.system.getBlockEvents(blockId, this.externalApi);
        const blockEventsReversed = [...blockEvents].reverse();

        const messageQueueEventIndex = blockEventsReversed.findIndex(
          ({ event }) =>
            this.externalApi.events.messageQueue.Processed.is(event) && event.data[0].toString() === messageHash
        );

        if (messageQueueEventIndex === -1) continue;

        const to = subBridgeApi.formatAddress(tx.externalAccount);
        // Native token for network
        const balancesDepositEvent = blockEventsReversed
          .slice(messageQueueEventIndex)
          .find(
            ({ event }) =>
              this.externalApi.events.balances.Deposit.is(event) &&
              subBridgeApi.formatAddress(event.data.who.toString()) === to
          );
        const sended = FPNumber.fromCodecValue(tx.amount, asset?.decimals);
        const received = FPNumber.fromCodecValue(
          balancesDepositEvent.event.data.amount.toString(),
          asset?.externalDecimals
        );

        history.soraNetworkFee = soraFeeEvent.event.data[1].toString();
        history.parachainNetworkFee = sended.sub(received).toCodecString();
        history.externalNetworkFee = ZeroStringValue;
        history.externalBlockId = blockId;
        history.externalBlockHeight = n;
        history.amount2 = received.toString();
        history.to = formatSubAddress(tx.externalAccount, this.externalApi.registry.chainSS58 as number);
        break;
      } catch {
        continue;
      }
    }
  }

  private async processIncomingTxExternalData({
    relayChainBlockNumber,
    history,
  }: {
    relayChainBlockNumber: number;
    history: SubHistory;
  }): Promise<void> {
    // relay chain should have send message in this blocks range
    const startSearch = relayChainBlockNumber;
    const endSearch = startSearch - 3;

    for (let n = startSearch; n >= endSearch; n--) {
      const blockId = await api.system.getBlockHash(n, this.externalApi);
      const extrinsics = await api.system.getExtrinsicsFromBlock(blockId, this.externalApi);

      for (const [extrinsicIndex, extrinsic] of extrinsics.entries()) {
        try {
          if (!(extrinsic.method.section === 'xcmPallet' && extrinsic.method.method === 'reserveTransferAssets'))
            continue;

          const [dest, beneficiary] = extrinsic.args;
          const parachainId = (dest as any).asV3.interior.asX1.asParachain.toNumber();
          const accountId = (beneficiary as any).asV3.interior.asX1.asAccountId32.id.toString();
          const receiver = subBridgeApi.formatAddress(accountId);
          const from = subBridgeApi.formatAddress(history.from as string);

          if (!(parachainId === this.parachainId && receiver === from)) continue;

          const signer = extrinsic.signer.toString();
          const extrinsicEvents = await getBlockEventsByTxIndex(blockId, extrinsicIndex, this.externalApi);
          const feeEvent = extrinsicEvents.find((e) =>
            this.externalApi.events.transactionPayment.TransactionFeePaid.is(e.event)
          );

          history.soraNetworkFee = ZeroStringValue;
          history.externalNetworkFee = feeEvent.event.data[1].toString();
          history.externalBlockId = blockId;
          history.externalBlockHeight = n;
          history.to = formatSubAddress(signer, this.externalApi.registry.chainSS58 as number);
          return;
        } catch {
          continue;
        }
      }
    }
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

      if (!networkSelected) return;

      const assetDataByAddress = rootGetters.assets.assetDataByAddress;
      const subBridgeHistory = new SubBridgeHistory();

      await subBridgeHistory.init(networkSelected as SubNetwork);

      if (clearHistory) {
        await subBridgeHistory.clearHistory(updateCallback);
      }

      await subBridgeHistory.updateAccountHistory(address, inProgressIds, assetDataByAddress, updateCallback);
    } catch (error) {
      console.error(error);
    }
  };
