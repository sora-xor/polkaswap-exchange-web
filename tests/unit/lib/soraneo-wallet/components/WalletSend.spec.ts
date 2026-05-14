import { FPNumber, Operation } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { mountSetup } from '@stubs/mountSetup';

const isXorSufficientForNextTx = vi.hoisted(() => vi.fn(() => false));
const navigate = vi.hoisted(() => vi.fn());

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletPreviousRoute: () => 'Wallet',
  getWalletPreviousParams: () => ({}),
  getWalletCurrentParams: () => ({
    asset: {
      address: XOR.address,
      symbol: 'XOR',
      decimals: 18,
      balance: { transferable: '1000000000000000000' },
    },
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    accountAssets: [],
    isConfirmTxDialogDisabled: false,
    navigate,
    transfer: vi.fn(),
    vestedTransfer: vi.fn(),
    getVestedTransferFee: vi.fn(),
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

describe('Wallet WalletSend', () => {
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

  it('passes vesting periods through the current select options contract', () => {
    expect(walletSendSource).toContain(':options="vestingPeriodOptions"');
    expect(walletSendSource).not.toContain('<s-option');
  });
});
