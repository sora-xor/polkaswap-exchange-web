import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import StakingContainer from '@/views/StakingContainer.vue';

describe('StakingContainer.vue', () => {
  it('forwards attrs and listeners to nested route view', async () => {
    const onCustom = vi.fn();
    const wrapper = mount(StakingContainer, {
      attrs: {
        onCustom,
        'data-forwarded': 'yes',
      },
      global: {
        stubs: {
          RouterView: {
            emits: ['custom'],
            template: '<button class="router-view-stub" @click="$emit(\'custom\')">route</button>',
          },
        },
      },
    });

    const routeView = wrapper.get('.router-view-stub');
    expect(routeView.attributes('data-forwarded')).toBe('yes');

    await routeView.trigger('click');
    expect(onCustom).toHaveBeenCalledTimes(1);
  });
});
