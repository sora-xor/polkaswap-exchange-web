import { createStore, type ActionContext, type Store as VuexStore, type StoreOptions as VuexStoreOptions } from 'vuex';

type AnyRecord = Record<string, any>;
type Namespace = string[];

type DirectModuleDefinition = {
  namespaced?: boolean;
  state?: unknown;
  getters?: Record<string, unknown>;
  mutations?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  modules?: Record<string, DirectModuleDefinition>;
};

type DirectStoreLike = VuexStore<any> & {
  original: VuexStore<any>;
  getters: AnyRecord;
  commit: VuexStore<any>['commit'] & AnyRecord;
  dispatch: VuexStore<any>['dispatch'] & AnyRecord;
};

type RootGetterContext = (args: [any, any, any, any], module?: unknown, definition?: unknown) => AnyRecord;
type RootActionContext = (context: ActionContext<any, any>, module?: unknown, definition?: unknown) => AnyRecord;

const MODULE_NAMESPACE = new WeakMap<object, Namespace>();

let activeRootGetterContext: RootGetterContext | null = null;
let activeRootActionContext: RootActionContext | null = null;

export type StoreOptions<S> = VuexStoreOptions<S>;
export type CreatedStore<T extends StoreOptions<any>> = {
  store: DirectStoreLike;
  rootGetterContext: RootGetterContext;
  rootActionContext: RootActionContext;
};

const isRecord = (value: unknown): value is AnyRecord => Boolean(value) && typeof value === 'object';

const cloneNamespace = (namespace: Namespace): Namespace => [...namespace];

const resolveNamespace = (module?: unknown, definition?: unknown): Namespace => {
  const candidate = definition ?? module;

  if (Array.isArray(module)) {
    return cloneNamespace(module.filter((entry): entry is string => typeof entry === 'string'));
  }

  if (typeof module === 'string') {
    return module ? module.split('/').filter(Boolean) : [];
  }

  if (isRecord(candidate)) {
    return cloneNamespace(MODULE_NAMESPACE.get(candidate) ?? []);
  }

  return [];
};

const getDefinition = (module?: unknown, definition?: unknown): DirectModuleDefinition | null => {
  const candidate = definition ?? module;
  return isRecord(candidate) ? (candidate as DirectModuleDefinition) : null;
};

const toFlatKey = (namespace: Namespace, key: string): string => {
  return namespace.length ? `${namespace.join('/')}/${key}` : key;
};

const attachNamespaceMetadata = (definition: DirectModuleDefinition, namespace: Namespace = []): void => {
  if (!isRecord(definition)) return;

  MODULE_NAMESPACE.set(definition, cloneNamespace(namespace));

  for (const [key, child] of Object.entries(definition.modules ?? {})) {
    attachNamespaceMetadata(child, [...namespace, key]);
  }
};

const defineGetterAccessors = (
  target: AnyRecord,
  sourceStore: VuexStore<any>,
  definition: DirectModuleDefinition | null,
  namespace: Namespace
): AnyRecord => {
  if (!definition) return target;

  for (const key of Object.keys(definition.getters ?? {})) {
    Object.defineProperty(target, key, {
      enumerable: true,
      configurable: true,
      get: () => sourceStore.getters[toFlatKey(namespace, key)],
    });
  }

  for (const [childName, childDefinition] of Object.entries(definition.modules ?? {})) {
    target[childName] = createGetterTree(sourceStore, childDefinition, [...namespace, childName]);
  }

  return target;
};

const createGetterTree = (
  sourceStore: VuexStore<any>,
  definition: DirectModuleDefinition | null,
  namespace: Namespace = []
): AnyRecord => {
  return defineGetterAccessors({}, sourceStore, definition, namespace);
};

const createOperationTree = (
  sourceStore: VuexStore<any>,
  definition: DirectModuleDefinition | null,
  namespace: Namespace,
  kind: 'mutations' | 'actions'
): AnyRecord => {
  const tree: AnyRecord = {};

  if (!definition) return tree;

  for (const key of Object.keys(definition[kind] ?? {})) {
    const type = toFlatKey(namespace, key);

    tree[key] =
      kind === 'mutations'
        ? (payload?: unknown, options?: unknown) => sourceStore.commit(type, payload as never, options as never)
        : (payload?: unknown) => sourceStore.dispatch(type, payload as never);
  }

  for (const [childName, childDefinition] of Object.entries(definition.modules ?? {})) {
    tree[childName] = createOperationTree(sourceStore, childDefinition, [...namespace, childName], kind);
  }

  return tree;
};

