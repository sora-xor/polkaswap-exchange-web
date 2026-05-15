import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import ErrorButton from '@/features/misc/components/order-book/common/ErrorButton.vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe('OrderBook ErrorButton', () => {
  it('renders translated message', () => {
    const wrapper = mount(ErrorButton, {
      global: {
        stubs: {
          's-icon': { template: '<i />' },
        },
      },
    });

    expect(wrapper.text().trim()).toBe('translated:orderBook.cantPlaceOrder');
  });
});
