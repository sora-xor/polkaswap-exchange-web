import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import RewardsGradientBox from '@/components/pages/Rewards/GradientBox.vue';

describe('RewardsGradientBox.vue', () => {
  it('applies the lowercased symbol as a modifier class', () => {
    const wrapper = shallowMount(RewardsGradientBox, {
      props: {
        symbol: 'PSWAP',
      },
      slots: {
        default: '<p>content</p>',
      },
    });

    expect(wrapper.classes()).toContain('gradient-box');
    expect(wrapper.classes()).toContain('gradient-box--pswap');
  });

  it('falls back to the base class when no symbol is provided', () => {
    const wrapper = shallowMount(RewardsGradientBox);

    expect(wrapper.classes()).toEqual(['gradient-box']);
  });
});
