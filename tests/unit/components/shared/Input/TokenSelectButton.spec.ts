import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      TokenLogo: {
        name: 'TokenLogoStub',
        template: '<div class="token-logo-stub" />',
      },
      PairTokenLogo: {
        name: 'PairTokenLogoStub',
        template: '<div class="pair-token-logo-stub" />',
      },
    },
  });
});

vi.mock('@/router', () => ({
  lazyComponent: () => () => ({
    name: 'PairTokenLogoStub',
    template: '<div class="pair-token-logo-stub" />',
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `i18n:${key}`,
  }),
}));

// Needs to be imported after mocks are declared.
import TokenSelectButton from '@/components/shared/Input/TokenSelectButton.vue';

const SIconStub = {
  name: 'SIconStub',
  props: ['name', 'size'],
  template: '<i class="s-icon-stub" :data-name="name" :data-size="size" />',
};

const mountComponent = (props?: Record<string, unknown>) =>
  mount(TokenSelectButton, {
    props,
    global: {
      stubs: {
        's-icon': SIconStub,
      },
    },
  });

describe('TokenSelectButton', () => {
  it('falls back to choose token prompt when no asset is selected', () => {
    const wrapper = mountComponent();
    const exposed = wrapper.vm as unknown as {
      buttonText: string;
      buttonTabindex: number | string;
      computedClasses: Array<string | Record<string, boolean>>;
      hasToken: boolean;
    };

    expect(exposed.buttonText).toBe('i18n:buttons.chooseToken');
    expect(exposed.buttonTabindex).toBe(0);
    expect(exposed.hasToken).toBe(false);
    expect(exposed.computedClasses).toEqual([
      'el-button',
      'el-tooltip',
      'el-button--plain',
      'el-button--small',
      'neumorphic',
      's-small',
      's-border-radius-mini',
      's-secondary',
      'token-select-button',
      { 'is-disabled': false },
    ]);
  });

  it('renders token pair information when multiple assets are provided', () => {
    const wrapper = mountComponent({
      tokens: [{ symbol: 'XOR' }, { symbol: 'VAL' }],
    });
    const exposed = wrapper.vm as unknown as {
      buttonText: string;
      computedClasses: Array<string | Record<string, boolean>>;
      hasToken: boolean;
    };

    expect(exposed.hasToken).toBe(true);
    expect(exposed.buttonText).toBe('XOR-VAL');
    expect(exposed.computedClasses).toContain('s-border-radius-mini');
    expect(exposed.computedClasses).toContain('s-tertiary');
    expect(exposed.computedClasses).toContain('token-select-button--token');
  });

  it('normalizes token symbols to avoid visual line breaks', () => {
    const wrapper = mountComponent({
      tokens: [{ symbol: ' XOR\n' }, { symbol: ' V AL ' }],
    });
    const exposed = wrapper.vm as unknown as { buttonText: string };

    expect(exposed.buttonText).toBe('XOR-VAL');
  });

  it('renders token logo when a single token is provided', () => {
    const wrapper = mountComponent({
      token: { symbol: 'XOR' },
    });

    expect(wrapper.find('.token-logo-stub').exists()).toBe(true);
  });

  it('hides the icon when button is disabled even if icon prop is passed', () => {
    const wrapper = mountComponent({
      icon: 'general',
      disabled: true,
    });
    const exposed = wrapper.vm as unknown as { buttonTabindex: number | string };

    expect(wrapper.find('.s-icon-stub').exists()).toBe(false);
    expect(exposed.buttonTabindex).toBe(-1);
  });

  it('renders the production button contract without the soramitsu shared text wrapper', () => {
    const wrapper = mountComponent();
    const button = wrapper.get('button.token-select-button');

    expect(button.classes()).toContain('el-button');
    expect(button.classes()).toContain('el-button--plain');
    expect(button.find('.s-button__text').exists()).toBe(false);
    expect(button.find('.token-select-button__content').exists()).toBe(true);
  });

  it('keeps logo, text and chevron inside a shared content wrapper', () => {
    const wrapper = mountComponent({
      token: { symbol: 'XOR' },
      icon: 'chevron-down-rounded-16',
    });

    const content = wrapper.find('.token-select-button__content');

    expect(content.exists()).toBe(true);
    expect(content.find('.token-logo-stub').exists()).toBe(true);
    expect(content.find('.token-select-button__text').text()).toBe('XOR');
    expect(content.find('.s-icon-stub').attributes('data-name')).toBe('chevron-down-rounded-16');
  });
});
