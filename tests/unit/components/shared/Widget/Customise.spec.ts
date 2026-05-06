import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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

vi.mock('@tests/stubs/walletRuntime', async () => {
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

import { mount, shallowMount } from '@vue/test-utils';
import CustomiseWidget from '@/components/shared/Widget/Customise.vue';
import SSwitch from '@/lib/soramitsu-ui/components/Switch/SSwitch.vue';

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
          's-popover-panel': {
            props: ['show'],
            emits: ['update:show'],
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

  it('updates widget state when clicking on a switch control', async () => {
    const wrapper = mount(CustomiseWidget, {
      props: {
        modelValue: true,
        widgets: { chart: true },
        options: {},
        labels: { chart: 'Chart' },
      },
      global: {
        stubs: {
          's-popover-panel': {
            props: ['show'],
            emits: ['update:show'],
            template: '<div><slot name="reference" /><slot /></div>',
          },
          's-button': {
            template: '<button><slot /></button>',
          },
          's-divider': {
            template: '<hr />',
          },
          's-switch': false,
        },
        components: {
          's-switch': SSwitch,
        },
      },
    });

    await wrapper.get('[role="switch"]').trigger('click');

    const updates = wrapper.emitted()['update:widgets'] ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]?.[0]).toEqual({ chart: false });
  });

  it('updates widget state when clicking option text', async () => {
    const wrapper = mount(CustomiseWidget, {
      props: {
        modelValue: true,
        widgets: { chart: true },
        options: {},
        labels: { chart: 'Chart' },
      },
      global: {
        stubs: {
          's-popover-panel': {
            props: ['show'],
            emits: ['update:show'],
            template: '<div><slot name="reference" /><slot /></div>',
          },
          's-button': {
            template: '<button><slot /></button>',
          },
          's-divider': {
            template: '<hr />',
          },
          's-switch': false,
        },
        components: {
          's-switch': SSwitch,
        },
      },
    });

    await wrapper.find('.customise-option__label').trigger('click');

    const updates = wrapper.emitted()['update:widgets'] ?? [];
    expect(updates).toHaveLength(1);
    expect(updates[0]?.[0]).toEqual({ chart: false });
  });
});
