import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';

import CalculatorButton from '@/modules/staking/demeter/components/CalculatorButton.vue';

const mountCalculatorButton = (slots: Record<string, unknown> = {}) =>
  mount(CalculatorButton, {
    slots,
  });

describe('CalculatorButton.vue', () => {
  it('renders slot content', () => {
    const wrapper = mountCalculatorButton({ default: 'label' });

    expect(wrapper.text()).toContain('label');
  });

  it('emits click when pressed', async () => {
    const wrapper = mountCalculatorButton();

    const button = wrapper.find('button');
    button.element.dispatchEvent(new Event('click'));
    await nextTick();

    const events = wrapper.emitted('click');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toBeInstanceOf(Event);
  });
});
