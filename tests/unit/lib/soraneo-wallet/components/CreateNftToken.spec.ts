import { FPNumber } from '@sora-substrate/sdk';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());
const getCorrectSupply = vi.hoisted(() => vi.fn((value: string) => value));
const isXorSufficientForNextTx = vi.hoisted(() => vi.fn(() => false));
const registerAssetMock = vi.hoisted(() => vi.fn());

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    nftStorage: null,
    isConfirmTxDialogDisabled: false,
    createNftStorageInstance: vi.fn(),
    navigate,
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
    getCorrectSupply,
    getFPNumberFromCodec: vi.fn((value: string) => FPNumber.fromCodecValue(value, 18)),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNetworkFeeWarning', () => ({
  useNetworkFeeWarning: () => ({
    allowFeePopup: ref(true),
    networkFees: ref({ RegisterAsset: '1' }),
    xorBalance: ref(FPNumber.fromCodecValue('2', 18)),
    isXorSufficientForNextTx,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      register: registerAssetMock,
    },
  },
}));

import CreateNftToken from '@/lib/soraneo-wallet/src/components/CreateNftToken.vue';
import { RouteNames, Step } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet CreateNftToken', () => {
  it('routes through the fee warning step when the register-asset fee would block the next transaction', async () => {
    const emit = vi.fn();
    const state = (CreateNftToken as any).setup(
      { step: Step.CreateNftToken },
      { attrs: {}, emit, expose: vi.fn(), slots: {} }
    );

    state.tokenSymbol.value = 'NFT';
    state.tokenSupply.value = '1';
    state.tokenDescription.value = 'Test NFT';
    state.tokenName.value = 'Sample';
    state.tokenContentLink.value = 'https://example.com/nft.png';
    state.contentSrcLink.value = 'https://example.com/nft.png';

    await state.onCreate();

    expect(getCorrectSupply).toHaveBeenCalledWith('1', 0);
    expect(state.showFee.value).toBe(false);
    expect(emit).toHaveBeenNthCalledWith(1, 'showTabs');
    expect(emit).toHaveBeenNthCalledWith(2, 'showHeader');
    expect(emit).toHaveBeenNthCalledWith(3, 'stepChange', Step.Warn);
  });

  it('navigates back to wallet after confirming NFT creation through the wallet store boundary', async () => {
    const emit = vi.fn();
    const state = (CreateNftToken as any).setup(
      { step: Step.ConfirmNftToken },
      { attrs: {}, emit, expose: vi.fn(), slots: {} }
    );

    state.tokenSymbol.value = 'NFT';
    state.tokenSupply.value = '1';
    state.tokenDescription.value = 'Test NFT';
    state.tokenName.value = 'Sample';
    state.tokenContentLink.value = 'https://example.com/nft.png';
    state.contentSrcLink.value = 'https://example.com/nft.png';
    state.tokenContentIpfsParsed.value = 'QmToken';

    await state.onConfirm();

    expect(registerAssetMock).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });
});
