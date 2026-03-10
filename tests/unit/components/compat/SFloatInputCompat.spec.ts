import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import SFloatInputCompat from '@/components/compat/SFloatInputCompat.vue';

describe('SFloatInputCompat', () => {
  it('emits sanitized numeric values for locale-style input', async () => {
    const wrapper = mount(SFloatInputCompat, {
      props: {
        hasLocaleString: true,
        decimals: 2,
      },
    });

    const input = wrapper.find('input.el-input__inner');
    await input.setValue('1,234.567abc');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1234.56']);
    expect(wrapper.emitted('input')?.[0]).toEqual(['1234.56']);
  });

  it('renders top and bottom slots and exposes imperative focus api', async () => {
    const wrapper = mount(SFloatInputCompat, {
      attachTo: document.body,
      slots: {
        top: '<div class="slot-top">Top slot</div>',
        right: '<button class="slot-right">Right slot</button>',
        bottom: '<div class="slot-bottom">Bottom slot</div>',
      },
    });

    expect(wrapper.find('.slot-top').exists()).toBe(true);
    expect(wrapper.find('.slot-right').exists()).toBe(true);
    expect(wrapper.find('.slot-bottom').exists()).toBe(true);

    (wrapper.vm as any).focus();
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(wrapper.find('input.el-input__inner').element);

    wrapper.unmount();
  });

  it('applies legacy disabled compatibility classes', () => {
    const wrapper = mount(SFloatInputCompat, {
      props: {
        disabled: true,
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['is-disabled', 's-disabled']));
  });
});
