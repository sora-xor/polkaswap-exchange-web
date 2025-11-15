import { defineActions } from 'direct-vuex';
import debounce from 'lodash/fp/debounce';

import { subscriptionsActionContext } from './../subscriptions';

import type { ActionContext } from 'vuex';

const dispatchRoot = (context: ActionContext<any, any>, type: string, payload?: unknown) =>
  context.dispatch(type, payload, { root: true });

const runParallel = async (context: ActionContext<any, any>, actionTypes: Array<string>): Promise<void> => {
  await Promise.all(actionTypes.map((value) => dispatchRoot(context, `wallet/${value}`)));
};

const actions = defineActions({
  async resetStorageUpdatesSubscription(context): Promise<void> {
    const { state, commit } = subscriptionsActionContext(context);
    if (state.storageUpdatesSubscription) {
      window.removeEventListener('storage', state.storageUpdatesSubscription);
      commit.setSubscription(null);
    }
  },
  async subscribeToStorageUpdates(context): Promise<void> {
    const { state, commit, dispatch } = subscriptionsActionContext(context);
    await dispatch.resetStorageUpdatesSubscription();

    commit.setSubscription(
      debounce(100)(() => {
        dispatchRoot(context, 'wallet/account/syncWithStorage');
        dispatchRoot(context, 'wallet/transactions/getAccountHistory');
      })
    );

    window.addEventListener('storage', state.storageUpdatesSubscription as VoidFunction);
  },
  // Subscriptions dependent on chain state
  async activateNetwokSubscriptions(context): Promise<void> {
    await runParallel(context, [
      'settings/subscribeOnBlockNumber',
      'settings/subscribeOnFeeMultiplierAndRuntime',
      'account/subscribeOnAssets',
      'account/subscribeOnAccountAssets',
    ]);
  },
  async resetNetworkSubscriptions(context): Promise<void> {
    await runParallel(context, [
      'settings/resetBlockNumberSubscription',
      'settings/resetFeeMultiplierAndRuntimeSubscriptions',
      'account/resetAssetsSubscription',
      'account/resetAccountAssetsSubscription',
    ]);
  },
  // subscriptions on indexer data
  async activateIndexerSubscriptions(context): Promise<void> {
    await runParallel(context, ['account/subscribeOnFiatPrice', 'transactions/subscribeOnExternalHistory']);
  },
  async resetIndexerSubscriptions(context): Promise<void> {
    await runParallel(context, ['account/resetFiatPriceSubscription', 'transactions/resetExternalHistorySubscription']);
  },
  // Internal subscriptions & timers
  async activateInternalSubscriptions(context): Promise<void> {
    await runParallel(context, [
      'transactions/trackActiveTxs',
      'transactions/trackPendingMstTxs',
      'account/subscribeOnAlerts',
      'subscriptions/subscribeToStorageUpdates',
    ]);
  },
  async resetInternalSubscriptions(context): Promise<void> {
    await runParallel(context, [
      'transactions/resetActiveTxs',
      'transactions/resetPendingMstTxsSubscription',
      'account/resetAlertsSubscription',
      'subscriptions/resetStorageUpdatesSubscription',
    ]);
  },
});

export default actions;
