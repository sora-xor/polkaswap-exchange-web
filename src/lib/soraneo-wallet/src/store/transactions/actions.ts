import { Operation } from '@sora-substrate/sdk';
import { defineActions } from 'direct-vuex';
import omit from 'lodash/fp/omit';

import { api } from '../../api';
import { accountIdBasedOperations } from '../../consts';
import { getCurrentIndexer } from '../../services/indexer';

import { transactionsActionContext } from './../transactions';

import type { HistoryElement } from '../../services/indexer/types';
import type { ExternalHistoryParams } from '../../types/history';
import type { WhitelistArrayItem } from '@sora-substrate/sdk/build/assets/types';
import type { ActionContext } from 'vuex';

const UPDATE_ACTIVE_TRANSACTIONS_INTERVAL = 2_000;

const getRootState = (context: ActionContext<any, any>) => context.rootState as any;
const getRootGetters = (context: ActionContext<any, any>) => context.rootGetters as any;
const commitRoot = (context: ActionContext<any, any>, type: string, payload?: unknown) =>
  context.commit(type, payload, { root: true });

async function parseHistoryUpdate(context: ActionContext<any, any>, transaction: HistoryElement): Promise<void> {
  const { commit, state } = transactionsActionContext(context);
  const rootState = getRootState(context);
  const rootGetters = getRootGetters(context);
  const { account, whitelist } = rootGetters.wallet.account;

  const indexer = getCurrentIndexer();
  const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(transaction);

  if (!historyItem?.id) return;
  // Don't handle bridge operations
  if ([Operation.EthBridgeIncoming, Operation.EthBridgeOutgoing].includes(historyItem.type)) return;

  // remove history from local storage
  if (historyItem.id in api.history) {
    commit.removeHistoryByIds([historyItem.id]);
    // Update local history - this will remove deleted element from ui
    commit.getHistory();
  }

  // add to external history updates
  if (state.saveExternalHistoryUpdates && !(historyItem.id in state.externalHistory)) {
    commit.setExternalHistoryUpdates({ ...state.externalHistoryUpdates, [historyItem.id]: historyItem });
  }

  // Handle incoming Transfer operations
  if (accountIdBasedOperations.includes(historyItem.type) && historyItem.to === account.address) {
    const asset = whitelist[historyItem.assetAddress as string];

    if (asset && rootState.wallet.settings.allowTopUpAlert) {
      commitRoot(context, 'wallet/account/setAssetToNotify', asset as WhitelistArrayItem);
    }
  }
}

