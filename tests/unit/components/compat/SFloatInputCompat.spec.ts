import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import SFloatInput from '@/lib/soramitsu-ui/components/Input/SFloatInput.vue';
import { formatDecimalDisplay } from '@/lib/soramitsu-ui/components/Input/amountDisplay';
import { clampDecimalInput } from '@/lib/soramitsu-ui/components/Input/amountBounds';

describe('SFloatInput', () => {
  it.each([
    ['max', '123456789012345678.123456789012345679', '123456789012345678.123456789012345678'],
    ['max', '123456789012345678.123456789012345677', '123456789012345678.123456789012345677'],
    ['min', '123456789012345678.123456789012345677', '123456789012345678.123456789012345678'],
    ['min', '123456789012345678.123456789012345679', '123456789012345678.123456789012345679'],
  ])('compares %s bounds exactly when large amounts differ by one wei', async (bound, candidate, expected) => {
    const wrapper = mount(SFloatInput, {
      props: { decimals: 18, [bound]: '123456789012345678.123456789012345678' },
    });
    await wrapper.get('input').setValue(candidate);
    expect(wrapper.emitted('update:modelValue')).toEqual([[expected]]);
    expect(wrapper.emitted('change')).toEqual([[expected]]);
  });

  it('keeps bounded trailing zeros and locale focus/blur as display-only changes', async () => {
    const value = '123456789012345678.123456789012345670';
    const wrapper = mount(SFloatInput, {
      props: {
        value,
        min: '123456789012345678.123456789012345669',
        max: '123456789012345678.123456789012345678',
        decimals: 18,
        hasLocaleString: true,
        formatOnBlur: true,
        delimiters: { decimal: ',', thousand: '.' },
      },
    });
    const input = wrapper.get('input');
    await input.trigger('focus');
    expect(input.element.value).toBe('123456789012345678,123456789012345670');
    await input.setValue('123456789012345678,123456789012345670');
    await input.trigger('blur');
    await input.trigger('focus');
    await input.trigger('blur');
    expect(input.element.value).toBe('123.456.789.012.345.678,123456789012345670');
    expect(wrapper.emitted('update:modelValue')).toEqual([[value]]);
  });

  it('handles signed, scientific and invalid bounds without losing digits', () => {
    expect(clampDecimalInput('-1.000000000000000002', '-1.000000000000000001')).toBe('-1.000000000000000001');
    expect(clampDecimalInput('0.000000000000000002', undefined, 1e-18)).toBe('0.000000000000000001');
    expect(clampDecimalInput('2000', undefined, '1.123456789012345678e3')).toBe('1123.456789012345678');
    expect(clampDecimalInput('3', undefined, '2.5000')).toBe('2.5000');
    expect(clampDecimalInput('2.5000', '2.5', '2.5')).toBe('2.5000');
    expect(clampDecimalInput('1.', 'NaN', 'Infinity')).toBe('1.');
    expect(clampDecimalInput('-', '0', '1')).toBe('-');
  });

  it('groups unfocused amounts without changing precision or emitting model changes', async () => {
    const amount = '9007199254740993.123456789012345678';
    const wrapper = mount(SFloatInput, {
      props: { value: amount, decimals: 18, hasLocaleString: true, formatOnBlur: true },
      attrs: { 'aria-label': 'From XOR amount', inputmode: 'decimal' },
    });
    const input = wrapper.get('input');
    expect((input.element as HTMLInputElement).value).toBe('9,007,199,254,740,993.123456789012345678');
    expect(input.attributes('aria-label')).toBe('From XOR amount');
    expect(input.attributes('inputmode')).toBe('decimal');
    await input.trigger('focus');
    expect((input.element as HTMLInputElement).value).toBe(amount);
    await input.trigger('blur');
    expect((input.element as HTMLInputElement).value).toBe('9,007,199,254,740,993.123456789012345678');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('formats locale separators and preserves small decimals and trailing zeros', () => {
    expect(formatDecimalDisplay('12345.6700', ',', '.')).toBe('12.345,6700');
    expect(formatDecimalDisplay('0.000000000000000001')).toBe('0.000000000000000001');
    expect(formatDecimalDisplay('12345.')).toBe('12,345.');
    expect(formatDecimalDisplay('')).toBe('');
    expect(formatDecimalDisplay('-12345.6')).toBe('-12,345.6');
  });

  it('preserves the canonical decimal through focus and edits with locale separators', async () => {
    const wrapper = mount(SFloatInput, {
      props: {
        value: '12345.6700',
        hasLocaleString: true,
        formatOnBlur: true,
        delimiters: { decimal: ',', thousand: '.' },
      },
    });
    const input = wrapper.get('input');
    expect((input.element as HTMLInputElement).value).toBe('12.345,6700');
    await input.trigger('focus');
    expect((input.element as HTMLInputElement).value).toBe('12345,6700');
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await input.trigger('focus');
    await input.setValue('12345,6701');
    await input.trigger('blur');
    expect(wrapper.emitted('update:modelValue')).toEqual([['12345.6701']]);
    expect((input.element as HTMLInputElement).value).toBe('12.345,6701');
  });

  it('emits sanitized numeric values for locale-style input', async () => {
    const wrapper = mount(SFloatInput, {
      props: {
        hasLocaleString: true,
        decimals: 2,
      },
    });

    const input = wrapper.find('input.el-input__inner');
    await input.setValue('1,234.567abc');

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['1234.56']);
  });

  it('renders top and bottom slots and exposes imperative focus api', async () => {
    const wrapper = mount(SFloatInput, {
      attachTo: document.body,
      slots: {
        top: '<div class="slot-top">Top slot</div>',
        right: '<button class="slot-right">Right slot</button>',
        bottom: '<div class="slot-bottom">Bottom slot</div>',
      },
    });

    expect(wrapper.find('.slot-top').exists()).toBe(true);
    expect(wrapper.find('.slot-right').exists()).toBe(true);
    expect(wrapper.find('.slot-bottom').exists()).toBe(true);

    (wrapper.vm as any).focus();
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(wrapper.find('input.el-input__inner').element);

    wrapper.unmount();
  });

  it('applies legacy disabled compatibility classes', () => {
    const wrapper = mount(SFloatInput, {
      props: {
        disabled: true,
      },
    });

    expect(wrapper.classes()).toEqual(expect.arrayContaining(['is-disabled', 's-disabled']));
  });

  it('prefers the explicit readonly prop over a leaked readonly attr', () => {
    const wrapper = mount(SFloatInput, {
      props: {
        readonly: false,
      },
      attrs: {
        readonly: true,
      },
    });

    const input = wrapper.find('input.el-input__inner');

    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).readOnly).toBe(false);
    expect(input.attributes('readonly')).toBeUndefined();
  });
});
