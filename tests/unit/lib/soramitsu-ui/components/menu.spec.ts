import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { mount } from '@vue/test-utils';

import SMenu from '@/lib/soramitsu-ui/components/Menu/SMenu.vue';
import SMenuItem from '@/lib/soramitsu-ui/components/Menu/SMenuItem.vue';

describe('SMenu', () => {
  it('marks the default active item', () => {
    const wrapper = mount(SMenu, {
      props: {
        defaultActive: 'Swap',
      },
      slots: {
        default: () => [
          h(SMenuItem, { index: 'Swap' }, { default: () => 'Swap' }),
          h(SMenuItem, { index: 'Trade' }, { default: () => 'Trade' }),
        ],
      },
    });

    const items = wrapper.findAll('.s-menu-item');

    expect(items[0].classes()).toContain('is-active');
    expect(items[1].classes()).not.toContain('is-active');
  });

  it('switches active item and emits selected index', async () => {
    const wrapper = mount(SMenu, {
      props: {
        defaultActive: 'Swap',
      },
      slots: {
        default: () => [
          h(SMenuItem, { index: 'Swap' }, { default: () => 'Swap' }),
          h(SMenuItem, { index: 'Trade' }, { default: () => 'Trade' }),
        ],
      },
    });

    const items = wrapper.findAll('.s-menu-item');
    await items[1].trigger('click');

    expect(items[0].classes()).not.toContain('is-active');
    expect(items[1].classes()).toContain('is-active');
    expect(wrapper.emitted('select')?.[0]).toEqual(['Trade']);
  });
});
