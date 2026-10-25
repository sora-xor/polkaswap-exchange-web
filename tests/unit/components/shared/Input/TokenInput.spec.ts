import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';

const priceState = vi.hoisted(() => ({ codec: '1' }));
const resizeObservers: ResizeObserverMock[] = [];
const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

class ResizeObserverMock {
  constructor(readonly callback: ResizeObserverCallback) {
    resizeObservers.push(this);
  }
  observe = vi.fn();
  disconnect = vi.fn();
}

const mockInputLayout = (
  input: HTMLInputElement,
  clientWidth: number,
  textWidth: number | ((value: string) => number)
) => {
  const layout = { clientWidth, textWidth };
  Object.defineProperties(input, {
    clientWidth: { configurable: true, get: () => layout.clientWidth },
    scrollWidth: {
      configurable: true,
      get: () =>
        Math.max(
          layout.clientWidth,
          typeof layout.textWidth === 'function' ? layout.textWidth(input.value) : layout.textWidth
        ),
    },
  });
  return layout;
};

const notifyInputResize = async (input: HTMLInputElement) => {
  await nextTick();
  const observer = resizeObservers.find((item) => item.observe.mock.calls.some(([target]) => target === input));
  expect(observer).toBeDefined();
  observer!.callback([], observer as unknown as ResizeObserver);
  await nextTick();
  return observer!;
};

beforeEach(() => {
  resizeObservers.length = 0;
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
});

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    MaxInputNumber: '1000000000',
    getAssetFiatPrice: () => priceState.codec,
    getFPNumberFromCodec: (value: string | null | undefined, decimals?: number) =>
      FPNumber.fromCodecValue(value ?? '0', decimals),
  }),
}));

vi.mock('@/stores/wallet', async () => {
  const { reactive } = await import('vue');
  const state = reactive({ currencySymbol: '$', exchangeRate: 2, currency: 'usd' });
  return { useWalletStore: () => state };
});

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
    t: (key: string, values?: Record<string, string>) => {
      if (key === 'amountInput.label') return `${values?.field} ${values?.token} amount`;
      if (key === 'amountInput.fiatLabel') return `${values?.field} amount in ${values?.currency}`;
      return `i18n:${key}`;
    },
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
import { useWalletStore } from '@/stores/wallet';
import SFloatInput from '@/lib/soramitsu-ui/components/Input/SFloatInput.vue';
import { getMaxValue } from '@/utils';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import type { AccountAsset } from '@sora-substrate/sdk/build/assets/types';

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
  vi.unstubAllGlobals();
  if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
  else Reflect.deleteProperty(document, 'fonts');
  priceState.codec = '1';
  Object.assign(useWalletStore(), { currency: 'usd', exchangeRate: 2 });
});

