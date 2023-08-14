import { FPNumber, Operation } from '@sora-substrate/util';
import { BridgeTxStatus, BridgeTxDirection, BridgeNetworkType } from '@sora-substrate/util/build/bridgeProxy/consts';

import { ZeroStringValue } from '@/consts';
import { rootActionContext } from '@/store';
import {
  getBlockHash,
  getBlockEvents,
  getBlockExtrinsics,
  getBlockTimestamp,
  findUserTxIdInBlock,
  findEventInBlock,
} from '@/utils/bridge/common/utils';
import { subBridgeApi } from '@/utils/bridge/sub/api';
import { subConnector } from '@/utils/bridge/sub/classes/adapter';
import type { SubAdapter } from '@/utils/bridge/sub/classes/adapter';
import { getRelayChainBlockNumber } from '@/utils/bridge/sub/utils';

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

class SubBridgeHistory {
  private externalNetwork!: SubNetwork;
  private parachainNetwork!: SubNetwork;
  private externalNetworkAdapter!: SubAdapter;
  private parachainNetworkAdapter!: SubAdapter;
  private parachainId!: number;

  public async init(externalNetwork: SubNetwork): Promise<void> {
    this.externalNetwork = externalNetwork;
    this.parachainNetwork = subBridgeApi.getSoraParachain(this.externalNetwork);
    this.externalNetworkAdapter = subConnector.getAdapterForNetwork(this.externalNetwork);
    this.parachainNetworkAdapter = subConnector.getAdapterForNetwork(this.parachainNetwork);
    this.parachainId = subBridgeApi.parachainIds[this.parachainNetwork] as number;
  }

  get soraApi(): ApiPromise {
    return subBridgeApi.api;
  }

  get parachainApi(): ApiPromise {
    return this.parachainNetworkAdapter.api;
  }

  get externalApi(): ApiPromise {
    return this.externalNetworkAdapter.api;
  }

  private async connect() {
    await Promise.all([this.externalNetworkAdapter.connect(), this.parachainNetworkAdapter.connect()]);
  }

  public async clearHistory(updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs): Promise<void> {
    subBridgeApi.clearHistory();
    await updateCallback?.();
  }

  public async updateAccountHistory(
    address: string,
    networkFees: NetworkFeesObject,
    inProgressIds: Record<string, boolean>,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>,
    updateCallback?: FnWithoutArgs | AsyncFnWithoutArgs
  ): Promise<void> {
    try {
      const transactions = await subBridgeApi.getUserTransactions(address, this.externalNetwork);

      if (!transactions.length) return;

      const currentHistory = subBridgeApi.historyList as SubHistory[];

      for (const tx of transactions) {
        const id = tx.soraHash;
        const localHistoryItem = currentHistory.find((item) => item.hash === id);

        // don't restore transaction what is in process in app
        if ((localHistoryItem?.id as string) in inProgressIds) continue;
        if (hasFinishedState(localHistoryItem)) continue;

        await this.connect();

        const historyItemData = await this.txDataToHistory(tx, networkFees, assetDataByAddress);

        // update or create local history item
        if (localHistoryItem) {
          subBridgeApi.saveHistory({ ...localHistoryItem, ...historyItemData } as SubHistory);
        } else {
          subBridgeApi.generateHistoryItem(historyItemData);
        }

        await updateCallback?.();
      }
    } finally {
      this.externalNetworkAdapter.stop();
      this.parachainNetworkAdapter.stop();
    }
  }

