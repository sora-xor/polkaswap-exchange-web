import { describe, expect, it } from 'vitest';

import { defineActions, defineGetters, defineModule, defineMutations } from '@/store/module-helpers';

describe('store module helpers', () => {
  it('preserves legacy module helper shapes without the direct-vuex bridge', () => {
    const module = { namespaced: true };
    const actions = { load: () => 'ok' };
    const getters = { ready: () => true };
    const mutations = { setReady: () => undefined };

    expect(defineModule(module)).toBe(module);
    expect(defineActions(actions)).toBe(actions);
    expect(defineGetters()(getters)).toBe(getters);
    expect(defineMutations()(mutations)).toBe(mutations);
  });
});
