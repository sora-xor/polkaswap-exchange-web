import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());
const getCorrectSupply = vi.hoisted(() => vi.fn(() => '100'));
const isXorSufficientForNextTx = vi.hoisted(() => vi.fn(() => false));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => ({
    navigate,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    isConfirmTxDialogDisabled: false,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useTransaction', () => ({
  useTransaction: () => ({
    t: (key: string) => key,
    withNotifications: vi.fn((handler: () => Promise<unknown>) => handler()),
    loading: ref(false),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNumberFormatter', () => ({
  useNumberFormatter: () => ({
    formatStringValue: vi.fn((value: string) => value),
    getCorrectSupply,
    getFPNumberFromCodec: vi.fn((value: string) => FPNumber.fromCodecValue(value, 18)),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNetworkFeeWarning', () => ({
  useNetworkFeeWarning: () => ({
    allowFeePopup: ref(true),
    networkFees: ref({ RegisterAsset: '1' }),
    isXorSufficientForNextTx,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      accountAssets: [
        {
          address: XOR.address,
          balance: { transferable: '2' },
          decimals: 18,
        },
      ],
      register: vi.fn(),
    },
  },
}));

import CreateSimpleToken from '@/lib/soraneo-wallet/src/components/CreateSimpleToken.vue';
import { Step } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateSimpleToken', () => {
  it('routes through the fee warning step when the next transaction would fail the fee check', async () => {
    const emit = vi.fn();
    const state = (CreateSimpleToken as any).setup(
      { step: Step.CreateSimpleToken },
      { attrs: {}, emit, expose: vi.fn(), slots: {} }
    );

    state.tokenSymbol.value = 'TKN';
    state.tokenSupply.value = '100';
    state.tokenName.value = 'Token';

    await state.onCreate();

    expect(getCorrectSupply).toHaveBeenCalledWith('100', 18);
    expect(state.tokenSupply.value).toBe('100');
    expect(state.showFee.value).toBe(false);
    expect(emit).toHaveBeenNthCalledWith(1, 'showTabs');
    expect(emit).toHaveBeenNthCalledWith(2, 'showHeader');
    expect(emit).toHaveBeenNthCalledWith(3, 'stepChange', Step.Warn);
  });

  it('restores the confirm step after the fee warning acknowledgment', () => {
    const emit = vi.fn();
    const state = (CreateSimpleToken as any).setup(
      { step: Step.Warn },
      { attrs: {}, emit, expose: vi.fn(), slots: {} }
    );

    state.showFee.value = false;
    state.confirmNextTxFailure();

    expect(state.showFee.value).toBe(true);
    expect(emit).toHaveBeenNthCalledWith(1, 'showHeader');
    expect(emit).toHaveBeenNthCalledWith(2, 'stepChange', Step.ConfirmSimpleToken);
  });
});
