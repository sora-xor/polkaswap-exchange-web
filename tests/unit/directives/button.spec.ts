import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import buttonDirective from '@/directives/button';

const mountWithDirective = (template: string) =>
  mount(
    defineComponent({
      template,
      setup() {
        const handleClick = vi.fn();

        return {
          handleClick,
        };
      },
    }),
    {
      global: {
        directives: {
          button: buttonDirective,
        },
      },
    }
  );

describe('button directive', () => {
  it('adds button semantics to non-interactive elements', async () => {
    const wrapper = mountWithDirective('<div v-button class="target" @click="handleClick">Action</div>');
    const target = wrapper.get('.target');

    await target.trigger('keydown', { key: 'Enter' });

    expect(target.attributes('role')).toBe('button');
    expect(target.attributes('tabindex')).toBe('0');
    expect(target.classes()).toContain('s-clickable');
    expect((wrapper.vm as { handleClick: ReturnType<typeof vi.fn> }).handleClick).toHaveBeenCalledTimes(1);
  });

  it('respects explicit tabindex control when disabled via binding', () => {
    const wrapper = mountWithDirective('<div v-button="false" class="target" tabindex="-1">Action</div>');
    const target = wrapper.get('.target');

    expect(target.attributes('tabindex')).toBe('-1');
  });
});
