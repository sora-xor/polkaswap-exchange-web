import { IndexerType, Theme } from '../../consts';
import { ApiKeysObject, ConnectionStatus } from '../../types/common';

declare const actions: {
  setApiKeys(context: ActionContext<any, any>, keys: ApiKeysObject): Promise<void>;
  createNftStorageInstance(context: ActionContext<any, any>): Promise<void>;
  subscribeOnFeeMultiplierAndRuntime(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetFeeMultiplierAndRuntimeSubscriptions(context: ActionContext<any, any>): Promise<void>;
  subscribeOnBlockNumber(context: ActionContext<any, any>): Promise<void>;
  /** It's used **only** for subscriptions module */
  resetBlockNumberSubscription(context: ActionContext<any, any>): Promise<void>;
  selectIndexer(context: ActionContext<any, any>, indexerType?: IndexerType): Promise<void>;
  setIndexerStatus(
    context: ActionContext<any, any>,
    {
      indexer,
      status,
    }: {
      indexer: IndexerType;
      status: ConnectionStatus;
    }
  ): Promise<void>;
  subscribeOnExchangeRatesApi(context: ActionContext<any, any>): Promise<void>;
  setTheme(context: ActionContext<any, any>, theme: Theme): Promise<void>;
  toggleTheme(context: ActionContext<any, any>): Promise<void>;
};
export default actions;
