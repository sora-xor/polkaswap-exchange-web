declare const router: {
  namespaced: true;
  state: import('./types').RouterState;
  mutations: {
    navigate(state: import('./types').RouterState, params: import('./types').Route): void;
  };
  actions: {
    back(context: import('vuex').ActionContext<any, any>): Promise<void>;
    checkCurrentRoute(context: import('vuex').ActionContext<any, any>): Promise<void>;
  };
};
declare const routerActionContextBroken: (context: any) => {
  rootState: never;
  rootGetters: never;
  rootCommit: never;
  rootDispatch: never;
  state: {
    readonly currentRoute: import('../../consts').RouteNames;
    readonly currentRouteParams: Record<string, unknown>;
    readonly previousRoute: import('../../consts').RouteNames | '';
    readonly previousRouteParams: Record<string, unknown>;
  };
  getters: {};
  commit: {
    navigate: (payload: import('./types').Route) => void;
  };
  dispatch: {
    back: () => Promise<void>;
    checkCurrentRoute: () => Promise<void>;
  };
};
declare const routerActionContext: typeof routerActionContextBroken;
export { routerActionContext };
export default router;
