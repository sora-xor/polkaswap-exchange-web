import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import MoonpayLogo from '@/components/shared/Logo/Moonpay.vue';
import { Theme } from '@/consts/theme';

describe('MoonpayLogo', () => {
  it('defaults to dark text and purple dot for light theme', () => {
    const wrapper = mount(MoonpayLogo);
    const paths = wrapper.findAll('path');

    expect(paths[0].attributes('fill')).toBe('#111');
    expect(paths[paths.length - 1].attributes('fill')).toBe('#7D00FF');
  });

  it('uses primary color for text and icon when dark theme selected', () => {
    const wrapper = mount(MoonpayLogo, {
      props: { theme: Theme.DARK },
    });
    const paths = wrapper.findAll('path');

    expect(paths[0].attributes('fill')).toBe('var(--s-color-base-content-primary)');
    expect(paths[paths.length - 1].attributes('fill')).toBe('var(--s-color-base-content-primary)');
  });
});
