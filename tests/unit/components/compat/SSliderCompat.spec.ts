import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SSlider from '@/components/shared/compat/SSlider.vue';

describe('SSlider compat', () => {
  it('emits legacy input events and model updates from the range control', async () => {
    const wrapper = mount(SSlider, {
      props: {
        modelValue: 25,
        min: 0,
        max: 100,
        step: 5,
      },
    });

    const input = wrapper.get('input');
    (input.element as HTMLInputElement).value = '50';
    await input.trigger('input');

    expect(wrapper.emitted('input')?.[0]).toEqual(['50']);
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['50']);

    await input.trigger('change');
    expect(wrapper.emitted('change')?.[0]).toEqual(['50']);
  });
});
