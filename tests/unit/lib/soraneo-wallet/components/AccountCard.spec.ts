import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AccountCard from '@/lib/soraneo-wallet/src/components/Account/AccountCard.vue';

describe('AccountCard', () => {
  const createWrapper = () =>
    mount(AccountCard, {
      attrs: {
        tabindex: '0',
      },
      global: {
        stubs: {
          SCard: {
            template: '<div class="s-card"><slot /></div>',
          },
        },
      },
    });

  it('emits click when card content is clicked', async () => {
    const wrapper = createWrapper();

    await wrapper.find('.account').trigger('click');

    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('forwards attrs to card root', () => {
    const wrapper = createWrapper();

    expect(wrapper.find('.s-card').attributes('tabindex')).toBe('0');
  });
});
