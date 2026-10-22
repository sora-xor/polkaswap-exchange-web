import { FPNumber } from '@sora-substrate/sdk';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SFloatInput from '@/lib/soramitsu-ui/components/Input/SFloatInput.vue';
import SSlider from '@/components/shared/compat/SSlider.vue';
import RemoveLiquidityForm from '@/modules/pool/components/RemoveLiquidity/Form.vue';

const poolStore = reactive({
  removeLiquidityRemovePart: '10',
  removeLiquidityLiquidityAmount: '10',
  removeLiquidityFirstTokenAmount: '2',
  removeLiquiditySecondTokenAmount: '3',
  removeLiquidityFocusedField: null,
  removeLiquidityLiquidity: null,
  removeLiquidityLiquidityBalanceFull: FPNumber.fromNatural(100),
  removeLiquidityLiquidityBalance: FPNumber.fromNatural(100),
  removeLiquidityDemeterLockedBalance: FPNumber.ZERO,
  removeLiquidityCeresLockedBalance: FPNumber.ZERO,
  removeLiquidityFirstToken: { address: 'first', symbol: 'FIRST' },
  removeLiquiditySecondToken: { address: 'second', symbol: 'SECOND' },
  removeLiquidityFirstTokenBalance: FPNumber.fromNatural(100),
  removeLiquiditySecondTokenBalance: FPNumber.fromNatural(100),
  removeLiquidityShareOfPool: '',
  removeLiquidityPrice: '',
  removeLiquidityPriceReversed: '',
  setRemoveLiquidityPart: vi.fn(async (value: string) => {
    poolStore.removeLiquidityRemovePart = value;
  }),
  setRemoveLiquidityFocusedField: vi.fn(),
  resetRemoveLiquidityFocusedField: vi.fn(),
});

vi.mock('@/stores/pool', () => ({ usePoolStore: () => poolStore }));
vi.mock('@/stores/assets', () => ({ useAssetsStore: () => ({ xor: null }) }));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({ isConfirmTxDialogDisabled: true, shouldBalanceBeHidden: false }),
}));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    formatCodecNumber: (value: string) => value,
    getFPNumber: (value: string | number) => new FPNumber(value),
  }),
}));
vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({ loading: ref(false), withNotifications: vi.fn() }),
}));
vi.mock('@/composables/useNetworkFeeWarning', () => ({
  useNetworkFeeWarning: () => ({
    allowFeePopup: ref(false),
    isXorSufficientForNextTx: vi.fn(() => true),
    networkFees: ref({}),
  }),
}));
vi.mock('@/composables/useNetworkFeeDialog', () => ({
  useNetworkFeeDialog: () => ({
    showWarningFeeDialog: ref(false),
    isWarningFeeDialogConfirmed: ref(false),
    openWarningFeeDialog: vi.fn(),
    closeWarningFeeDialog: vi.fn(),
    confirmNetworkFeeWariningDialog: vi.fn(),
    waitOnFeeWarningConfirmation: vi.fn(),
  }),
}));
vi.mock('@/utils', () => ({
  hasInsufficientXorForFee: () => false,
  formatDecimalPlaces: (value: FPNumber) => value.toString(),
}));
vi.mock('@/components/shared/Dialog/NetworkFeeWarning.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/components/shared/Input/TokenInput.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/components/shared/Settings/SlippageTolerance.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/modules/pool/components/RemoveLiquidity/Confirm.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/modules/pool/components/RemoveLiquidity/TransactionDetails.vue', () => ({
  default: { template: '<div />' },
}));

/** Mount the production percentage controls while isolating unrelated wallet and transaction flows. */
function mountForm() {
  return mount(RemoveLiquidityForm, {
    global: {
      components: { 's-float-input': SFloatInput, 's-slider': SSlider },
      stubs: { 's-form': { template: '<form><slot /></form>' } },
    },
  });
}

describe('Remove liquidity percentage controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    poolStore.removeLiquidityRemovePart = '10';
    poolStore.removeLiquidityLiquidityBalance = FPNumber.fromNatural(100);
  });

  it.each([
    ['', 'one-char', '0'],
    ['1', 'one-char', '1'],
    ['10', 'two-char', '10'],
    ['100', 'three-char', '100'],
  ])('renders percentage %j with separate suffix and matching slider', (value, charClass, sliderValue) => {
    poolStore.removeLiquidityRemovePart = value;
    const wrapper = mountForm();
    const percentage = wrapper.get('.s-input--remove-part');

    expect(percentage.classes()).toContain(charClass);
    expect((percentage.get('.s-input__input input').element as HTMLInputElement).value).toBe(value);
    expect(percentage.get('.s-input__right .percent').text()).toBe('%');
    expect((percentage.get('input[type="range"]').element as HTMLInputElement).value).toBe(sliderValue);
    expect(percentage.find('.el-button--max').exists()).toBe(value !== '100');
    expect(percentage.get('.s-input__bottom > .remove-part-bottom .s-slider').exists()).toBe(true);
  });

  it('updates the percentage through the real numeric input and clamps it to 100', async () => {
    const wrapper = mountForm();
    const input = wrapper.get('.s-input--remove-part .el-input__inner');

    await input.setValue('25');
    await flushPromises();

    expect(poolStore.setRemoveLiquidityPart).toHaveBeenLastCalledWith('25');
    expect(wrapper.get('.s-input--remove-part').classes()).toContain('two-char');
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).value).toBe('25');

    await input.setValue('101');
    await flushPromises();

    expect(poolStore.setRemoveLiquidityPart).toHaveBeenLastCalledWith('100');
    expect((input.element as HTMLInputElement).value).toBe('100');
    expect(wrapper.get('.s-input--remove-part').classes()).toContain('three-char');
    expect(wrapper.find('.el-button--max').exists()).toBe(false);
  });

  it('sets 100 through Max and updates both percentage controls', async () => {
    const wrapper = mountForm();

    await wrapper.get('.el-button--max').trigger('click');
    await flushPromises();

    expect(poolStore.setRemoveLiquidityPart).toHaveBeenCalledExactlyOnceWith('100');
    expect((wrapper.get('.s-input--remove-part .el-input__inner').element as HTMLInputElement).value).toBe('100');
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).value).toBe('100');
  });

  it('forwards native slider changes to the percentage input', async () => {
    const wrapper = mountForm();

    await wrapper.get('input[type="range"]').setValue('75');
    await flushPromises();

    expect(poolStore.setRemoveLiquidityPart).toHaveBeenCalledExactlyOnceWith('75');
    expect((wrapper.get('.s-input--remove-part .el-input__inner').element as HTMLInputElement).value).toBe('75');
  });

  it('disables both percentage controls when all liquidity is locked', () => {
    poolStore.removeLiquidityLiquidityBalance = FPNumber.ZERO;
    const wrapper = mountForm();

    expect((wrapper.get('.s-input--remove-part .el-input__inner').element as HTMLInputElement).disabled).toBe(true);
    expect((wrapper.get('input[type="range"]').element as HTMLInputElement).disabled).toBe(true);
    expect(wrapper.find('.el-button--max').exists()).toBe(false);
  });
});
