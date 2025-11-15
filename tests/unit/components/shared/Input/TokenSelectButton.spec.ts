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

const SButtonStub = {
  name: 'SButtonStub',
  template: '<button class="s-button-stub"><slot /></button>',
};

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
        's-button': SButtonStub,
        's-icon': SIconStub,
      },
    },
  });

describe('TokenSelectButton', () => {
  it('falls back to choose token prompt when no asset is selected', () => {
    const wrapper = mountComponent();
    const exposed = wrapper.vm as unknown as {
      buttonText: string;
      buttonType: string;
      buttonTabindex: number | string;
      computedClasses: string[];
      hasToken: boolean;
    };

    expect(exposed.buttonText).toBe('i18n:buttons.chooseToken');
    expect(exposed.buttonType).toBe('secondary');
    expect(exposed.buttonTabindex).toBe(0);
    expect(exposed.hasToken).toBe(false);
    expect(exposed.computedClasses).toEqual(['token-select-button']);
  });

  it('renders token pair information when multiple assets are provided', () => {
    const wrapper = mountComponent({
      tokens: [{ symbol: 'XOR' }, { symbol: 'VAL' }],
    });
    const exposed = wrapper.vm as unknown as {
      buttonText: string;
      buttonType: string;
      computedClasses: string[];
      hasToken: boolean;
      tokenLogoComponent: string;
    };

    expect(exposed.hasToken).toBe(true);
    expect(exposed.buttonText).toBe('XOR-VAL');
    expect(exposed.buttonType).toBe('tertiary');
    expect(exposed.computedClasses).toContain('token-select-button--token');
    expect(exposed.tokenLogoComponent).toBe('pair-token-logo');
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
});
