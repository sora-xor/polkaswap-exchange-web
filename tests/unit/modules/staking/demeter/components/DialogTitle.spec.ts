import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const pairTokenLogoStub = vi.hoisted(() => ({
  name: 'PairTokenLogoStub',
  props: ['firstToken', 'secondToken'],
  template: '<div class="pair-token-logo-stub"></div>',
}));

const tokenLogoStub = vi.hoisted(() => ({
  name: 'TokenLogoStub',
  props: ['token'],
  template: '<div class="token-logo-stub"></div>',
}));

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  default: tokenLogoStub,
}));

vi.mock('@/components/shared/PairTokenLogo.vue', () => ({
  __esModule: true,
  default: pairTokenLogoStub,
}));

import DialogTitle from '@/modules/staking/demeter/components/DialogTitle.vue';

const baseAsset = {
  symbol: 'XOR',
};

const poolAsset = {
  symbol: 'KSM',
};

describe('DialogTitle.vue', () => {
  it('renders pair logo when displaying farm pool', () => {
    const wrapper = mount(DialogTitle, {
      props: {
        isFarm: true,
        baseAsset,
        poolAsset,
      },
    });

    expect(wrapper.find('.pair-token-logo-stub').exists()).toBe(true);
    expect(wrapper.find('.dialog-title-text').text()).toBe('XOR-KSM');
  });

  it('renders single token logo when not a farm pool', () => {
    const wrapper = mount(DialogTitle, {
      props: {
        poolAsset,
      },
    });

    expect(wrapper.find('.token-logo-stub').exists()).toBe(true);
    expect(wrapper.find('.pair-token-logo-stub').exists()).toBe(false);
    expect(wrapper.find('.dialog-title-text').text()).toBe('KSM');
  });
});