describe('TokenInput', () => {
  const token = {
    address: '0xTOKEN',
    symbol: 'AAA',
    decimals: 18,
    externalDecimals: 18,
  };

  it.each([
    ['123456789012345678.123456789012345678', '123,456,789,012,345,678.12'],
    ['0.000000000000000001', '0.00'],
  ])('preserves %s through real fiat editing at an exact unit rate', async (amount, blurredFiat) => {
    priceState.codec = '1000000000000000000';
    Object.assign(useWalletStore(), { exchangeRate: 1 });
    const current = ref('');
    const harness = defineComponent({
      setup: () => () =>
        h(TokenInput, {
          token,
          title: 'From',
          modelValue: current.value,
          'onUpdate:modelValue': (value: string) => {
            current.value = value;
          },
          max: '999999999999999999.999999999999999999',
        }),
    });
    const wrapper = mount(harness, {
      global: {
        components: { 's-float-input': SFloatInput },
        stubs: { 's-slider': SliderStub, 'token-select-button': TokenSelectButtonStub },
      },
    });
    const fiat = wrapper.get<HTMLInputElement>('input[aria-label="From amount in usd"]');
    const main = wrapper.get<HTMLInputElement>('input[aria-label="From AAA amount"]');
    await fiat.trigger('focus');
    await fiat.setValue(amount);
    await fiat.trigger('blur');
    expect(current.value).toBe(amount);
    expect(fiat.element.value).toBe(blurredFiat);
    await main.trigger('focus');
    expect(main.element.value).toBe(amount);
    await main.trigger('blur');
    await fiat.trigger('focus');
    expect(fiat.element.value).toBe(amount);
    await fiat.trigger('blur');
    expect(current.value).toBe(amount);
    expect(fiat.element.value).toBe(blurredFiat);
    expect(wrapper.findComponent(TokenInput).emitted('update:modelValue')).toEqual([[amount]]);
  });

  it('uses the exact native Max calculation in both real token and fiat fields', async () => {
    priceState.codec = '1000000000000000000';
    Object.assign(useWalletStore(), { exchangeRate: 1 });
    const asset = {
      ...XOR,
      decimals: 18,
      balance: { transferable: '123456789012345678123456789012345678' },
    } as AccountAsset;
    const fee = '100000000000000000';
    const expected = '123456789012345678.023455789012345678';
    const current = ref('');
    const harness = defineComponent({
      setup: () => () =>
        h(TokenInput, {
          token: asset,
          title: 'From',
          modelValue: current.value,
          'onUpdate:modelValue': (value: string) => {
            current.value = value;
          },
          max: '999999999999999999.999999999999999999',
          isMaxAvailable: true,
          onMax: () => {
            current.value = getMaxValue(asset, fee);
          },
        }),
    });
    const wrapper = mount(harness, {
      global: {
        components: { 's-float-input': SFloatInput },
        stubs: { 's-button': ButtonStub, 's-slider': SliderStub, 'token-select-button': TokenSelectButtonStub },
      },
    });
    await wrapper.get('.el-button--max').trigger('click');
    expect(current.value).toBe(expected);
    const main = wrapper.get<HTMLInputElement>('input[aria-label="From XOR amount"]');
    const fiat = wrapper.get<HTMLInputElement>('input[aria-label="From amount in usd"]');
    await main.trigger('focus');
    expect(main.element.value).toBe(expected);
    await main.trigger('blur');
    expect(main.element.value).toBe('123,456,789,012,345,678.023455789012345678');
    expect(fiat.element.value).toBe('123,456,789,012,345,678.02');
    expect(wrapper.findComponent(TokenInput).emitted('update:modelValue')).toBeUndefined();
    await fiat.trigger('focus');
    expect(fiat.element.value).toBe(expected);
    await fiat.setValue(expected);
    await fiat.trigger('blur');
    expect(current.value).toBe(expected);
  });

  it('focuses and selects the editable amount once without stealing a later focus change', async () => {
    const wrapper = mount(TokenInput, {
      attachTo: document.body,
      props: { token, title: 'Amount', modelValue: '1234.5678', withoutFiat: true },
      global: { components: { 's-float-input': SFloatInput }, stubs: { 'token-select-button': TokenSelectButtonStub } },
    });
    const input = wrapper.get<HTMLInputElement>('input').element;
    const select = vi.spyOn(input, 'select');
    const otherControl = document.createElement('button');
    document.body.appendChild(otherControl);
    try {
      await wrapper.vm.focusAndSelect();
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('1234.5678');
      expect([input.selectionStart, input.selectionEnd]).toEqual([0, 9]);
      input.setSelectionRange(2, 2);
      await wrapper.setProps({ title: 'Updated amount' });
      expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2]);
      expect(select).toHaveBeenCalledTimes(1);

      const opening = wrapper.vm.focusAndSelect();
      otherControl.focus();
      await opening;
      expect(document.activeElement).toBe(otherControl);
      expect(select).toHaveBeenCalledTimes(1);
    } finally {
      wrapper.unmount();
      otherControl.remove();
    }
  });

  it('names native amount inputs and exposes the exact clipped value without rounding', async () => {
    const amount = '13952.512345678901234567';
    const wrapper = mount(TokenInput, {
      props: { token, title: 'To', modelValue: amount, withoutFiat: true, isSelectAvailable: true },
      global: {
        components: { 's-float-input': SFloatInput },
        stubs: { 'token-select-button': TokenSelectButtonStub },
      },
    });
    const input = wrapper.get<HTMLInputElement>('input');
    mockInputLayout(input.element, 200, 400);
    await notifyInputResize(input.element);
    expect(input.attributes('aria-label')).toBe('To AAA amount');
    expect(input.attributes('inputmode')).toBe('decimal');
    expect((input.element as HTMLInputElement).value).toBe('13,952.512345678901234567');
    const exactAmount = wrapper.get('.token-input__exact-amount');
    expect(input.attributes('aria-describedby')).toBe(exactAmount.attributes('id'));
    expect(exactAmount.text()).toContain('13,952.512345678901234567 AAA');
    const emittedBeforeFocus = wrapper.emitted('update:modelValue')?.length ?? 0;
    await input.trigger('focus');
    expect((input.element as HTMLInputElement).value).toBe(amount);
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')?.length ?? 0).toBe(emittedBeforeFocus);
  });

  it('does not repeat a fully visible 18-decimal amount, including after resizing', async () => {
    const amount = '4.715196682671751621';
    const wrapper = mount(TokenInput, {
      props: { token, title: 'To', modelValue: amount, withoutFiat: true },
      global: { components: { 's-float-input': SFloatInput }, stubs: { 'token-select-button': TokenSelectButtonStub } },
    });
    const input = wrapper.get<HTMLInputElement>('input');
    const layout = mockInputLayout(input.element, 400, 350);
    const observer = await notifyInputResize(input.element);
    expect(input.element.value).toBe(amount);
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);
    expect(input.attributes('aria-describedby')).toBeUndefined();

    layout.clientWidth = 250;
    await notifyInputResize(input.element);
    expect(wrapper.get('.token-input__exact-amount').text()).toContain(`${amount} AAA`);
    expect(input.attributes('aria-describedby')).toBe(wrapper.get('.token-input__exact-amount').attributes('id'));

    layout.clientWidth = 400;
    await notifyInputResize(input.element);
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);
    expect(input.attributes('aria-describedby')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('remeasures updated values and the grouping removed on focus without changing amounts', async () => {
    const wrapper = mount(TokenInput, {
      props: { token, title: 'To', modelValue: '1', withoutFiat: true },
      global: { components: { 's-float-input': SFloatInput }, stubs: { 'token-select-button': TokenSelectButtonStub } },
    });
    const input = wrapper.get<HTMLInputElement>('input');
    mockInputLayout(input.element, 300, (value) => (value.includes(',') ? 310 : value.length * 10));
    await notifyInputResize(input.element);
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);

    const amount = '123456789012345.123456789012345678';
    await wrapper.setProps({ modelValue: amount });
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(true);
    await wrapper.setProps({ modelValue: '123456789012345.12' });
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(true);
    await input.trigger('focus');
    await nextTick();
    expect(input.element.value).toBe('123456789012345.12');
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);
    await input.trigger('blur');
    await nextTick();
    expect(input.element.value).toBe('123,456,789,012,345.12');
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(true);
    await wrapper.setProps({ modelValue: '12' });
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('remeasures after fonts load and ignores pending font readiness after unmount', async () => {
    let resolveFonts!: () => void;
    const fonts = Object.assign(new EventTarget(), {
      ready: new Promise<void>((resolve) => {
        resolveFonts = resolve;
      }),
    });
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    const wrapper = mount(TokenInput, {
      props: { token, modelValue: '4.715196682671751621', withoutFiat: true },
      global: { components: { 's-float-input': SFloatInput }, stubs: { 'token-select-button': TokenSelectButtonStub } },
    });
    const input = wrapper.get<HTMLInputElement>('input');
    const layout = mockInputLayout(input.element, 400, 350);
    await notifyInputResize(input.element);
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);
    layout.textWidth = 450;
    fonts.dispatchEvent(new Event('loadingdone'));
    await nextTick();
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(true);

    const measure = vi.fn(() => 400);
    Object.defineProperty(input.element, 'clientWidth', { configurable: true, get: measure });
    wrapper.unmount();
    resolveFonts();
    fonts.dispatchEvent(new Event('loadingdone'));
    await nextTick();
    expect(measure).not.toHaveBeenCalled();
  });

  it('honors a caller-provided accessible name and keeps short values compact', () => {
    const wrapper = mount(TokenInput, {
      props: { token, title: 'From', modelValue: '12.34', withoutFiat: true },
      attrs: { 'aria-label': 'Amount of AAA to send' },
      global: { components: { 's-float-input': SFloatInput }, stubs: { 'token-select-button': TokenSelectButtonStub } },
    });
    expect(wrapper.get('input').attributes('aria-label')).toBe('Amount of AAA to send');
    expect(wrapper.find('.token-input__exact-amount').exists()).toBe(false);
  });

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

  it('keeps the fiat append slot visible when fiat amount is hidden', () => {
    const wrapper = mount(TokenInput, {
      props: {
        token,
        withoutFiat: true,
      },
      slots: {
        'fiat-amount-append': '<span class="loss-warning-pill">-1.9%</span>',
      },
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

    expect(wrapper.find('.loss-warning-pill').exists()).toBe(true);
    expect(wrapper.find('.fiat-input').exists()).toBe(false);
  });

  it('preserves a canonical draft on initialization and display-currency changes', async () => {
    const amount = '123456789012345678.123456789012345678';
    const wrapper = createWrapper({ token, modelValue: amount });
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    const wallet = useWalletStore();
    Object.assign(wallet, { currency: 'eur', exchangeRate: 3 });
    await nextTick();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(
      wrapper
        .findAllComponents(FloatInputStub)
        .find((input) => input.props('size') === 'medium')
        ?.props('value')
    ).toBe(amount);
    Object.assign(wallet, { currency: 'usd', exchangeRate: 2 });
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
