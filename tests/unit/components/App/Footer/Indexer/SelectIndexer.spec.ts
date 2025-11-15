import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { IndexerType } from '@wallet/lib/consts';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `t:${key}`,
    TranslationConsts: {
      online: 'Online',
      offline: 'Offline',
    },
  }),
}));

const ScrollbarStub = defineComponent({
  name: 'ScrollbarStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'scrollbar-stub' }, slots.default?.());
  },
});

const DividerStub = defineComponent({
  name: 'DividerStub',
  setup(_, { slots }) {
    return () => h('div', { class: 'divider-stub' }, slots.default?.());
  },
});

const RadioGroupStub = defineComponent({
  name: 'RadioGroupStub',
  props: {
    modelValue: {
      type: [String, Number, Boolean],
      default: undefined,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: 'radio-group-stub',
          'data-value': props.modelValue as string | number | boolean | undefined,
        },
        slots.default?.()
      );
  },
});

const RadioStub = defineComponent({
  name: 'RadioStub',
  props: {
    label: {
      type: [String, Number],
      default: '',
    },
    value: {
      type: [String, Number],
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'div',
        {
          class: ['radio-stub', props.disabled ? 'is-disabled' : ''],
          'data-value': props.value,
        },
        slots.default?.()
      );
  },
});

const SwitchStub = defineComponent({
  name: 'SwitchStub',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { slots }) {
    return () =>
      h(
        'button',
        {
          class: 'switch-stub',
          'data-value': props.modelValue,
        },
        slots.default?.()
      );
  },
});

// Needs to be imported after mocks.
import SelectIndexer from '@/components/App/Footer/Indexer/SelectIndexer.vue';

const defaultIndexers = [
  {
    name: 'SubQuery',
    type: 'subquery' as IndexerType,
    endpoint: 'https://subquery.example',
    online: true,
  },
  {
    name: 'Hydra',
    type: 'hydra' as IndexerType,
    endpoint: '',
    online: false,
  },
];

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(SelectIndexer, {
    props: {
      indexers: defaultIndexers,
      indexer: defaultIndexers[0].type,
      ceres: false,
      ...props,
    },
    global: {
      components: {
        's-scrollbar': ScrollbarStub,
        's-divider': DividerStub,
        's-radio-group': RadioGroupStub,
        's-radio': RadioStub,
        's-switch': SwitchStub,
      },
    },
  });

describe('SelectIndexer', () => {
  it('renders available indexers with status labels', () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('SubQuery');
    expect(wrapper.text()).toContain('https://subquery.example');
    expect(wrapper.text()).toContain('Hydra');
    expect(wrapper.text()).toContain('Online');
    expect(wrapper.text()).toContain('Offline');
  });

  it('emits updates when selecting another indexer and toggling Ceres usage', async () => {
    const wrapper = mountComponent();

    wrapper.findComponent(RadioGroupStub).vm.$emit('update:modelValue', defaultIndexers[1].type);
    await wrapper.vm.$nextTick();
    wrapper.findComponent(SwitchStub).vm.$emit('update:modelValue', true);
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:indexer')?.[0]).toEqual([defaultIndexers[1].type]);
    expect(wrapper.emitted('update:ceres')?.[0]).toEqual([true]);
  });
});
