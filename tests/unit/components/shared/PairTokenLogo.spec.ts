import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const LogoSize = vi.hoisted(
  () =>
    ({
      MINI: 'mini',
      SMALL: 'small',
      MEDIUM: 'medium',
      BIG: 'big',
      BIGGER: 'bigger',
      LARGE: 'large',
    }) as const
);

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  default: {
    name: 'TokenLogoStub',
    props: ['token', 'size'],
    template: '<div class="token-logo-stub" :data-size="size"></div>',
  },
}));

// Import component after mocking dependencies
import PairTokenLogo from '@/components/shared/PairTokenLogo.vue';

describe('PairTokenLogo', () => {
  it('applies default medium class and renders both logos', () => {
    const wrapper = mount(PairTokenLogo);

    expect(wrapper.classes()).toContain('pair-logo');
    expect(wrapper.classes()).toContain('pair-logo--medium');
    expect(wrapper.findAll('.token-logo-stub')).toHaveLength(2);
  });

  it('applies size modifier when provided', () => {
    const wrapper = mount(PairTokenLogo, {
      props: {
        size: LogoSize.SMALL,
      },
    });

    expect(wrapper.classes()).toContain('pair-logo--small');
  });
});