  private async txDataToHistory(
    tx: BridgeTransactionData,
    networkFees: NetworkFeesObject,
    assetDataByAddress: (address?: Nullable<string>) => Nullable<RegisteredAccountAsset>
  ): Promise<SubHistory> {
    const id = tx.soraHash;
    const asset = assetDataByAddress(tx.soraAssetAddress);
    const amount = FPNumber.fromCodecValue(tx.amount, asset?.decimals).toString();
    const isOutgoing = tx.direction === BridgeTxDirection.Outgoing;
    const type = getType(isOutgoing);
    const [blockHeight, parachainBlockHeight] = getBlockHeights(isOutgoing, tx);
    const soraNetworkFee = networkFees[type] ?? ZeroStringValue;

    const history: SubHistory = {
      id,
      blockHeight,
      type,
      hash: id,
      transactionState: tx.status,
      parachainBlockHeight,
      externalNetwork: this.externalNetwork,
      externalNetworkType: BridgeNetworkType.Sub,
      amount,
      assetAddress: asset?.address,
      symbol: asset?.symbol,
      soraNetworkFee,
      from: tx.soraAccount,
    };

    const [blockId, parachainBlockId] = await Promise.all([
      getBlockHash(this.soraApi, blockHeight),
      getBlockHash(this.parachainApi, parachainBlockHeight),
    ]);

    history.blockId = blockId;
    history.parachainBlockId = parachainBlockId;

    const [txId, startTime, relayChainBlockNumber] = await Promise.all([
      findUserTxIdInBlock(this.soraApi, blockId, id, 'RequestStatusUpdate', 'bridgeProxy'),
      getBlockTimestamp(this.soraApi, blockId),
      getRelayChainBlockNumber(this.parachainApi, parachainBlockId),
    ]);

    history.txId = txId;
    history.startTime = history.endTime = startTime;

    if (isOutgoing) {
      await this.processOutgoingTxExternalData({ tx, parachainBlockId, relayChainBlockNumber, history, asset });
    } else {
      await this.processIncomingTxExternalData({ relayChainBlockNumber, history });
    }

    return history;
  }

  private async processOutgoingTxExternalData({
    tx,
    parachainBlockId,
    relayChainBlockNumber,
    history,
    asset,
  }: {
    tx: BridgeTransactionData;
    parachainBlockId: string;
    relayChainBlockNumber: number;
    history: SubHistory;
    asset: Nullable<RegisteredAccountAsset>;
  }): Promise<void> {
    const parachainEventData = await findEventInBlock({
      api: this.parachainApi,
      blockId: parachainBlockId,
      section: 'parachainSystem',
      method: 'UpwardMessageSent',
    });
    // sended parachain message hash
    const messageHash = parachainEventData[0].toString();
    // relay chain should have received message in this blocks range
    const startSearch = relayChainBlockNumber + 2;
    const endSearch = startSearch + 1;

    for (let n = startSearch; n <= endSearch; n++) {
      try {
        const blockId = await getBlockHash(this.externalApi, n);
        const events = await getBlockEvents(this.externalApi, blockId);

        const messageQueueEvent = events.find(
          ({ event }) =>
            event.section === 'messageQueue' && event.method === 'Processed' && event.data[0].toString() === messageHash
        );

        if (!messageQueueEvent) continue;

        const to = subBridgeApi.formatAddress(tx.externalAccount);
        // Native token for network
        const balancesDepositEvent = events.find(
          ({ event }) =>
            event.section === 'balances' &&
            event.method === 'Deposit' &&
            subBridgeApi.formatAddress(event.data.who.toString()) === to
        );
        const received = balancesDepositEvent.event.data.amount.toString();

        history.externalNetworkFee = ZeroStringValue;
        history.externalBlockId = blockId;
        history.externalBlockHeight = n;
        history.amount2 = FPNumber.fromCodecValue(received, asset?.externalDecimals).toString();
        history.to = to;
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
    const endSearch = startSearch - 2;

    for (let n = startSearch; n >= endSearch; n--) {
      const blockId = await getBlockHash(this.externalApi, n);
      const extrinsics = await getBlockExtrinsics(this.externalApi, blockId);

      for (const extrinsic of extrinsics) {
        try {
          if (!(extrinsic.method.section === 'xcmPallet' && extrinsic.method.method === 'reserveTransferAssets'))
            continue;

          const [dest, beneficiary] = extrinsic.args;
          const parachainId = (dest as any).asV3.interior.asX1.asParachain.toNumber();
          const accountId = (beneficiary as any).asV3.interior.asX1.asAccountId32.id.toString();
          const receiver = subBridgeApi.formatAddress(accountId);

          if (!(parachainId === this.parachainId && receiver === history.from)) continue;

          const feeData = await findEventInBlock({
            api: this.externalApi,
            blockId,
            section: 'transactionPayment',
            method: 'TransactionFeePaid',
          });

          history.externalNetworkFee = feeData[1].toString();
          history.externalBlockId = blockId;
          history.externalBlockHeight = n;
          history.to = subBridgeApi.formatAddress(extrinsic.signer.toString());
          break;
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
          settings: { networkFees },
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

      await subBridgeHistory.updateAccountHistory(
        address,
        networkFees,
        inProgressIds,
        assetDataByAddress,
        updateCallback
      );
    } catch (error) {
      console.error(error);
    }
  };
