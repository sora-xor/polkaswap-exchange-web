import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PriceChange from '@/components/shared/PriceChange.vue';
import { FontWeightRate } from '@/lib/soraneo-wallet/src/consts';

const iconStub = {
  name: 'SIconStub',
  props: ['name'],
  template: '<i class="price-change-arrow" :data-name="name"></i>',
};

const mountComponent = (value?: FPNumber) =>
  mount(PriceChange, {
    props: { value },
    global: {
      stubs: {
        's-icon': iconStub,
        FormattedAmount: {
          props: ['value', 'fontWeightRate'],
          template:
            '<span class="formatted-amount-stub" :data-value="value" :data-weight="fontWeightRate"><slot /></span>',
        },
      },
    },
  });

describe('PriceChange', () => {
  it('shows increased styling and upward icon for positive change', () => {
    const wrapper = mountComponent(new FPNumber('1.2345'));

    expect(wrapper.classes()).toContain('price-change--increased');
    expect(wrapper.find('.price-change-arrow').attributes('data-name')).toBe('arrows-arrow-bold-top-24');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('1.23');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-weight')).toBe(FontWeightRate.MEDIUM);
  });

  it('normalises negative change to positive formatted output', () => {
    const wrapper = mountComponent(new FPNumber('-0.9876'));

    expect(wrapper.classes()).not.toContain('price-change--increased');
    expect(wrapper.find('.price-change-arrow').attributes('data-name')).toBe('arrows-arrow-bold-bottom-24');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('0.98');
  });

  it('defaults to zero change when value is not provided', () => {
    const wrapper = mountComponent();

    expect(wrapper.classes()).toContain('price-change--increased');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('0');
  });
});
