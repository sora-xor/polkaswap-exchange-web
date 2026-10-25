import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import Web3Logo from '@/components/shared/Logo/Web3.vue';
import { Theme } from '@/consts/theme';

describe('Web3Logo', () => {
  it('uses light theme color by default', () => {
    const wrapper = mount(Web3Logo);

    const path = wrapper.find('path');
    expect(path.attributes('fill')).toBe('#A19A9D');
  });

  it('switches fill color when dark theme is provided', () => {
    const wrapper = mount(Web3Logo, {
      props: {
        theme: Theme.DARK,
      },
    });

    const path = wrapper.find('path');
    expect(path.attributes('fill')).toBe('var(--s-color-base-content-tertiary)');
  });
});
