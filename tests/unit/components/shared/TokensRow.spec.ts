import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { WALLET_CONSTS } from '@tests/stubs/walletRuntime';

const TokenLogoStub = {
  name: 'TokenLogoStub',
  props: ['token', 'size'],
  template: '<div class="token-logo-stub" :data-size="size"></div>',
};

import TokensRow from '@/components/shared/TokensRow.vue';

describe('TokensRow', () => {
  const assets = [
    { address: 'AAA', symbol: 'AAA' },
    { address: 'BBB', symbol: 'BBB' },
  ];

  const mountTokensRow = (props: Record<string, unknown>) =>
    mount(TokensRow, {
      props,
      global: {
        stubs: {
          TokenLogo: TokenLogoStub,
        },
      },
    });

  it('renders provided assets with default size', () => {
    const wrapper = mountTokensRow({ assets });

    const logos = wrapper.findAll('.token-logo-stub');
    expect(logos).toHaveLength(2);
    expect(logos[0].attributes('data-size')).toBe(WALLET_CONSTS.LogoSize.LARGE);
  });

  it('applies border class when enabled', () => {
    const wrapper = mountTokensRow({ assets, border: true });

    expect(wrapper.findAll('.tokens-row__item.border')).toHaveLength(2);
  });
});
