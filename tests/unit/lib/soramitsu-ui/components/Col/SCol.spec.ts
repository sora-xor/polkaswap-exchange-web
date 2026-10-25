import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@soramitsu-ui/ui/composables/prop-type-filter', async () => {
  const { computed } = await import('vue');

  return {
    usePropTypeFilter:
      <T extends Record<string, unknown>>(props: T) =>
      <K extends keyof T>(key: K, values: readonly unknown[], fallback: T[K]) =>
        computed(() => (values.includes(props[key]) ? props[key] : fallback)),
  };
});

import SCol from '@/lib/soramitsu-ui/components/Col/SCol.vue';
import { ROW_INJECTION_KEY } from '@/lib/soramitsu-ui/components/Row/context';

describe('SCol', () => {
  it('applies base span, offset, push, and pull styles', () => {
    const wrapper = mount(SCol, {
      props: {
        span: 6,
        offset: 3,
        push: 2,
        pull: 1,
      },
      slots: {
        default: '<span class="col-child" />',
      },
    });
    const style = wrapper.attributes('style');

    expect(wrapper.classes()).toContain('s-col');
    expect(wrapper.find('.col-child').exists()).toBe(true);
    expect(style).toContain('--s-col-gutter: 0px');
    expect(style).toContain('--s-col-span-width: 50%');
    expect(style).toContain('--s-col-offset: 25%');
    expect(style).toContain('--s-col-translate: 8.3333%');
  });

  it('supports responsive number and object configs', () => {
    const wrapper = mount(SCol, {
      props: {
        sm: { span: 8, offset: 1, push: 3, pull: 1 },
        md: 6,
        xl: { pull: 3 },
      },
    });
    const style = wrapper.attributes('style');

    expect(style).toContain('--s-col-span-width-sm: 66.6667%');
    expect(style).toContain('--s-col-offset-sm: 8.3333%');
    expect(style).toContain('--s-col-translate-sm: 16.6667%');
    expect(style).toContain('--s-col-span-width-md: 50%');
    expect(style).toContain('--s-col-translate-xl: -25%');
  });

  it('clamps invalid values and hides zero-width columns', () => {
    const wrapper = mount(SCol, {
      props: {
        span: 30,
        offset: -5,
        push: Number.NaN,
        pull: 12,
        xs: {},
        lg: { span: 14, offset: -1, push: 99 },
      },
    });
    const style = wrapper.attributes('style');

    expect(style).toContain('--s-col-span-width: 100%');
    expect(style).toContain('--s-col-offset: 0%');
    expect(style).toContain('--s-col-translate: -100%');
    expect(style).not.toContain('--s-col-span-width-xs');
    expect(style).toContain('--s-col-span-width-lg: 100%');
    expect(style).toContain('--s-col-offset-lg: 0%');
    expect(style).toContain('--s-col-translate-lg: 100%');

    const hidden = mount(SCol, {
      props: {
        span: 0,
      },
    });

    expect(hidden.attributes('style')).toContain('display: none');
  });

  it('derives gutter padding from parent row and supports custom tags', () => {
    const col = mount(SCol, {
      props: {
        tag: 'section',
      },
      global: {
        provide: {
          [ROW_INJECTION_KEY as symbol]: {
            gutter: ref(24),
          },
        },
      },
    });
    const style = col.attributes('style');

    expect(col.element.tagName).toBe('SECTION');
    expect(style).toContain('--s-col-gutter: 24px');
    expect(style).toContain('padding-left: 12px');
    expect(style).toContain('padding-right: 12px');
  });

  it('falls back to a div tag when an empty tag is provided', () => {
    const wrapper = mount(SCol, {
      props: {
        tag: '',
      },
    });

    expect(wrapper.element.tagName).toBe('DIV');
  });
});
