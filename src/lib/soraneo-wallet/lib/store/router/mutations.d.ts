import { Route, RouterState } from './types';

declare const mutations: {
  navigate(state: RouterState, params: Route): void;
};
export default mutations;
