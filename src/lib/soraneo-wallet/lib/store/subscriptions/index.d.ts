declare const subscriptions: {
  namespaced: true;
  state: import('./types').SubscriptionsState;
  mutations: {
    setSubscription(state: import('./types').SubscriptionsState, newSubscription: Nullable<VoidFunction>): void;
  };
  actions: {
    resetStorageUpdatesSubscription(context: ActionContext<any, any>): Promise<void>;
    subscribeToStorageUpdates(context: ActionContext<any, any>): Promise<void>;
    activateNetwokSubscriptions(context: ActionContext<any, any>): Promise<void>;
    resetNetworkSubscriptions(context: ActionContext<any, any>): Promise<void>;
    activateIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
    resetIndexerSubscriptions(context: ActionContext<any, any>): Promise<void>;
    activateInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
    resetInternalSubscriptions(context: ActionContext<any, any>): Promise<void>;
  };
};
declare const subscriptionsActionContextBroken: (context: any) => {
  rootState: never;
  rootGetters: never;
  rootCommit: never;
  rootDispatch: never;
  state: {
    readonly storageUpdatesSubscription: Nullable<VoidFunction>;
  };
  getters: {};
  commit: {
    setSubscription: (payload?: Nullable<VoidFunction>) => void;
  };
  dispatch: {
    resetStorageUpdatesSubscription: () => Promise<void>;
    subscribeToStorageUpdates: () => Promise<void>;
    activateNetwokSubscriptions: () => Promise<void>;
    resetNetworkSubscriptions: () => Promise<void>;
    activateIndexerSubscriptions: () => Promise<void>;
    resetIndexerSubscriptions: () => Promise<void>;
    activateInternalSubscriptions: () => Promise<void>;
    resetInternalSubscriptions: () => Promise<void>;
  };
};
declare const subscriptionsActionContext: typeof subscriptionsActionContextBroken;
export { subscriptionsActionContext };
export default subscriptions;
