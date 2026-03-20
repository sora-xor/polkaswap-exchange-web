import { describe, expect, it } from 'vitest';

import {
  createDirectStore,
  defineActions,
  defineGetters,
  defineModule,
  defineMutations,
  localActionContext,
  localGetterContext,
} from '@/store/direct-vuex';

describe('direct-vuex compatibility layer', () => {
  it('preserves nested getters plus scoped commit/dispatch helpers', async () => {
    const nested = defineModule({
      namespaced: true,
      state: {
        enabled: true,
      },
      getters: defineGetters<{ enabled: boolean }>()({
        enabled(...args): boolean {
          const { state } = localGetterContext(args, nested);
          return state.enabled;
        },
      }),
      mutations: defineMutations<{ enabled: boolean }>()({
        setEnabled(state, value: boolean): void {
          state.enabled = value;
        },
      }),
      actions: defineActions({
        toggle(context): void {
          const { state, commit } = localActionContext(context, nested);
          commit.setEnabled(!state.enabled);
        },
      }),
    });

    const counter = defineModule({
      namespaced: true,
      state: {
        count: 1,
      },
      getters: defineGetters<{ count: number }>()({
        doubled(...args): number {
          const { state } = localGetterContext(args, counter);
          return state.count * 2;
        },
        nestedEnabled(...args): boolean {
          const { rootGetters } = localGetterContext(args, counter);
          return rootGetters.nested.enabled as boolean;
        },
      }),
      mutations: defineMutations<{ count: number }>()({
        increment(state, step = 1): void {
          state.count += step;
        },
      }),
      actions: defineActions({
        incrementAndReturn(context, step = 1): number {
          const { commit, getters } = localActionContext(context, counter);
          commit.increment(step);
          return getters.doubled as number;
        },
      }),
    });

    const { store, rootActionContext, rootGetterContext } = createDirectStore({
      modules: {
        counter,
        nested,
      },
      strict: false,
    });

    expect(store.original.state.counter.count).toBe(1);
    expect(store.getters.counter.doubled).toBe(2);
    expect(store.getters.counter.nestedEnabled).toBe(true);

    store.commit.counter.increment(2);

    expect(store.original.state.counter.count).toBe(3);
    expect(store.getters.counter.doubled).toBe(6);

    const result = await store.dispatch.counter.incrementAndReturn(2);
    expect(result).toBe(10);
    expect(store.original.state.counter.count).toBe(5);

    await store.dispatch.nested.toggle();
    expect(store.getters.nested.enabled).toBe(false);

    const scopedGetterContext = rootGetterContext(
      [store.original.state.counter, {}, store.original.state, store.original.getters] as any,
      'counter',
      counter
    );
    expect(scopedGetterContext.getters.doubled).toBe(10);
    expect(scopedGetterContext.rootGetters.nested.enabled).toBe(false);

    const scopedActionContext = rootActionContext(
      {
        state: store.original.state.counter,
        rootState: store.original.state,
        getters: store.original.getters,
        commit: store.original.commit.bind(store.original),
        dispatch: store.original.dispatch.bind(store.original),
      } as any,
      'counter',
      counter
    );
    scopedActionContext.commit.increment(1);

    expect(store.original.state.counter.count).toBe(6);
    expect(store.getters.counter.doubled).toBe(12);
  });
});
