import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';

import AnimatedAmount from '@/features/rewards/components/rewards/AnimatedAmount.vue';
import RewardsSegmentValue from '@/features/rewards/components/rewards/RewardsSegmentValue.vue';
import { FPNumber } from '@sora-substrate/sdk';

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'FormattedAmountStub',
    props: {
      value: String,
      assetSymbol: String,
      isFiatValue: Boolean,
      symbolAsDecimal: Boolean,
      valueCanBeHidden: Boolean,
      fiatDefaultRounding: Boolean,
    },
    setup(props) {
      return () =>
        h(
          'formatted-amount',
          {
            'data-fiat': String(props.isFiatValue),
            'data-asset': props.assetSymbol,
            'data-hideable': String(props.valueCanBeHidden),
          },
          [props.value as string]
        );
    },
  }),
}));

const ORIGINAL_DELIMITERS = { ...FPNumber.DELIMITERS_CONFIG };

/** Switches the app number format to German: `.` groups thousands and `,` is the decimal mark. */
const useGermanDelimiters = () => Object.assign(FPNumber.DELIMITERS_CONFIG, { thousand: '.', decimal: ',' });

const stubMotion = (reduced: boolean) => {
  const query = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );
  window.matchMedia = globalThis.matchMedia;
};

beforeEach(() => {
  // Reduced motion: the counted value lands on its target immediately.
  stubMotion(true);
});

afterEach(() => {
  Object.assign(FPNumber.DELIMITERS_CONFIG, ORIGINAL_DELIMITERS);
  vi.unstubAllGlobals();
});

describe('AnimatedAmount.vue', () => {
  it('groups the digits of token amounts like the rest of the app', () => {
    const wrapper = mount(AnimatedAmount, { props: { value: '73650.25', assetSymbol: 'PSWAP' } });

    expect(wrapper.find('formatted-amount').text()).toBe('73,650.25');
    expect(wrapper.find('formatted-amount').attributes('data-asset')).toBe('PSWAP');
  });

  it('flags fiat values, so the wallet component applies the user currency', () => {
    const wrapper = mount(AnimatedAmount, { props: { value: '275.34', isFiatValue: true } });

    expect(wrapper.find('formatted-amount').text()).toBe('275.34');
    expect(wrapper.find('formatted-amount').attributes('data-fiat')).toBe('true');
  });

  it('formats fiat and token amounts with the delimiters of the app language', () => {
    // The wallet component reads its value with these delimiters: a plain `1234.5` would be read as 12,345.
    useGermanDelimiters();

    const fiat = mount(AnimatedAmount, { props: { value: '1234.5', isFiatValue: true } });
    const token = mount(AnimatedAmount, { props: { value: '73650.25', assetSymbol: 'PSWAP' } });

    expect(fiat.find('formatted-amount').text()).toBe('1.234,5');
    expect(token.find('formatted-amount').text()).toBe('73.650,25');
  });

  it('passes the hide-balance and symbol options through', () => {
    const wrapper = mount(AnimatedAmount, {
      props: { value: '1', assetSymbol: 'VAL', valueCanBeHidden: true, symbolAsDecimal: true },
    });

    expect(wrapper.find('formatted-amount').attributes('data-hideable')).toBe('true');
  });

  it('renders no number for an empty or invalid value', async () => {
    const wrapper = mount(AnimatedAmount, { props: { value: '' } });

    expect(wrapper.find('formatted-amount').text()).toBe('');

    await wrapper.setProps({ value: 'not a number' });
    expect(wrapper.find('formatted-amount').text()).toBe('');

    await wrapper.setProps({ value: '12' });
    expect(wrapper.find('formatted-amount').text()).toBe('12');
  });

  it('follows the value when it changes', async () => {
    const wrapper = mount(AnimatedAmount, { props: { value: '10', isFiatValue: true } });

    await wrapper.setProps({ value: '20.5' });
    await nextTick();

    expect(wrapper.find('formatted-amount').text()).toBe('20.5');
  });
});

describe('RewardsSegmentValue.vue', () => {
  const PSWAP = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 } as never;
  const VAL = { address: '0xval', symbol: 'VAL', decimals: 18 } as never;
  const amounts = [
    { asset: PSWAP, amount: new FPNumber('1234.5') },
    { asset: VAL, amount: new FPNumber('2') },
  ];

  it('shows the fiat value when it is known and preferred', () => {
    const wrapper = mount(RewardsSegmentValue, { props: { amounts, fiat: new FPNumber('9.5') } });
    const values = wrapper.findAll('formatted-amount');

    expect(values).toHaveLength(1);
    expect(values[0].attributes('data-fiat')).toBe('true');
    expect(values[0].text()).toBe('9.5');
  });

  it('formats the fiat value with the delimiters of the app language', () => {
    useGermanDelimiters();

    const wrapper = mount(RewardsSegmentValue, { props: { amounts, fiat: new FPNumber('1234.5') } });

    expect(wrapper.find('formatted-amount').text()).toBe('1.234,5');
  });

  it('lists token amounts, grouped, when fiat is not preferred or unknown', () => {
    const preferred = mount(RewardsSegmentValue, { props: { amounts, fiat: new FPNumber('9.5'), preferFiat: false } });
    const unknown = mount(RewardsSegmentValue, { props: { amounts } });

    for (const wrapper of [preferred, unknown]) {
      const values = wrapper.findAll('formatted-amount');

      expect(values.map((value) => value.text())).toEqual(['1,234.5', '2']);
      expect(values.map((value) => value.attributes('data-asset'))).toEqual(['PSWAP', 'VAL']);
    }
  });
});
