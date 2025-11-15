declare const actions: {
  back(context: ActionContext<any, any>): Promise<void>;
  checkCurrentRoute(context: ActionContext<any, any>): Promise<void>;
};
export default actions;
