import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { createStore } from 'vuex';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const delayMock = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  delay: delayMock,
}));

import LoadingMixin from '@/lib/soraneo-wallet/src/components/mixins/LoadingMixin';

describe('LoadingMixin', () => {
  beforeEach(() => {
    delayMock.mockClear();
  });

  it('retries withChainApi when chain api getter throws during connection setup', async () => {
    let calls = 0;
    const chainApi = {
      get api() {
        calls += 1;
        if (calls === 1) {
          throw new TypeError("Cannot read properties of undefined (reading 'api')");
        }

        return {
          isReady: Promise.resolve(),
        };
      },
    } as any;

    const store = createStore({
      modules: {
        wallet: {
          namespaced: true,
          modules: {
            settings: {
              namespaced: true,
              state: () => ({
                isWalletLoaded: true,
              }),
            },
          },
        },
      },
    });
    const component = defineComponent({
      mixins: [LoadingMixin],
      template: '<div />',
    });
    const wrapper = mount(component, {
      global: {
        plugins: [store],
      },
    });
    const handler = vi.fn(async () => undefined);

    await (wrapper.vm as any).withChainApi(chainApi, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(delayMock).toHaveBeenCalledTimes(1);
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