const actions = defineActions({
  async subscribeOnExternalHistory(context): Promise<void> {
    const { commit } = transactionsActionContext(context);
    const { isLoggedIn, account } = getRootGetters(context).wallet.account;

    commit.resetExternalHistorySubscription();

    if (!isLoggedIn) return;

    try {
      const indexer = getCurrentIndexer();
      const subscription = indexer.services.explorer.account.createHistorySubscription(
        account.address,
        async (transaction) => {
          await parseHistoryUpdate(context, transaction);
        }
      );
      commit.setExternalHistorySubscription(subscription);
    } catch (error) {
      console.error(error);
    }
  },

  /**
   * Get history items from explorer, already filtered
   */
  async getExternalHistory(
    context,
    { address = '', assetAddress = '', pageAmount = 8, page = 1, query = {} }: ExternalHistoryParams = {}
  ): Promise<void> {
    const { state, commit } = transactionsActionContext(context);
    const { externalHistory, externalHistoryUpdates } = state;

    const indexer = getCurrentIndexer();
    const operations = indexer.services.dataParser.supportedOperations;
    const filter = indexer.historyElementsFilter({
      address,
      assetAddress,
      operations,
      query,
    });

    const variables = {
      filter,
      first: pageAmount,
      offset: pageAmount * (page - 1),
    };

    try {
      const response = await indexer.services.explorer.account.getHistory(variables);

      if (!response) return;

      const { nodes, totalCount } = response;
      const buffer = {};
      const removeInternalIds: Array<string> = [];
      const removeExternalUpdatesIds: Array<string> = [];

      if (nodes.length) {
        for (const transaction of nodes) {
          const { id } = transaction;

          if (!(id in externalHistory)) {
            const historyItem = await indexer.services.dataParser.parseTransactionAsHistoryItem(transaction as any); // TODO: remove any type

            if (historyItem) {
              buffer[id] = historyItem;

              if (id in api.history) {
                removeInternalIds.push(id);
              }

              if (id in externalHistoryUpdates) {
                removeExternalUpdatesIds.push(id);
              }
            }
          }
        }
      }

      if (removeInternalIds.length) {
        commit.removeHistoryByIds(removeInternalIds);
      }

      if (removeExternalUpdatesIds.length) {
        commit.setExternalHistoryUpdates(omit(removeExternalUpdatesIds, externalHistoryUpdates));
      }

      commit.setExternalHistory({ ...externalHistory, ...buffer });
      commit.setExternalHistoryTotal(totalCount);
    } catch (error) {
      console.error(error);
    }
  },
  /**
   * Should be used once in a root of the project
   */
  async trackActiveTxs(context): Promise<void> {
    const { commit, state } = transactionsActionContext(context);
    commit.resetActiveTxs();

    const updateActiveTxsId = setInterval(() => {
      if (state.activeTxsIds.length) {
        commit.getHistory();
      }
    }, UPDATE_ACTIVE_TRANSACTIONS_INTERVAL);

    commit.setActiveTxsSubscription(updateActiveTxsId);
  },

  // transactions/actions.ts
  async trackPendingMstTxs(context): Promise<void> {
    const { commit } = transactionsActionContext(context);
    const { account } = getRootGetters(context).wallet.account;
    commit.resetPendingMstTxsSubscription();
    if (!api.mst.isMstAddressExist || !account.address) {
      return;
    }
    try {
      const mstAddress = api.mst.getMstAddress();
      await api.mst.startPendingTxsSubscription(mstAddress);
      console.info('we are in try');
      const subscription = api.mst.pendingTxsUpdated.subscribe((pendingTxs) => {
        console.info('pending trxs are', pendingTxs);
        if (pendingTxs && pendingTxs.length > 0) {
          let userAddress: string | undefined;
          if (api.mst.isMST()) {
            console.info('we are in mst');
            userAddress = api.formatAddress(api.mst.getPrevoiusAccount());
          } else {
            console.info('we are not in mst');
            userAddress = account.address;
          }
          console.info('here is userAddress', userAddress);
          // TODO fix later this as any
          const pendingApprovalTxs = pendingTxs.filter((tx) => {
            const multisig = (tx as { multisig: any }).multisig;
            if (!multisig) {
              return false;
            }
            const userHasApproved = multisig.walletsApproved.includes(userAddress);
            return !userHasApproved;
          });

          commit.setPendingMstTransactions(pendingApprovalTxs);
          console.info('pendingApprovalTxs', pendingApprovalTxs);
        } else {
          commit.setPendingMstTransactions([]);
        }
        commit.getHistory();
      });
      commit.setPendingMstTxsSubscription(subscription);
    } catch (error) {
      console.error('Error starting MST pending transactions subscription:', error);
    }
  },

  resetPendingMstTxsSubscription(context): void {
    const { state, commit } = transactionsActionContext(context);
    if (state.pendingMstTxsSubscription) {
      state.pendingMstTxsSubscription.unsubscribe();
      commit.setPendingMstTxsSubscription(null);
    }
    api.mst.stopPendingTxsSubscription();
  },

  /** It's used **only** for subscriptions module */
  async getAccountHistory(context): Promise<void> {
    const { commit } = transactionsActionContext(context);
    commit.getHistory();
  },
  /** It's used **only** for subscriptions module */
  async resetActiveTxs(context): Promise<void> {
    const { commit } = transactionsActionContext(context);
    commit.resetActiveTxs();
  },
  /** It's used **only** for subscriptions module */
  async resetExternalHistorySubscription(context): Promise<void> {
    const { commit } = transactionsActionContext(context);
    commit.resetExternalHistorySubscription();
  },
});

export default actions;
