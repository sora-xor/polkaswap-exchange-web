import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SSwitch from '@/lib/soramitsu-ui/components/Switch/SSwitch.vue';

describe('SSwitch compatibility', () => {
  it('supports legacy value prop for checked state', () => {
    const wrapper = mount(SSwitch, {
      props: {
        value: true,
      },
    });

    const input = wrapper.find('input.el-switch__input');
    expect((input.element as HTMLInputElement).checked).toBe(true);
  });

  it('emits legacy and v-model events when toggled', async () => {
    const wrapper = mount(SSwitch, {
      props: {
        value: false,
      },
    });

    await wrapper.find('input.el-switch__input').setValue(true);

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true]);
    expect(wrapper.emitted('input')?.[0]).toEqual([true]);
    expect(wrapper.emitted('change')?.[0]).toEqual([true]);
  });
});
