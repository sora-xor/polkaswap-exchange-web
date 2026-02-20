import { mount } from '@vue/test-utils';
import { h, inject } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import { STab, STabs } from '@/lib/soramitsu-ui/components/Tabs';

vi.mock('@soramitsu-ui/ui/util', () => ({
  forceInject: (key: symbol) => {
    const injected = inject(key, null);

    if (!injected) {
      throw new Error(`Injection of "${String(key)}" failed`);
    }

    return injected;
  },
}));

const createTabsSlots = () => ({
  default: () => [
    h(STab, { name: 'one' }, { default: () => 'One' }),
    h(STab, { name: 'two' }, { default: () => 'Two' }),
  ],
});

describe('STabs compatibility', () => {
  it('emits legacy input event for value bindings', async () => {
    const onInput = vi.fn();
    const wrapper = mount(STabs, {
      props: {
        value: 'one',
        onInput,
      },
      slots: createTabsSlots(),
    });

    await wrapper.findAll('[role="tab"]')[1]?.trigger('click');

    expect(onInput).toHaveBeenCalledWith('two');
  });

  it('emits update:modelValue for v-model bindings', async () => {
    const onUpdate = vi.fn();
    const wrapper = mount(STabs, {
      props: {
        modelValue: 'one',
        'onUpdate:modelValue': onUpdate,
      },
      slots: createTabsSlots(),
    });

    await wrapper.findAll('[role="tab"]')[1]?.trigger('click');

    expect(onUpdate).toHaveBeenCalledWith('two');
  });
});
