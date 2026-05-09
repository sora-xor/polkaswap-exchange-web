import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import type { IndexerType } from '@/lib/soraneo-wallet/src/consts';

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
      ...props,
    },
    global: {
      components: {
        's-scrollbar': ScrollbarStub,
        's-divider': DividerStub,
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

  it('renders service rows without a radio-selection affordance', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.radio-stub').exists()).toBe(false);
    expect(wrapper.find('.radio-group-stub').exists()).toBe(false);
    expect(wrapper.findAll('.service-item')).toHaveLength(defaultIndexers.length);
    expect(wrapper.emitted('update:indexer')).toBeUndefined();
  });
});
