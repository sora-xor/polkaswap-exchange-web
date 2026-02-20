import type { ActionContext } from 'vuex';

import { Module } from './consts';
import { requireLegacyStore } from '@/utils/legacy-store';

type GetterFactory = (args: [any, any, any, any], module: Module, definition: unknown) => any;
type ActionFactory = (context: ActionContext<any, any>, module: Module, definition: unknown) => any;

let rootGetterFactory: GetterFactory | null = null;
let rootActionFactory: ActionFactory | null = null;

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord => {
  return Boolean(value) && typeof value === 'object';
};

const ensureLegacyDirectContext = (
  context: AnyRecord,
  base: ActionContext<any, any>,
  definition: unknown
): AnyRecord => {
  if (!isRecord(context)) return context;

  const commitFn = base?.commit;
  const dispatchFn = base?.dispatch;

  const moduleDef = definition as AnyRecord;
  const mutations = moduleDef?.mutations;
  const actions = moduleDef?.actions;

  if (typeof commitFn === 'function' && isRecord(mutations)) {
    const commitTarget = (context as AnyRecord).commit as unknown;
    if ((typeof commitTarget === 'function' || isRecord(commitTarget)) && commitTarget) {
      for (const type of Object.keys(mutations)) {
        if (typeof (commitTarget as AnyRecord)[type] === 'function') continue;
        try {
          (commitTarget as AnyRecord)[type] = (payload?: unknown) => commitFn(type, payload as never);
        } catch {
          // Ignore frozen/proxied commit targets; callers may still use Vuex commit directly.
        }
      }
    }
  }

  if (typeof dispatchFn === 'function' && isRecord(actions)) {
    const dispatchTarget = (context as AnyRecord).dispatch as unknown;
    if ((typeof dispatchTarget === 'function' || isRecord(dispatchTarget)) && dispatchTarget) {
      for (const type of Object.keys(actions)) {
        if (typeof (dispatchTarget as AnyRecord)[type] === 'function') continue;
        try {
          (dispatchTarget as AnyRecord)[type] = (payload?: unknown) => dispatchFn(type, payload as never);
        } catch {
          // Ignore frozen/proxied dispatch targets; callers may still use Vuex dispatch directly.
        }
      }
    }
  }

  return context;
};

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

  const resolved = rootActionFactory(patchedContext, module, definition) as AnyRecord;
  return ensureLegacyDirectContext(resolved, patchedContext, definition);
};
