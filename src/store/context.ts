import type { ActionContext } from 'vuex';

import { Module } from './consts';
import { requireLegacyStore } from '@/utils/legacy-store';

type GetterFactory = (args: [any, any, any, any], module: Module, definition: unknown) => any;
type ActionFactory = (context: ActionContext<any, any>, module: Module, definition: unknown) => any;

let rootGetterFactory: GetterFactory | null = null;
let rootActionFactory: ActionFactory | null = null;

/**
 * Ensure Vuex root state always exposes wallet/web3 data even when only the legacy
 * store has them (e.g., Pinia-first boot where Vuex modules aren't initialised).
 */
const resolveRootState = (rootState: Record<string, unknown> | undefined) => {
  const next = { ...(rootState ?? {}) } as Record<string, unknown>;

  if (!next.wallet) {
    const legacyStore = requireLegacyStore();

    if (legacyStore?.state?.wallet) {
      next.wallet = legacyStore.state.wallet;
    }
  }

  if (!next.web3) {
    const legacyStore = requireLegacyStore();
    next.web3 = legacyStore?.state?.web3 ?? {};
  }

  return next;
};

/**
 * Registers the root getter/action context factories from direct-vuex so that
 * individual module files can obtain local contexts without importing the store directly.
 */
export const setStoreContext = (actionFactory: ActionFactory, getterFactory: GetterFactory): void => {
  rootActionFactory = actionFactory;
  rootGetterFactory = getterFactory;
};

/**
 * Wraps the getter factory so Vuex modules can resolve a stable root state shape.
 */
export const localGetterContext = (args: [any, any, any, any], module: Module, definition: unknown): any => {
  if (!rootGetterFactory) {
    throw new Error('Getter context has not been initialised');
  }
  const patchedArgs = [...args] as [any, any, any, any];
  patchedArgs[2] = resolveRootState(args[2]);

  return rootGetterFactory(patchedArgs, module, definition);
};

/**
 * Wraps the action context to attach a patched root state for legacy consumers.
 */
export const localActionContext = (context: ActionContext<any, any>, module: Module, definition: unknown): any => {
  if (!rootActionFactory) {
    throw new Error('Action context has not been initialised');
  }
  const rootState = resolveRootState(context.rootState as any);
  const patchedContext =
    rootState !== context.rootState ? ({ ...context, rootState } as ActionContext<any, any>) : context;

  return rootActionFactory(patchedContext, module, definition);
};
