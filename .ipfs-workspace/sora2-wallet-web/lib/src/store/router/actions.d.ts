declare const actions: {
  back(context: import('vuex').ActionContext<any, any>): Promise<void>;
  checkCurrentRoute(context: import('vuex').ActionContext<any, any>): Promise<void>;
};
export default actions;