const createScopedInvoker = (
  sourceStore: VuexStore<any>,
  modules: Record<string, DirectModuleDefinition>,
  kind: 'commit' | 'dispatch'
): ((type: string, payload?: unknown, options?: unknown) => unknown) & AnyRecord => {
  const invoker =
    kind === 'commit'
      ? (type: string, payload?: unknown, options?: unknown) =>
          sourceStore.commit(type, payload as never, options as never)
      : (type: string, payload?: unknown) => sourceStore.dispatch(type, payload as never);

  const tree = invoker as ((type: string, payload?: unknown, options?: unknown) => unknown) & AnyRecord;

  for (const [name, definition] of Object.entries(modules)) {
    tree[name] = createOperationTree(sourceStore, definition, [name], kind === 'commit' ? 'mutations' : 'actions');
  }

  return tree;
};

const createWrapperStore = (
  sourceStore: VuexStore<any>,
  modules: Record<string, DirectModuleDefinition>
): DirectStoreLike => {
  const getterTree = createGetterTree(sourceStore, { modules }, []);
  const commitTree = createScopedInvoker(sourceStore, modules, 'commit');
  const dispatchTree = createScopedInvoker(sourceStore, modules, 'dispatch');

  const wrapper = new Proxy(sourceStore as AnyRecord, {
    get(target, prop, _receiver) {
      if (prop === 'original') return sourceStore;
      if (prop === 'getters') return getterTree;
      if (prop === 'commit') return commitTree;
      if (prop === 'dispatch') return dispatchTree;

      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as DirectStoreLike;

  (sourceStore as AnyRecord).direct = wrapper;

  return wrapper;
};

export const defineModule = <T extends DirectModuleDefinition>(module: T): T => module;

export const defineActions = <T extends AnyRecord>(actions: T): T => actions;

export const defineGetters =
  <TState = unknown>() =>
  <TGetters extends AnyRecord>(getters: TGetters): TGetters =>
    getters;

export const defineMutations =
  <TState = unknown>() =>
  <TMutations extends AnyRecord>(mutations: TMutations): TMutations =>
    mutations;

/**
 * Mirrors `direct-vuex`'s module-local getter helper so existing Vuex facades
 * can keep resolving nested getter trees while the store migrates to Pinia.
 */
export const localGetterContext = (args: [any, any, any, any], module?: unknown, definition?: unknown): AnyRecord => {
  if (!activeRootGetterContext) {
    throw new Error('Getter context has not been initialized');
  }

  return activeRootGetterContext(args, module, definition);
};

/**
 * Mirrors `direct-vuex`'s module-local action helper by exposing scoped
 * `commit`/`dispatch` trees and nested getters for the active Vuex store.
 */
export const localActionContext = (
  context: ActionContext<any, any>,
  module?: unknown,
  definition?: unknown
): AnyRecord => {
  if (!activeRootActionContext) {
    throw new Error('Action context has not been initialized');
  }

  return activeRootActionContext(context, module, definition);
};

/**
 * Creates a Vuex 4 store plus the nested getter/commit/dispatch facade that the
 * legacy `direct-vuex` consumers in this repository still expect.
 */
export const createDirectStore = <T extends StoreOptions<any>>(options: T): CreatedStore<T> => {
  const modules = (options.modules ?? {}) as Record<string, DirectModuleDefinition>;

  for (const [name, definition] of Object.entries(modules)) {
    attachNamespaceMetadata(definition, [name]);
  }

  const sourceStore = createStore(options as VuexStoreOptions<any>);
  const store = createWrapperStore(sourceStore, modules);
  const rootGetters = createGetterTree(sourceStore, { modules }, []);

  const rootGetterContext: RootGetterContext = (args, module, definition) => {
    const namespace = resolveNamespace(module, definition);
    const moduleDefinition = getDefinition(module, definition);

    return {
      state: args[0],
      getters: createGetterTree(sourceStore, moduleDefinition, namespace),
      rootState: args[2],
      rootGetters,
    };
  };

  const rootActionContext: RootActionContext = (context, module, definition) => {
    const namespace = resolveNamespace(module, definition);
    const moduleDefinition = getDefinition(module, definition);
    const getters = createGetterTree(sourceStore, moduleDefinition, namespace);
    const commitTree = createOperationTree(sourceStore, moduleDefinition, namespace, 'mutations');
    const dispatchTree = createOperationTree(sourceStore, moduleDefinition, namespace, 'actions');
    const scopedCommit = Object.assign(
      (type: string, payload?: unknown, options?: unknown) =>
        sourceStore.commit(type, payload as never, options as never),
      commitTree
    );
    const scopedDispatch = Object.assign(
      (type: string, payload?: unknown) => sourceStore.dispatch(type, payload as never),
      dispatchTree
    );

    return {
      ...context,
      getters,
      rootGetters,
      commit: scopedCommit,
      dispatch: scopedDispatch,
    };
  };

  activeRootGetterContext = rootGetterContext;
  activeRootActionContext = rootActionContext;

  return {
    store,
    rootGetterContext,
    rootActionContext,
  };
};
