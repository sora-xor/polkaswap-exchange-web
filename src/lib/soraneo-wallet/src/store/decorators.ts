import { getWalletStore } from './instance';

import { VuexOperation, createDecoratorsObject, attachDecorator } from './util';
import { WalletModules } from './wallet';

import type {
  WalletCommitDecorators,
  WalletDispatchDecorators,
  WalletGettersDecorators,
  WalletStateDecorators,
} from './types';
import type { VueDecorator } from 'vue-class-component';

const walletState = {} as WalletStateDecorators;
const walletGetter = {} as WalletGettersDecorators;
const walletMutation = {} as WalletCommitDecorators;
const walletAction = {} as WalletDispatchDecorators;

(function initWalletDecorators(): void {
  const store = getWalletStore();
  createDecoratorsObject(store.state, walletState, WalletModules, VuexOperation.State);
  createDecoratorsObject(store.getters, walletGetter, WalletModules, VuexOperation.Getter);
  createDecoratorsObject(store.commit, walletMutation, WalletModules, VuexOperation.Mutation);
  createDecoratorsObject(store.dispatch, walletAction, WalletModules, VuexOperation.Action);
})();

const state = walletState.wallet;
const getter = walletGetter.wallet as typeof walletGetter.wallet & {
  libraryDesignSystem: VueDecorator;
  libraryTheme: VueDecorator;
};
const mutation = walletMutation.wallet;
const action = walletAction.wallet;

// Add Design System getters
getter.libraryDesignSystem = attachDecorator(VuexOperation.Getter, 'libraryDesignSystem', 'wallet/settings');
getter.libraryTheme = attachDecorator(VuexOperation.Getter, 'libraryTheme', 'wallet/settings');

export { state, getter, mutation, action };
