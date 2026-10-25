import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import CalculatorIcon from '@/modules/staking/demeter/components/CalculatorIcon.vue';

describe('CalculatorIcon.vue', () => {
  it('renders svg icon', () => {
    const wrapper = mount(CalculatorIcon);

    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('viewBox')).toBe('0 0 12 13');
  });
});
