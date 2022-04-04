import store, { Modules } from '@/store';
import { vuex } from '@soramitsu/soraneo-wallet-web';

import type { StateDecorators, GettersDecorators, CommitDecorators, DispatchDecorators } from './types';

const state = {} as StateDecorators;
const getter = {} as GettersDecorators;
const mutation = {} as CommitDecorators;
const action = {} as DispatchDecorators;

const { VuexOperation, createDecoratorsObject } = vuex;

(function initDecorators(): void {
  createDecoratorsObject(store.state, state, Modules, VuexOperation.State);
  createDecoratorsObject(store.getters, getter, Modules, VuexOperation.Getter);
  createDecoratorsObject(store.commit, mutation, Modules, VuexOperation.Mutation);
  createDecoratorsObject(store.dispatch, action, Modules, VuexOperation.Action);
})();

export { state, getter, mutation, action };
