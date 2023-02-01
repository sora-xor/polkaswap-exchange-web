import { defineMutations } from 'direct-vuex';

import type { RouteAssetsState, Recipient } from './types';
import { XOR } from '@sora-substrate/util/build/assets/consts';
import type {
  QuotePaths,
  PrimaryMarketsEnabledAssets,
  QuotePayload,
  LPRewardsInfo,
} from '@sora-substrate/liquidity-proxy/build/types';

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
  },
  setSubscriptions(state, subscriptions = []): void {
    state.subscriptions = subscriptions;
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
  setPrimaryMarketsEnabledAssets(state, assets: PrimaryMarketsEnabledAssets): void {
    state.enabledAssets = Object.freeze({ ...assets });
  },
});

export default mutations;
