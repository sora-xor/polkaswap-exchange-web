import { vuex } from '@soramitsu/soraneo-wallet-web';

import store from '@/store';

import { Modules } from './consts';

import type { StateDecorators, GettersDecorators, CommitDecorators, DispatchDecorators } from './types';

const { VuexOperation, createDecoratorsObject, attachDecorator } = vuex;

const state = {} as StateDecorators;
const getter = {} as GettersDecorators;
const mutation = {} as CommitDecorators;
const action = {} as DispatchDecorators;

(function initDecorators(): void {
  createDecoratorsObject(store.state, state, Modules, VuexOperation.State);
  createDecoratorsObject(store.getters, getter, Modules, VuexOperation.Getter);
  createDecoratorsObject(store.commit, mutation, Modules, VuexOperation.Mutation);
  createDecoratorsObject(store.dispatch, action, Modules, VuexOperation.Action);
})();
// Add Design System getters
getter.libraryDesignSystem = attachDecorator(VuexOperation.Getter, 'libraryDesignSystem');
getter.libraryTheme = attachDecorator(VuexOperation.Getter, 'libraryTheme');

export { state, getter, mutation, action };
