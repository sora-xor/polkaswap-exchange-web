import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import TokenAddress from '@/lib/soraneo-wallet/src/components/TokenAddress.vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === 'assets.assetId') return 'Asset ID';
      if (key === 'copyWithValue') return `Copy ${values?.value ?? ''}`;
      return key;
    },
  }),
}));

vi.mock('@/util', () => ({
  getTextWidth: vi.fn(() => 72),
}));

const TooltipStub = defineComponent({
  name: 'TooltipStub',
  props: {
    content: {
      type: String,
      default: '',
    },
    popperClass: {
      type: String,
      default: '',
    },
  },
  template: '<div class="tooltip-stub" :data-content="content" :data-popper-class="popperClass"><slot /></div>',
});

describe('TokenAddress', () => {
  it('keeps asset content metadata from overriding the address tooltip copy', () => {
    const wrapper = mount(TokenAddress, {
      props: {
        name: 'Liberland Dollar',
        symbol: 'LLD',
        address: '0x00513be65493a7fc3e2128d4230061a530acf40478a4affa20bbba27a310673e',
      },
      attrs: {
        content: '',
      },
      global: {
        stubs: {
          's-tooltip': TooltipStub,
        },
      },
    });

    expect(wrapper.get('.tooltip-stub').attributes('data-content')).toBe('Copy Asset ID');
    expect(wrapper.get('.tooltip-stub').attributes('data-popper-class')).toBe('formatted-address-tooltip');
  });
});
