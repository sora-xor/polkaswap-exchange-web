import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';

import loadingDirective from '@/directives/loading';

const mountWithDirective = (visible = true) =>
  mount(
    defineComponent({
      template: '<div v-loading="visible" class="target"></div>',
      setup() {
        return { visible };
      },
    }),
    {
      attachTo: document.body,
      global: {
        directives: {
          loading: loadingDirective,
        },
      },
    }
  );

describe('loading directive', () => {
  it('mounts a legacy-compatible loading overlay', () => {
    const wrapper = mountWithDirective(true);
    const target = wrapper.get('.target');
    const overlay = target.get('.app-loading-overlay.el-loading-mask');

    expect(target.classes()).toContain('app-loading-overlay__host');
    expect(overlay.find('.app-loading-overlay__spinner.el-loading-spinner').exists()).toBe(true);
  });

  it('removes the overlay when not loading', async () => {
    const wrapper = mountWithDirective(false);

    expect(wrapper.find('.app-loading-overlay').exists()).toBe(false);
  });
});
