declare const actions: {
  resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
  subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
  activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
  resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
  activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
  resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
  activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
  resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
};
export default actions;
