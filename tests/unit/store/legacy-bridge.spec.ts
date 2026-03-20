import { describe, expect, it } from 'vitest';

import { createLegacyStoreBridge } from '@/store/legacy-bridge';
import { localLegacyActionContext, localLegacyGetterContext } from '@/store/legacy-context';
import { defineActions, defineGetters, defineModule, defineMutations } from '@/store/module-helpers';

describe('legacy store bridge', () => {
  it('preserves scoped getter and action helpers behind app-owned facades', async () => {
    const counter = defineModule({
      namespaced: true,
      state: {
        count: 2,
      },
      getters: defineGetters<{ count: number }>()({
        doubled(...args): number {
          const { state } = localLegacyGetterContext(args, counter);
          return (state as { count: number }).count * 2;
        },
      }),
      mutations: defineMutations<{ count: number }>()({
        increment(state, step = 1): void {
          state.count += step;
        },
      }),
      actions: defineActions({
        incrementAndReturn(context, step = 1): number {
          const { commit, getters } = localLegacyActionContext(context, counter);
          (commit as { increment: (payload?: number) => void }).increment(step);
          return (getters as { doubled: number }).doubled;
        },
      }),
    });

    const { store, rootActionContext, rootGetterContext } = createLegacyStoreBridge({
      modules: {
        counter,
      },
      strict: false,
    });

    expect(store.getters.counter.doubled).toBe(4);

    const dispatched = await store.dispatch.counter.incrementAndReturn(3);
    expect(dispatched).toBe(10);
    expect(store.original.state.counter.count).toBe(5);

    const scopedGetterContext = rootGetterContext(
      [store.original.state.counter, {}, store.original.state, store.original.getters] as any,
      'counter',
      counter
    );
    expect(scopedGetterContext.getters.doubled).toBe(10);

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
    scopedActionContext.commit.increment(2);

    expect(store.original.state.counter.count).toBe(7);
    expect(store.getters.counter.doubled).toBe(14);
  });
});
