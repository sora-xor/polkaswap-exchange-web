import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const storageMock = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    components: {
      FormattedAmount: defineComponent({
        name: 'FormattedAmountStub',
        props: ['value', 'assetSymbol', 'fontSizeRate'],
        setup(props) {
          return () =>
            h(
              'formatted-amount',
              {
                class: 'formatted',
                value: props.value as string,
                'data-asset': props.assetSymbol,
                'data-font': props.fontSizeRate,
              },
              props.value as string
            );
        },
      }),
    },
    WALLET_CONSTS: {
      FontSizeRate: {
        MEDIUM: 'medium',
      },
    },
  });
});

vi.mock('@/lib/soraneo-wallet/src/components/FormattedAmount.vue', async () => {
  const wallet = await import('@tests/stubs/walletRuntime');
  return {
    __esModule: true,
    default: wallet.components.FormattedAmount,
  };
});

const formatStringValueMock = vi.fn((value: string) => `formatted:${value}`);

vi.mock('@/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: formatStringValueMock,
  }),
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFPNumber: (value: string | number) => createFpNumber(Number(value)),
    getFPNumberFiatAmountByFPNumber: (fpNumber: { value: number }) => createFpNumber(fpNumber.value * 2),
    Zero: createFpNumber(0),
    formatCodecNumber: vi.fn(),
    getFPNumberFromCodec: vi.fn(),
    getFiatAmountByCodecString: vi.fn(),
    getFiatAmountByString: vi.fn(),
    getFiatAmount: vi.fn(),
  }),
}));

function createFpNumber(initial: number) {
  return {
    value: initial,
    add(other: { value: number }) {
      return createFpNumber(this.value + other.value);
    },
    toLocaleString() {
      return this.value.toFixed(2);
    },
  };
}

let AmountHeader: (typeof import('@/features/rewards/components/rewards/AmountHeader.vue'))['default'];

beforeEach(async () => {
  formatStringValueMock.mockClear();
  const module = await import('@/features/rewards/components/rewards/AmountHeader.vue');
  AmountHeader = module.default;
});

describe('RewardsAmountHeader.vue', () => {
  it('formats individual amounts and computes total fiat value', () => {
    const wrapper = mount(AmountHeader, {
      props: {
        items: [
          { asset: { symbol: 'PSWAP', decimals: 12 } as never, amount: '1000' },
          { asset: { symbol: 'VAL', decimals: 12 } as never, amount: '500' },
        ],
      },
    });

    expect(formatStringValueMock).toHaveBeenCalledWith('1000', 12);
    expect(formatStringValueMock).toHaveBeenCalledWith('500', 12);

    const formattedRows = wrapper.findAll('formatted-amount');
    expect(formattedRows).toHaveLength(3);
    expect(formattedRows[0].attributes('value')).toBe('formatted:1000');
    expect((wrapper.vm as { totalFiatValue: string | null }).totalFiatValue).toBe('3000.00');
  });
});
