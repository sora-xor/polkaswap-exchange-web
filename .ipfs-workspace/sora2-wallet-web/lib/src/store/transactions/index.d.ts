declare const transactions: {
  namespaced: true;
  state: import('./types').TransactionsState;
  mutations: {
    setActiveTxsSubscription(state: import('./types').TransactionsState, subscription: NodeJS.Timeout | number): void;
    resetActiveTxs(state: import('./types').TransactionsState): void;
    addActiveTx(state: import('./types').TransactionsState, id: string): void;
    removeActiveTxs(state: import('./types').TransactionsState, ids: Array<string>): void;
    removeHistoryByIds(state: import('./types').TransactionsState, ids: Array<string>): void;
    setTxDetailsId(state: import('./types').TransactionsState, id: string): void;
    resetTxDetailsId(state: import('./types').TransactionsState): void;
    getHistory(state: import('./types').TransactionsState): Promise<void>;
    setExternalHistory(
      state: import('./types').TransactionsState,
      history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
    ): void;
    setExternalHistoryUpdates(
      state: import('./types').TransactionsState,
      history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
    ): void;
    saveExternalHistoryUpdates(state: import('./types').TransactionsState, flag: boolean): void;
    setExternalHistoryTotal(state: import('./types').TransactionsState, total?: any): void;
    resetExternalHistory(state: import('./types').TransactionsState): void;
    setExternalHistorySubscription(state: import('./types').TransactionsState, subscription: VoidFunction): void;
    resetExternalHistorySubscription(state: import('./types').TransactionsState): void;
    setConfirmTxDialogDisabled(state: import('./types').TransactionsState, flag: boolean): void;
    setSignTxDialogDisabled(state: import('./types').TransactionsState, flag: boolean): void;
    setSignTxDialogVisibility(state: import('./types').TransactionsState, visibility: boolean): void;
    setPendingMstTxsSubscription(
      state: import('./types').TransactionsState,
      subscription: import('rxjs').Subscription | null
    ): void;
    resetPendingMstTxsSubscription(state: import('./types').TransactionsState): void;
    setPendingMstTransactions(
      state: import('./types').TransactionsState,
      transactions: import('@sora-substrate/sdk').HistoryItem[]
    ): void;
  };
  actions: {
    subscribeOnExternalHistory(context: import('vuex').ActionContext<any, any>): Promise<void>;
    getExternalHistory(
      context: import('vuex').ActionContext<any, any>,
      { address, assetAddress, pageAmount, page, query }?: import('../../types/history').ExternalHistoryParams
    ): Promise<void>;
    trackActiveTxs(context: import('vuex').ActionContext<any, any>): Promise<void>;
    trackPendingMstTxs(context: import('vuex').ActionContext<any, any>): Promise<void>;
    resetPendingMstTxsSubscription(context: import('vuex').ActionContext<any, any>): void;
    getAccountHistory(context: import('vuex').ActionContext<any, any>): Promise<void>;
    resetActiveTxs(context: import('vuex').ActionContext<any, any>): Promise<void>;
    resetExternalHistorySubscription(context: import('vuex').ActionContext<any, any>): Promise<void>;
  };
  getters: {
    activeTxs(
      state: import('./types').TransactionsState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): Array<import('@sora-substrate/sdk').HistoryItem>;
    firstReadyTx(
      state: import('./types').TransactionsState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
    selectedTx(
      state: import('./types').TransactionsState,
      getters: any,
      rootState: any,
      rootGetters: any
    ): Nullable<import('@sora-substrate/sdk').HistoryItem>;
  };
};
declare const transactionsGetterContext: (args: [any, any, any, any]) => {
  rootState: never;
  rootGetters: never;
  state: {
    readonly history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>;
    readonly externalHistory: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>;
    readonly externalHistoryUpdates: import('@sora-substrate/sdk').AccountHistory<
      import('@sora-substrate/sdk').HistoryItem
    >;
    readonly saveExternalHistoryUpdates: boolean;
    readonly externalHistoryTotal: number;
    readonly externalHistorySubscription: Nullable<VoidFunction>;
    readonly activeTxsIds: Array<string>;
    readonly updateActiveTxsId: Nullable<NodeJS.Timeout | number>;
    readonly selectedTxId: Nullable<string>;
    readonly isConfirmTxDialogDisabled: boolean;
    readonly isSignTxDialogDisabled: boolean;
    readonly isSignTxDialogVisible: boolean;
    readonly pendingMstTxsSubscription: Nullable<import('rxjs').Subscription>;
    readonly pendingMstTransactions: import('@sora-substrate/sdk').HistoryItem[];
  };
  getters: {
    readonly activeTxs: readonly import('@sora-substrate/sdk').HistoryItem[];
    readonly firstReadyTx: Readonly<Nullable<import('@sora-substrate/sdk').HistoryItem>>;
    readonly selectedTx: Readonly<Nullable<import('@sora-substrate/sdk').HistoryItem>>;
  };
};
declare const transactionsActionContextBroken: (context: any) => {
  rootState: never;
  rootGetters: never;
  rootCommit: never;
  rootDispatch: never;
  state: {
    readonly history: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>;
    readonly externalHistory: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>;
    readonly externalHistoryUpdates: import('@sora-substrate/sdk').AccountHistory<
      import('@sora-substrate/sdk').HistoryItem
    >;
    readonly saveExternalHistoryUpdates: boolean;
    readonly externalHistoryTotal: number;
    readonly externalHistorySubscription: Nullable<VoidFunction>;
    readonly activeTxsIds: Array<string>;
    readonly updateActiveTxsId: Nullable<NodeJS.Timeout | number>;
    readonly selectedTxId: Nullable<string>;
    readonly isConfirmTxDialogDisabled: boolean;
    readonly isSignTxDialogDisabled: boolean;
    readonly isSignTxDialogVisible: boolean;
    readonly pendingMstTxsSubscription: Nullable<import('rxjs').Subscription>;
    readonly pendingMstTransactions: import('@sora-substrate/sdk').HistoryItem[];
  };
  getters: {
    readonly activeTxs: readonly import('@sora-substrate/sdk').HistoryItem[];
    readonly firstReadyTx: Readonly<Nullable<import('@sora-substrate/sdk').HistoryItem>>;
    readonly selectedTx: Readonly<Nullable<import('@sora-substrate/sdk').HistoryItem>>;
  };
  commit: {
    setActiveTxsSubscription: (payload: number | NodeJS.Timeout) => void;
    resetActiveTxs: () => void;
    addActiveTx: (payload: string) => void;
    removeActiveTxs: (payload: string[]) => void;
    removeHistoryByIds: (payload: string[]) => void;
    setTxDetailsId: (payload: string) => void;
    resetTxDetailsId: () => void;
    getHistory: () => void;
    setExternalHistory: (
      payload: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
    ) => void;
    setExternalHistoryUpdates: (
      payload: import('@sora-substrate/sdk').AccountHistory<import('@sora-substrate/sdk').HistoryItem>
    ) => void;
    saveExternalHistoryUpdates: (payload: boolean) => void;
    setExternalHistoryTotal: (() => void) | ((payload: any) => void) | ((payload?: any) => void);
    resetExternalHistory: () => void;
    setExternalHistorySubscription: (payload: VoidFunction) => void;
    resetExternalHistorySubscription: () => void;
    setConfirmTxDialogDisabled: (payload: boolean) => void;
    setSignTxDialogDisabled: (payload: boolean) => void;
    setSignTxDialogVisibility: (payload: boolean) => void;
    setPendingMstTxsSubscription: (payload: import('rxjs').Subscription | null) => void;
    resetPendingMstTxsSubscription: () => void;
    setPendingMstTransactions: (payload: import('@sora-substrate/sdk').HistoryItem[]) => void;
  };
  dispatch: {
    subscribeOnExternalHistory: () => Promise<void>;
    getExternalHistory: (payload?: import('../../types/history').ExternalHistoryParams | undefined) => Promise<void>;
    trackActiveTxs: () => Promise<void>;
    trackPendingMstTxs: () => Promise<void>;
    resetPendingMstTxsSubscription: () => Promise<void>;
    getAccountHistory: () => Promise<void>;
    resetActiveTxs: () => Promise<void>;
    resetExternalHistorySubscription: () => Promise<void>;
  };
};
declare const transactionsActionContext: typeof transactionsActionContextBroken;
export { transactionsGetterContext, transactionsActionContext };
export default transactions;
