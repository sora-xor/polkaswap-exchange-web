import type { ExternalHistoryParams } from '../../types/history';
import type { ActionContext } from 'vuex';
declare const actions: {
  subscribeOnExternalHistory(context: ActionContext<any, any>): Promise<void>;
  /**
   * Get history items from explorer, already filtered
   */
  getExternalHistory(
    context: ActionContext<any, any>,
    { address, assetAddress, pageAmount, page, query }?: ExternalHistoryParams
  ): Promise<void>;
  /**
   * Should be used once in a root of the project
   */
  trackActiveTxs(context: ActionContext<any, any>): Promise<void>;
  trackPendingMstTxs(context: ActionContext<any, any>): Promise<void>;
  resetPendingMstTxsSubscription(context: ActionContext<any, any>): void;
  /** It's used **only** for subscriptions module */
  getAccountHistory(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetActiveTxs(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetExternalHistorySubscription(context: ActionContext<any, any>): Promise<void>;
};
export default actions;
