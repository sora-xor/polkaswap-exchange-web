import { defineComponent, h, inject } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SToastsProvider from '@/lib/soramitsu-ui/components/Toasts/SToastsProvider';
import { TOASTS_API_KEY } from '@/lib/soramitsu-ui/components/Toasts/api';

describe('SToastsProvider', () => {
  it('provides the same toast api under the base key and any additional keys', () => {
    const extraSymbol = Symbol('legacy-toasts');
    let baseApi: unknown;
    let stringApi: unknown;
    let symbolApi: unknown;

    const Consumer = defineComponent({
      setup() {
        baseApi = inject(TOASTS_API_KEY);
        stringApi = inject('legacy-toasts');
        symbolApi = inject(extraSymbol);

        return () => h('div', 'consumer');
      },
    });

    const wrapper = mount(SToastsProvider, {
      props: {
        apiKey: ['legacy-toasts', extraSymbol],
      },
      slots: {
        default: () => h(Consumer),
      },
    });

    expect(wrapper.text()).toBe('consumer');
    expect(baseApi).toBeTruthy();
    expect(stringApi).toBe(baseApi);
    expect(symbolApi).toBe(baseApi);
  });
});
