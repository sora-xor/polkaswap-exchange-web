import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import PolkaswapLogo from '@/components/shared/Logo/Polkaswap.vue';
import { Theme } from '@/consts/theme';

describe('PolkaswapLogo', () => {
  it('renders default purple fill for light theme', () => {
    const wrapper = mount(PolkaswapLogo);

    expect(wrapper.find('path').attributes('fill')).toBe('#0D0248');
  });

  it('uses primary text color when dark theme selected', () => {
    const wrapper = mount(PolkaswapLogo, {
      props: { theme: Theme.DARK },
    });

    expect(wrapper.find('path').attributes('fill')).toBe('var(--s-color-base-content-primary)');
  });
});
