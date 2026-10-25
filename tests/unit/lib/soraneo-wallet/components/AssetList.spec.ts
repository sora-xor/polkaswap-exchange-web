import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import AssetList from '@/lib/soraneo-wallet/src/components/AssetList.vue';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/util', () => ({
  delay: vi.fn(async () => undefined),
  getCssVariableValue: vi.fn(() => '71'),
  getScrollbarWidth: vi.fn(() => 0),
}));

const RecycleScrollerStub = defineComponent({
  name: 'RecycleScrollerStub',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  setup(props, { attrs, slots, expose }) {
    expose({ ready: true });

    return () =>
      h(
        'div',
        {
          class: 'recycle-scroller-stub',
          ...(attrs as Record<string, unknown>),
        },
        [slots.before?.(), ...(props.items as Asset[]).map((item, index) => slots.default?.({ item, index }))]
      );
  },
});

const RecycleScrollerWithPlaceholderStub = defineComponent({
  name: 'RecycleScrollerWithPlaceholderStub',
  props: {
    items: {
      type: Array,
      default: () => [],
    },
  },
  setup(props, { attrs, slots, expose }) {
    expose({ ready: true });

    return () =>
      h(
        'div',
        {
          class: 'recycle-scroller-placeholder-stub',
          ...(attrs as Record<string, unknown>),
        },
        [
          slots.before?.(),
          slots.default?.(),
          ...(props.items as Asset[]).map((item, index) => slots.default?.({ item, index })),
        ]
      );
  },
});

const AssetListItemStub = defineComponent({
  name: 'AssetListItemStub',
  props: {
    asset: {
      type: Object,
      required: true,
    },
  },
  emits: ['click'],
  setup(props, { emit }) {
    return () =>
      h(
        'div',
        {
          class: 'asset-item-stub',
          onClick: (event: MouseEvent) => emit('click', event),
        },
        (props.asset as Asset).symbol
      );
  },
});

const ScrollbarStub = defineComponent({
  name: 'ScrollbarStub',
  template: '<div class="scrollbar-stub"></div>',
});

const asset: Asset = {
  address: 'asset-1',
  symbol: 'AAA',
  name: 'Asset AAA',
  decimals: 18,
} as Asset;

describe('Wallet AssetList', () => {
  it('forwards item click once with the selected asset payload', async () => {
    const onClick = vi.fn();
    const wrapper = mount(AssetList, {
      props: {
        assets: [asset],
      },
      attrs: {
        onClick,
      },
      global: {
        stubs: {
          'recycle-scroller': RecycleScrollerStub,
          'asset-list-item': AssetListItemStub,
          scrollbar: ScrollbarStub,
        },
      },
    });

    await wrapper.get('.asset-item-stub').trigger('click');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0]?.[0]).toMatchObject({
      address: asset.address,
      symbol: asset.symbol,
    });
  });

  it('preserves non-listener attrs on the root node', () => {
    const wrapper = mount(AssetList, {
      props: {
        assets: [asset],
      },
      attrs: {
        'data-test-id': 'asset-list-root',
      },
      global: {
        stubs: {
          'recycle-scroller': RecycleScrollerStub,
          'asset-list-item': AssetListItemStub,
          scrollbar: ScrollbarStub,
        },
      },
    });

    expect(wrapper.get('.asset-list').attributes('data-test-id')).toBe('asset-list-root');
  });

  it('ignores recycle scroller placeholder renders without slot props', () => {
    const mountComponent = () =>
      mount(AssetList, {
        props: {
          assets: [asset],
        },
        global: {
          stubs: {
            'recycle-scroller': RecycleScrollerWithPlaceholderStub,
            'asset-list-item': AssetListItemStub,
            scrollbar: ScrollbarStub,
          },
        },
      });

    expect(mountComponent).not.toThrow();
    const wrapper = mountComponent();
    expect(wrapper.findAll('.asset-item-stub')).toHaveLength(1);
  });
});
