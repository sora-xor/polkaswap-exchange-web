type AnyRecord = Record<string, unknown>;

/**
 * Lightweight identity helpers for legacy Vuex module files.
 * They preserve the existing module/action/getter/mutation shapes while
 * keeping the direct-vuex compatibility bridge isolated to store bootstrap.
 */
export const defineModule = <T extends AnyRecord>(module: T): T => module;

export const defineActions = <T extends AnyRecord>(actions: T): T => actions;

export const defineGetters =
  <TState = unknown>() =>
  <TGetters extends AnyRecord>(getters: TGetters): TGetters =>
    getters;

export const defineMutations =
  <TState = unknown>() =>
  <TMutations extends AnyRecord>(mutations: TMutations): TMutations =>
    mutations;
