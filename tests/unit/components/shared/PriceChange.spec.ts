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
          props: ['value', 'fontWeightRate', 'integerOnly'],
          template:
            '<span class="formatted-amount-stub" :data-value="value" :data-weight="fontWeightRate" :data-integer-only="String(integerOnly)"><slot /></span>',
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
    expect(wrapper.find('.formatted-amount-stub').attributes('data-integer-only')).toBe('false');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-weight')).toBe(FontWeightRate.MEDIUM);
  });

  it('normalises negative change to positive formatted output', () => {
    const wrapper = mountComponent(new FPNumber('-0.9876'));

    expect(wrapper.classes()).not.toContain('price-change--increased');
    expect(wrapper.find('.price-change-arrow').attributes('data-name')).toBe('arrows-arrow-bold-bottom-24');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('0.98');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-integer-only')).toBe('false');
  });

  it('defaults to zero change when value is not provided', () => {
    const wrapper = mountComponent();

    expect(wrapper.classes()).toContain('price-change--increased');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('0');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-integer-only')).toBe('true');
  });

  it('trims trailing zero decimals from rounded values', () => {
    const wrapper = mountComponent(new FPNumber('1.2000'));

    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('1.2');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-integer-only')).toBe('false');
  });

  it('marks whole-number percentage values as integer-only', () => {
    const wrapper = mountComponent(new FPNumber('1.0000'));

    expect(wrapper.find('.formatted-amount-stub').attributes('data-value')).toBe('1');
    expect(wrapper.find('.formatted-amount-stub').attributes('data-integer-only')).toBe('true');
  });
});
