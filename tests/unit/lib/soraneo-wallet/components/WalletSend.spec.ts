import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';

import { mountSetup } from '@stubs/mountSetup';
import SFloatInput from '@/lib/soramitsu-ui/components/Input/SFloatInput.vue';

const isXorSufficientForNextTx = vi.hoisted(() => vi.fn(() => false));
const navigate = vi.hoisted(() => vi.fn());
const currentRouteParams = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const walletStoreMock = vi.hoisted(() => ({
  accountAssets: [] as Array<Record<string, unknown>>,
  isConfirmTxDialogDisabled: false,
  transfer: vi.fn(),
  vestedTransfer: vi.fn(),
  getVestedTransferFee: vi.fn(),
}));

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletPreviousRoute: () => 'Wallet',
  getWalletPreviousParams: () => ({}),
  getWalletCurrentParams: () => currentRouteParams.value,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    ...walletStoreMock,
    navigate,
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useTransaction', () => ({
  useTransaction: () => ({
    t: (key: string) => key,
    account: ref({ address: 'sender' }),
    loading: ref(false),
    dayjsLocale: ref('en'),
    formatDate: vi.fn(() => ''),
    getFPNumber: vi.fn((value: string | number) => new FPNumber(value)),
    getFPNumberFromCodec: vi.fn((value: string) => FPNumber.fromCodecValue(value)),
    getStringFromCodec: vi.fn((value: string) => FPNumber.fromCodecValue(value).toString()),
    formatCodecNumber: vi.fn((value: string) => FPNumber.fromCodecValue(value).toLocaleString()),
    formatStringValue: vi.fn((value: string) => value),
    MaxInputNumber: '1000000',
    shouldBalanceBeHidden: ref(false),
    withNotifications: vi.fn((handler: () => Promise<unknown>) => handler()),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getFiatBalance: vi.fn(),
    getFiatAmountByString: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useCopyAddress', () => ({
  useCopyAddress: () => ({
    handleCopyAddress: vi.fn(),
    copyTooltip: vi.fn((value: string) => value),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNetworkFeeWarning', () => ({
  useNetworkFeeWarning: () => ({
    allowFeePopup: ref(true),
    networkFees: ref({ Transfer: '0' }),
    isXorSufficientForNextTx,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    hasEnoughXor: vi.fn(() => true),
    assets: {
      getAssetBalanceObservable: vi.fn(() => ({ subscribe: vi.fn() })),
    },
  },
}));

import WalletSend from '@/lib/soraneo-wallet/src/components/WalletSend.vue';
import walletSendSource from '@/lib/soraneo-wallet/src/components/WalletSend.vue?raw';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';

const createAsset = (address: string, symbol: string, transferable = '1000000000000000000') => ({
  address,
  symbol,
  name: symbol,
  decimals: 18,
  balance: { transferable },
});

const SCardStub = defineComponent({
  name: 'SCardStub',
  template: '<section class="s-card-stub"><header><slot name="header" /></header><main><slot /></main></section>',
});

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  template: '<button type="button" @click="$emit(\'click\', $event)"><slot /></button>',
});

const AddressBookInputStub = defineComponent({
  name: 'AddressBookInput',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue', 'update:name'],
  template:
    '<input class="address-book-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
});

describe('Wallet WalletSend', () => {
  beforeEach(() => {
    const xorAsset = createAsset(XOR.address, 'XOR');

    currentRouteParams.value = { asset: xorAsset };
    walletStoreMock.accountAssets = [xorAsset];
    walletStoreMock.isConfirmTxDialogDisabled = false;
    walletStoreMock.transfer.mockClear();
    walletStoreMock.vestedTransfer.mockClear();
    walletStoreMock.getVestedTransferFee.mockClear();
    isXorSufficientForNextTx.mockClear().mockReturnValue(false);
    navigate.mockClear();
  });

  it('routes through the fee warning step when the next transaction would fail the XOR fee check', async () => {
    const { state } = mountSetup(WalletSend as any, {}, { emit: vi.fn() });

    state.amount.value = '1';
    await state.handleSend();

    expect(isXorSufficientForNextTx).toHaveBeenCalledWith({
      type: Operation.Transfer,
      isXor: true,
      amount: expect.any(FPNumber),
    });
    expect(state.showAdditionalInfo.value).toBe(false);
    expect(state.step.value).toBe(2);
  });

  it('routes back through the wallet store navigation boundary from the first step', () => {
    const { state } = mountSetup(WalletSend as any, {}, { emit: vi.fn() });

    state.handleBack();

    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet, params: {} });
  });

  it('shows MAX for a funded non-XOR send asset and applies the full transferable balance', async () => {
    const daiAsset = createAsset('0xdai', 'DAI', '5000000000000000000');
    currentRouteParams.value = { asset: daiAsset };
    walletStoreMock.accountAssets = [daiAsset];

    const { state } = mountSetup(WalletSend as any, {}, { emit: vi.fn() });

    expect(state.isMaxButtonAvailable.value).toBe(true);

    state.amount.value = '5';
    expect(state.isMaxButtonAvailable.value).toBe(true);

    await state.handleMaxClick();

    expect(state.amount.value).toBe('5');
  });

  it('keeps the amount input focused across successive model updates', async () => {
    const wrapper = mount(WalletSend as any, {
      attachTo: document.body,
      global: {
        components: {
          's-float-input': SFloatInput,
        },
        directives: {
          loading: () => undefined,
        },
        stubs: {
          's-card': SCardStub,
          's-button': SButtonStub,
          's-tooltip': { template: '<span><slot /></span>' },
          's-icon': true,
          's-select': true,
          's-date-picker': true,
          AddressBookInput: AddressBookInputStub,
          FormattedAmount: true,
          FormattedAmountWithFiatValue: true,
          TokenLogo: true,
          WalletFee: true,
        },
      },
    });
    const { element } = wrapper;
    const amountInput = element.querySelector<HTMLInputElement>('.wallet-send-input input.el-input__inner');

    expect(amountInput).toBeTruthy();

    amountInput!.focus();
    expect(document.activeElement).toBe(amountInput);

    amountInput!.value = '1';
    amountInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(amountInput);

    amountInput!.value = '12';
    amountInput!.dispatchEvent(new Event('input', { bubbles: true }));
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(amountInput);

    await new Promise((resolve) => setTimeout(resolve, 150));
    await wrapper.vm.$nextTick();

    expect(document.activeElement).toBe(amountInput);

    wrapper.unmount();
  });

  it('passes vesting periods through the current select options contract', () => {
    expect(walletSendSource).toContain(':options="vestingPeriodOptions"');
    expect(walletSendSource).not.toContain('<s-option');
  });
});
