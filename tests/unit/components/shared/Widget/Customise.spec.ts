import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/store', () => ({
  __esModule: true,
  default: {
    state: {
      settings: {
        language: 'en',
      },
    },
  },
}));

vi.mock('@/consts', async () => {
  const actual = await vi.importActual<typeof import('@/consts')>('@/consts');

  return {
    __esModule: true,
    ...actual,
    ObjectInit: () => ({}),
  };
});

vi.mock('@/utils', () => ({
  __esModule: true,
  capitalize: (value: string) => (value ? value[0].toUpperCase() + value.slice(1) : value),
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock();
});

const SCardStub = defineComponent({
  name: 'SCardStub',
  template: '<div class="s-card-stub"><slot name="header" /><slot /></div>',
});

vi.mock('@/components/shared/Widget/Base.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'BaseWidgetStub',
    inheritAttrs: false,
    setup(_, { slots }) {
      return () =>
        h(
          SCardStub,
          { class: 'base-widget-stub' },
          {
            header: () => h('div', { class: 'base-widget-header' }, [slots.filters?.()]),
            default: () => slots.default?.(),
          }
        );
    },
  }),
}));

import { shallowMount } from '@vue/test-utils';
import CustomiseWidget from '@/components/shared/Widget/Customise.vue';

describe('CustomiseWidget', () => {
  it('emits widget flag updates when toggling switches', async () => {
    const wrapper = shallowMount(CustomiseWidget, {
      props: {
        modelValue: false,
        widgets: { chart: true },
        options: {},
        labels: { chart: 'Chart' },
      },
      global: {
        stubs: {
          'el-popover': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<div><slot name="reference" /><slot /></div>',
          },
          's-button': {
            template: '<button><slot /></button>',
          },
          's-divider': {
            template: '<hr />',
          },
          's-switch': {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: '<input />',
          },
        },
      },
    });

    wrapper.vm.toggle('widgets', 'chart', false);

    expect(wrapper.emitted()['update:widgets']).toBeTruthy();
    expect(wrapper.emitted()['update:widgets']?.[0]?.[0]).toEqual({ chart: false });
  });

  it('toggles visibility when clicking the widget container', async () => {
    const wrapper = shallowMount(CustomiseWidget, {
      props: {
        modelValue: false,
        widgets: {},
        options: {},
      },
    });

    wrapper.vm.toggleVisibility({ target: { closest: () => null } } as unknown as PointerEvent);

    expect(wrapper.emitted()['update:modelValue']).toBeTruthy();
    expect(wrapper.emitted()['update:modelValue']?.[0]).toEqual([true]);
  });
});
