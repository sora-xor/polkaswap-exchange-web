import { FPNumber } from '@sora-substrate/sdk';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const pricing = vi.hoisted(() => ({ multiplier: 2 as number | null }));

const FormattedAmountStub = defineComponent({
  name: 'FormattedAmountStub',
  props: ['value', 'assetSymbol', 'fontSizeRate', 'isFiatValue'],
  setup(props) {
    return () =>
      h(
        'formatted-amount',
        {
          class: 'formatted',
          value: props.value as string,
          'data-asset': props.assetSymbol,
          'data-fiat': props.isFiatValue ? 'true' : 'false',
        },
        props.value as string
      );
  },
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAmount: FormattedAmountStub,
    },
  });
});

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', () => ({
  __esModule: true,
  default: FormattedAmountStub,
}));

vi.mock('@/lib/soraneo-wallet/src/components/TokenLogo.vue', () => ({
  __esModule: true,
  default: defineComponent({
    name: 'TokenLogoStub',
    props: ['token', 'size'],
    setup(props) {
      return () => h('i', { class: 'token-logo-stub', 'data-symbol': (props.token as { symbol: string }).symbol });
    },
  }),
}));

vi.mock('@/composables/useFormattedAmount', async () => {
  const { FPNumber } = await import('@sora-substrate/sdk');

  return {
    useFormattedAmount: () => ({
      getFPNumber: (value: string | number) => new FPNumber(value),
      getFPNumberFiatAmountByFPNumber: (amount: InstanceType<typeof FPNumber>) =>
        pricing.multiplier === null ? null : amount.mul(new FPNumber(pricing.multiplier)),
      Zero: FPNumber.ZERO,
    }),
  };
});

const PSWAP = { symbol: 'PSWAP', address: '0xpswap', decimals: 18 } as never;
const VAL = { symbol: 'VAL', address: '0xval', decimals: 18 } as never;

let AmountHeader: (typeof import('@/features/rewards/components/rewards/AmountHeader.vue'))['default'];

beforeEach(async () => {
  pricing.multiplier = 2;
  // Reduced motion: the count-up lands on its target immediately, so no animation frames outlive a test.
  const query = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );
  window.matchMedia = globalThis.matchMedia;

  AmountHeader = (await import('@/features/rewards/components/rewards/AmountHeader.vue')).default;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RewardsAmountHeader.vue', () => {
  it('shows the fiat total in the big slot and a chip per token', () => {
    const wrapper = mount(AmountHeader, {
      props: {
        items: [
          { asset: PSWAP, amount: '1000' },
          { asset: VAL, amount: '500' },
        ],
      },
    });

    const amounts = wrapper.findAll('formatted-amount');

    expect(amounts).toHaveLength(3);
    expect(amounts[0].attributes('data-fiat')).toBe('true');
    // The wallet component reads this value in the app language, so it arrives formatted like `totalFiatValue`.
    expect(amounts[0].attributes('value')).toBe('3,000');
    expect(amounts[1].attributes('data-asset')).toBe('PSWAP');
    expect(amounts[1].attributes('value')).toBe('1,000');
    expect(amounts[2].attributes('data-asset')).toBe('VAL');
    expect(amounts[2].attributes('value')).toBe('500');
    expect(wrapper.findAll('.token-logo-stub').map((logo) => logo.attributes('data-symbol'))).toEqual(['PSWAP', 'VAL']);
    expect((wrapper.vm as { totalFiatValue: string | null }).totalFiatValue).toBe('3,000');
  });

  it('puts the first token amount in the big slot when nothing can be priced', () => {
    pricing.multiplier = null;

    const wrapper = mount(AmountHeader, {
      props: {
        items: [
          { asset: PSWAP, amount: '1000' },
          { asset: VAL, amount: '500' },
        ],
      },
    });

    const amounts = wrapper.findAll('formatted-amount');

    expect(amounts).toHaveLength(2);
    expect(amounts[0].attributes('data-fiat')).toBe('false');
    expect(amounts[0].attributes('data-asset')).toBe('PSWAP');
    // The token in the big slot is not repeated as a chip.
    expect(amounts[1].attributes('data-asset')).toBe('VAL');
    expect(wrapper.findAll('.amount-block')).toHaveLength(1);
    expect((wrapper.vm as { totalFiatValue: string | undefined }).totalFiatValue).toBeUndefined();
  });

  it('reads as zero when there is nothing to claim', () => {
    const wrapper = mount(AmountHeader, { props: { items: [{ asset: PSWAP, amount: '' }] } });

    const amounts = wrapper.findAll('formatted-amount');

    expect(amounts).toHaveLength(1);
    expect(amounts[0].attributes('data-fiat')).toBe('true');
    expect(amounts[0].attributes('value')).toBe('0');
    expect(wrapper.findAll('.amount-block')).toHaveLength(0);
  });

  it('ignores items that have no asset', () => {
    const wrapper = mount(AmountHeader, {
      props: {
        items: [
          { asset: undefined as never, amount: '5' },
          { asset: VAL, amount: '500' },
        ],
      },
    });

    expect(wrapper.findAll('.amount-block')).toHaveLength(1);
    expect((wrapper.vm as { totalFiatValue: string | null }).totalFiatValue).toBe('1,000');
  });

  it('keeps token math exact instead of using floats', () => {
    const wrapper = mount(AmountHeader, {
      props: {
        items: [
          { asset: PSWAP, amount: '0.1' },
          { asset: VAL, amount: '0.2' },
        ],
      },
    });

    // 0.1 + 0.2 is 0.3 in fixed-point math (a float would give 0.30000000000000004); both are doubled by the mock price.
    expect(new FPNumber((wrapper.vm as { totalFiatValue: string }).totalFiatValue).toString()).toBe('0.6');
  });
});
