import { defineGetters } from 'direct-vuex';

import { routeAssetsGetterContext } from '@/store/routeAssets';
import type { Recipient, RouteAssetsState, RouteAssetsSubscription, TransactionInfo } from './types';
import { api } from '@soramitsu/soraneo-wallet-web';
import state from './state';
import { Stages } from '@/modules/ADAR/consts';
import type { Asset } from '@sora-substrate/util/build/assets/types';
import { Subscription } from 'rxjs';

const getters = defineGetters<RouteAssetsState>()({
  recipients(...args): Array<Recipient> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients;
  },
  validRecipients(...args): Array<Recipient> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients.filter((recipient) => api.validateAddress(recipient.wallet));
  },
  completedRecipients(...args): Array<Recipient> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients.filter((recipient) => recipient.isCompleted);
  },
  incompletedRecipients(...args): Array<Recipient> {
    const { state } = routeAssetsGetterContext(args);
    return state.recipients.filter((recipient) => !recipient.isCompleted);
  },
  subscriptions(...args): Array<RouteAssetsSubscription> {
    const { state } = routeAssetsGetterContext(args);
    return state.subscriptions;
  },
  enabledAssetsSubscription(...args): Nullable<Subscription> {
    const { state } = routeAssetsGetterContext(args);
    return state.enabledAssetsSubscription;
  },
  isDataExisting(): boolean {
    return state.recipients.length > 0;
  },
  currentStageIndex(): number {
    return state.processingState.currentStageIndex;
  },
  currentStageComponentName(): string {
    return Stages[state.processingState.currentStageIndex].component;
  },
  currentStageComponentTitle(): string {
    return Stages[state.processingState.currentStageIndex].title;
  },
  file(): Nullable<File> {
    return state.file;
  },
  inputToken(): any {
    return state.processingState.inputToken;
  },
  recipientsTokens(...args): Asset[] {
    const { getters, rootGetters } = routeAssetsGetterContext(args);
    const assetsTable = rootGetters.assets.assetsDataTable;
    const addressSet = [...new Set<string>(getters.recipients.map((item) => item.asset.address))];
    return addressSet.map((item) => assetsTable[item]);
  },
  isProcessed(...args) {
    return false;
  },
  batchTxInfo(...args): Nullable<TransactionInfo> {
    const { state } = routeAssetsGetterContext(args);
    return state.processingState.txInfo;
  },
  batchTxDatetime(...args): Nullable<Date> {
    const { state } = routeAssetsGetterContext(args);
    return state.processingState.datetime;
  },
});

export default getters;
