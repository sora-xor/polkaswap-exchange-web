import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AccountCard from '@/lib/soraneo-wallet/src/components/Account/AccountCard.vue';
import accountCardSource from '@/lib/soraneo-wallet/src/components/Account/AccountCard.vue?raw';

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

  it('constrains long credentials inside the account row', () => {
    expect(accountCardSource).toMatch(/& > \.el-card__body\s*\{[\s\S]*min-width:\s*0;/);
    expect(accountCardSource).toMatch(/&-details\s*\{[\s\S]*min-width:\s*0;/);
    expect(accountCardSource).toMatch(/&-credentials\s*\{[\s\S]*min-width:\s*0;/);
    expect(accountCardSource).toMatch(/&_name,\s*\n\s*&_description\s*\{[\s\S]*max-width:\s*100%;/);
  });
});
