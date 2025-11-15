import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SoraLogo from '@/components/shared/Logo/Sora.vue';
import { Theme } from '@/consts/theme';

describe('SoraLogo', () => {
  it('renders light theme fill by default', () => {
    const wrapper = mount(SoraLogo);

    expect(wrapper.find('path').attributes('fill')).toBe('#E3232C');
  });

  it('uses tertiary color when dark theme provided', () => {
    const wrapper = mount(SoraLogo, {
      props: {
        theme: Theme.DARK,
      },
    });

    expect(wrapper.find('path').attributes('fill')).toBe('var(--s-color-base-content-tertiary)');
  });
});
