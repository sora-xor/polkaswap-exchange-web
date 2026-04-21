import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    MaxInputNumber: '1000000000',
    getAssetFiatPrice: () => '1',
    getFPNumberFromCodec: (value: string | null | undefined, decimals?: number) =>
      FPNumber.fromCodecValue(value ?? '0', decimals),
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    currencySymbol: '$',
    exchangeRate: 2,
    currency: 'usd',
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  default: {
    name: 'FormattedAmountStub',
    template: '<span class="formatted-amount-stub"><slot /></span>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmountWithFiatValue.vue', () => ({
  default: {
    name: 'FormattedAmountWithFiatValueStub',
    template: '<span class="formatted-amount-fiat-stub"><slot /></span>',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/components/TokenAddress.vue', () => ({
  default: {
    name: 'TokenAddressStub',
    template: '<span class="token-address-stub"><slot /></span>',
  },
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => `i18n:${key}`,
  }),
}));

const FloatInputStub = {
  name: 'SFloatInputStub',
  props: ['size', 'value'],
  emits: ['update:modelValue', 'focus', 'blur'],
  template: `
    <div class="s-float-input-stub" :data-size="size">
      <slot name="top" />
      <slot />
      <slot name="right" />
      <slot name="bottom" />
      <input
        v-if="size === 'mini'"
        class="fiat-input"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      />
    </div>
  `,
};

const ButtonStub = {
  name: 'SButtonStub',
  emits: ['click'],
  template:
    '<button class="s-button-stub" @click="$emit(\'click\', { stopPropagation: () => undefined })"><slot /></button>',
};

const SliderStub = {
  name: 'SSliderStub',
  emits: ['input'],
  template: '<div class="s-slider-stub" @mousedown="$emit(\'input\', \'42\')"></div>',
};

const TokenSelectButtonStub = {
  name: 'TokenSelectButtonStub',
  emits: ['click'],
  template: '<button class="token-select-button-stub" @click="$emit(\'click\')"><slot /></button>',
};

const IconStub = {
  name: 'SIconStub',
  template: '<i class="s-icon-stub"></i>',
};

// Needs to be imported after mocks.
import TokenInput from '@/components/shared/Input/TokenInput.vue';

const createWrapper = (props?: Record<string, unknown>) =>
  mount(TokenInput, {
    props,
    global: {
      stubs: {
        's-float-input': FloatInputStub,
        's-button': ButtonStub,
        's-slider': SliderStub,
        'token-select-button': TokenSelectButtonStub,
        's-icon': IconStub,
      },
      directives: {
        button: {
          created: () => undefined,
          mounted: () => undefined,
        },
      },
    },
  });

afterEach(() => {
  vi.clearAllMocks();
});

describe('TokenInput', () => {
  const token = {
    address: '0xTOKEN',
    symbol: 'AAA',
    decimals: 18,
    externalDecimals: 18,
  };

  it('emits max event when the button is clicked', async () => {
    const wrapper = createWrapper({
      token,
      isMaxAvailable: true,
    });

    wrapper.findComponent(ButtonStub).vm.$emit('click', { stopPropagation: () => undefined });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('max')?.[0]?.[0]).toEqual(token);
  });

  it('converts fiat input into token amount based on price and exchange rate', async () => {
    const wrapper = createWrapper({
      token,
      isSelectAvailable: true,
    });

    const floatInputs = wrapper.findAllComponents(FloatInputStub);
    const fiatFloatInput = floatInputs.find((component) => component.props('size') === 'mini');
    expect(fiatFloatInput).toBeTruthy();

    fiatFloatInput!.vm.$emit('update:modelValue', '10');
    await nextTick();

    const updateModelValue = wrapper.emitted('update:modelValue');
    expect(updateModelValue).toBeTruthy();
    const lastUpdate = updateModelValue?.[updateModelValue.length - 1];
    const asHuman = FPNumber.fromCodecValue(lastUpdate?.[0] ?? '0', token.decimals).toString();
    expect(asHuman).toBe('5');
  });

  it('forwards primary amount input from the main float input', async () => {
    const wrapper = createWrapper({
      token,
      isSelectAvailable: true,
    });

    const mainFloatInput = wrapper
      .findAllComponents(FloatInputStub)
      .find((component) => component.props('size') === 'medium');
    expect(mainFloatInput).toBeTruthy();

    mainFloatInput!.vm.$emit('update:modelValue', '1.25');
    await nextTick();

    const updateModelValue = wrapper.emitted('update:modelValue');
    expect(updateModelValue).toBeTruthy();
    const lastUpdate = updateModelValue?.[updateModelValue.length - 1];
    expect(lastUpdate?.[0]).toBe('1.25');
  });

  it('emits select when the token chooser is clicked', async () => {
    const wrapper = createWrapper({
      token,
      isSelectAvailable: true,
    });

    wrapper.findComponent(TokenSelectButtonStub).vm.$emit('click', { stopPropagation: () => undefined });
    await nextTick();

    expect(wrapper.emitted('select')).toHaveLength(1);
  });
});
