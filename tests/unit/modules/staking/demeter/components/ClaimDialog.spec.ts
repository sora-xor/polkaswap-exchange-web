import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ClaimDialog from '@/modules/staking/demeter/components/ClaimDialog.vue';

const buttonStub = defineComponent({
  name: 'SButtonStub',
  props: ['disabled', 'loading'],
  emits: ['click'],
  template: `<button class="s-button-stub" :disabled="disabled" @click="$emit('click')"><slot /></button>`,
});

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    WALLET_CONSTS: { FontSizeRate: { SMALL: 'small', MEDIUM: 'medium' } },
    components: {
      DialogBase: defineComponent({
        name: 'DialogBaseStub',
        props: ['visible', 'title'],
        emits: ['update:visible'],
        template: `<div class="dialog-base-stub"><slot /></div>`,
      }),
      InfoLine: defineComponent({
        name: 'InfoLineStub',
        props: ['label', 'value', 'fiatValue', 'assetSymbol', 'labelTooltip', 'isFormatted'],
        template: `<div class="info-line-stub"></div>`,
      }),
      TokenLogo: defineComponent({
        name: 'TokenLogoStub',
        props: ['token', 'size'],
        template: `<div class="token-logo-stub"></div>`,
      }),
      FormattedAmount: defineComponent({
        name: 'FormattedAmountStub',
        props: ['value', 'assetSymbol', 'fontSizeRate', 'isFiatValue', 'valueCanBeHidden'],
        template: `<div class="formatted-amount-stub"></div>`,
      }),
    },
  });
});

vi.mock('@/modules/staking/demeter/router', () => ({
  demeterStakingLazyComponent: () =>
    defineComponent({
      name: 'DialogTitleStub',
      props: ['baseAsset', 'poolAsset', 'isFarm'],
      template: `<div class="dialog-title-stub"></div>`,
    }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, payload?: Record<string, unknown>) => (payload ? `${key}:${JSON.stringify(payload)}` : key),
    TranslationConsts: { APR: 'apr' },
  }),
}));

const useDemeterPoolStatusMock = vi.fn();
vi.mock('@/modules/staking/demeter/composables/useDemeterPoolStatus', () => ({
  useDemeterPoolStatus: (...args: unknown[]) => useDemeterPoolStatusMock(...args),
}));

const useDemeterPoolCardMock = vi.fn();
vi.mock('@/modules/staking/demeter/composables/useDemeterPoolCard', () => ({
  useDemeterPoolCard: (...args: unknown[]) => useDemeterPoolCardMock(...args),
}));

const buildStatusApi = (overrides: Record<string, unknown> = {}) => ({
  liquidity: ref(null),
  pool: ref({}),
  accountPool: ref({ address: 'accountPool' }),
  poolAsset: ref({}),
  rewardAsset: ref({ symbol: 'RWD' }),
  getFiatAmountByCodecString: vi.fn().mockReturnValue('0.1'),
  ...overrides,
});

const buildCardApi = (overrides: Record<string, unknown> = {}) => ({
  rewardAssetSymbol: ref('RWD'),
  rewardsFormatted: ref('10'),
  rewardsFiat: ref('$10'),
  networkFee: ref('1000'),
  networkFeeFormatted: ref('0.000001'),
  isInsufficientXorForFee: ref(false),
  ...overrides,
});

const baseProps = {
  visible: true,
  parentLoading: false,
  pool: {},
  accountPool: { address: 'accountPool' },
  poolAsset: { symbol: 'LP' },
  rewardAsset: { symbol: 'RWD' },
};

describe('Demeter ClaimDialog', () => {
  beforeEach(() => {
    useDemeterPoolStatusMock.mockReturnValue(buildStatusApi());
    useDemeterPoolCardMock.mockReturnValue(buildCardApi());
  });

  it('emits confirm with account pool data when button clicked', async () => {
    const wrapper = mount(ClaimDialog, {
      props: baseProps,
      global: {
        stubs: {
          's-button': buttonStub,
        },
      },
    });

    const button = wrapper.findComponent(buttonStub);
    await button.vm.$emit('click');
    expect(wrapper.emitted('confirm')).toEqual([[{ address: 'accountPool' }]]);
  });

  it('disables confirm button when XOR fee is insufficient', async () => {
    useDemeterPoolCardMock.mockReturnValue(buildCardApi({ isInsufficientXorForFee: ref(true) }));
    const wrapper = mount(ClaimDialog, {
      props: baseProps,
      global: {
        stubs: {
          's-button': buttonStub,
        },
      },
    });

    const button = wrapper.find('button.s-button-stub');
    expect(button.attributes('disabled')).toBeDefined();
  });
});
