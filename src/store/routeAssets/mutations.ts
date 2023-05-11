import { defineMutations } from 'direct-vuex';

import type { RouteAssetsState, Recipient, TransactionInfo, RouteAssetsSubscription } from './types';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type { PrimaryMarketsEnabledAssets } from '@sora-substrate/liquidity-proxy/build/types';

const mutations = defineMutations<RouteAssetsState>()({
  setData(state, { file, recipients }: { file: File; recipients: Array<Recipient> }): void {
    state.file = file;
    state.recipients = recipients;
  },
  clearData(state) {
    state.file = null;
    state.recipients = [];
    state.processingState.currentStageIndex = 0;
    state.processingState.inputToken = XOR;
    state.processingState.txInfo = undefined;
    state.processingState.datetime = undefined;
  },
  setSubscriptions(state, subscriptions: Array<RouteAssetsSubscription> = []): void {
    state.subscriptions = subscriptions;
  },
  addSubscription(state, subscription: RouteAssetsSubscription): void {
    state.subscriptions.push(subscription);
  },
  addSubscribeObjectToSubscription(state, { reservesSubscribe, outputAssetId }) {
    const subscription = state.subscriptions.find((item) => item.assetAddress === outputAssetId);
    if (subscription) {
      subscription.liquidityReservesSubscription = reservesSubscribe;
    }
  },
  addPathsAndPayloadToSubscription(state, { outputAssetId, paths, payload, dexId, liquiditySources }): void {
    const subscription = state.subscriptions.find((item) => item.assetAddress === outputAssetId);
    if (subscription) {
      subscription.paths = paths;
      subscription.liquiditySources = liquiditySources;
      subscription.payload = payload;
      subscription.dexId = dexId;
      subscription.dexQuoteData = {
        ...subscription.dexQuoteData,
        [dexId]: Object.freeze({
          payload,
          paths,
          pairLiquiditySources: liquiditySources,
        }),
      };
    }
  },
  setEnabledAssetsSubscription(state, subscription): void {
    state.enabledAssetsSubscription = subscription;
  },
  cleanEnabledAssetsSubscription(state) {
    state.enabledAssetsSubscription?.unsubscribe();
    state.enabledAssetsSubscription = null;
  },
  setRecipientStatus(state, { id, status }) {
    const recipient = state.recipients.find((recipient) => recipient.id === id);
    if (recipient) recipient.status = status;
  },
  setRecipientTxId(state, { id, txId }) {
    const recipient = state.recipients.find((recipient) => recipient.id === id);
    if (recipient) recipient.txId = txId;
  },
  setRecipientCompleted(state, id) {
    const recipient = state.recipients.find((recipient) => recipient.id === id);
    if (recipient) recipient.isCompleted = true;
  },
  setRecipientTokenAmount(state, { id, amount }) {
    const recipient = state.recipients.find((recipient) => recipient.id === id);
    if (recipient) {
      recipient.amount = amount;
    }
  },
  setRecipientExchangeRate(state, { id, rate }) {
    const recipient = state.recipients.find((recipient) => recipient.id === id);
    if (recipient) {
      recipient.exchangeRate = rate;
    }
  },
  setInputToken(state, asset) {
    state.processingState.inputToken = asset;
  },
  editRecipient(state, { id, name, wallet, usd, amount, asset }) {
    const recipient = state.recipients.find((recipient) => recipient.id === id);
    if (recipient) {
      recipient.name = name;
      recipient.wallet = wallet;
      recipient.usd = usd;
      recipient.amount = amount;
      recipient.asset = asset;
    }
  },
  deleteRecipient(state, id) {
    const idx = state.recipients.findIndex((item) => item.id === id);
    state.recipients.splice(idx, 1);
  },
  setCurrentStageIndex(state, index) {
    state.processingState.currentStageIndex = index;
  },
  progressCurrentStageIndex(state, delta) {
    const newIndex = state.processingState.currentStageIndex + delta;
    state.processingState.currentStageIndex = newIndex < 0 ? 0 : newIndex;
  },
  setTokensRouted(state, tokens) {
    state.processingState.tokensRouted = tokens.maps((token) => ({ token, amount: 0 }));
  },
  setTxInfo(state, txInfo: TransactionInfo) {
    state.processingState.txInfo = txInfo;
  },
  setTxDatetime(state, date: Date) {
    state.processingState.datetime = date;
  },
  setPrimaryMarketsEnabledAssets(state, assets: PrimaryMarketsEnabledAssets): void {
    state.enabledAssets = Object.freeze({ ...assets });
  },
});

export default mutations;
