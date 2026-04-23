import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import SDesignSystemProvider from '@/lib/soramitsu-ui/components/DesignSystemProvider/SDesignSystemProvider.vue';

describe('SDesignSystemProvider', () => {
  it('renders the configured design-system marker and slot content', () => {
    const wrapper = mount(SDesignSystemProvider, {
      props: {
        value: 'polkaswap',
      },
      slots: {
        default: '<span class="provider-child">Content</span>',
      },
    });

    expect(wrapper.classes()).toContain('s-design-system-provider');
    expect(wrapper.attributes('data-design-system')).toBe('polkaswap');
    expect(wrapper.get('.provider-child').text()).toBe('Content');
  });

  it('uses an empty design-system value by default', () => {
    const wrapper = mount(SDesignSystemProvider);

    expect(wrapper.attributes('data-design-system')).toBe('');
  });
});
