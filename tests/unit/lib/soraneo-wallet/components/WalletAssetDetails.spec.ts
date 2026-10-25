import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountSetup } from '@stubs/mountSetup';

const { formatCodecNumber, getFiatAmountByCodecString, isCodecZero, navigate, xorAsset } = vi.hoisted(() => {
  const total = '2590170178834271700758';

  return {
    formatCodecNumber: vi.fn((value: string) => value),
    getFiatAmountByCodecString: vi.fn((value: string) => `fiat:${value}`),
    isCodecZero: vi.fn((value: string) => value === '0'),
    navigate: vi.fn(),
    xorAsset: {
      address: '0x0200000000000000000000000000000000000000000000000000000000000000',
      symbol: 'XOR',
      name: 'SORA',
      content: '',
      balance: {
        bonded: '0',
        free: '1282912800090570272557',
        frozen: '9500000000000000000000',
        // A balance produced before saturating subtraction was added.
        transferable: '-8217087199909429727443',
        reserved: '1307257378743701428201',
        locked: '10807257378743701428201',
        total,
      },
      decimals: 18,
    },
  };
});

// This suite exercises the production balance field names and native XOR id.
// The shared lightweight SDK stub intentionally uses simplified placeholders.
vi.mock('@sora-substrate/sdk/build/assets/consts', () => import('@/lib/substrate/sdk/assets/consts'));

vi.mock('@/platform/wallet/navigation', () => ({
  getWalletCurrentParams: () => ({
    asset: xorAsset,
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    permissions: { sendAssets: true },
    accountAssets: [],
    history: {},
    selectedTransaction: null,
    navigate,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useOperations', () => ({
  useOperations: () => ({
    t: (key: string) => key,
    getTitle: vi.fn(() => ''),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getAssetFiatPrice: vi.fn(() => '1'),
    formatCodecNumber,
    isCodecZero,
    getFiatAmountByCodecString,
    FontSizeRate: {},
    FontWeightRate: {},
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useQrCodeParser', () => ({
  useQrCodeParser: () => ({
    parseQrCodeValue: vi.fn(),
    receiveByQrCode: vi.fn(),
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    assets: {
      isNft: vi.fn(() => false),
    },
  },
}));

import WalletAssetDetails from '@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue';
import { api } from '@/lib/soraneo-wallet/src/api';
import { Operations } from '@/lib/soraneo-wallet/src/types/common';
import { BalanceType } from '@sora-substrate/sdk/build/assets/consts';

describe('Wallet WalletAssetDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xorAsset.content = '';
  });

  it('keeps NFT details usable when chain content is malformed', () => {
    xorAsset.content = '../api/v0/version';
    vi.mocked(api.assets.isNft).mockReturnValueOnce(true);
    const { state } = mountSetup(WalletAssetDetails as any, {});

    expect(state.isNft.value).toBe(true);
    expect(state.nftContentLink.value).toBe('');
    expect(state.displayedNftContentLink.value).toBe('');
  });

  it('navigates to send for the send action and emits the rest', () => {
    const emit = vi.fn();
    const { state } = mountSetup(WalletAssetDetails as any, {}, { emit });

    state.handleOperation(Operations.Send);
    state.handleOperation(Operations.Swap);

    expect(navigate).toHaveBeenCalledWith({ name: 'WalletSend', params: { asset: state.asset.value } });
    expect(emit).toHaveBeenCalledWith(Operations.Swap, state.asset.value);
  });

  it('shows total ownership while safely treating a legacy negative transferable balance as zero', () => {
    const { state } = mountSetup(WalletAssetDetails as any, {});

    expect(state.asset.value).toEqual(xorAsset);
    expect(state.balance.value).toBe(xorAsset.balance.total);
    expect(state.spendableBalance.value).toBe('0');
    expect(state.getBalanceValue(BalanceType.Total)).toBe(xorAsset.balance.total);
    expect(state.getBalanceValue(BalanceType.Transferable)).toBe('0');
    expect(formatCodecNumber).toHaveBeenCalledWith(xorAsset.balance.total, xorAsset.decimals);
    expect(state.operations.value).toContainEqual({ type: Operations.Send, icon: 'finance-send-24' });
    expect(state.isOperationDisabled(Operations.Send)).toBe(true);
    expect(isCodecZero).toHaveBeenCalledWith('0', xorAsset.decimals);
  });

  it('identifies XOR whose entire owned balance is restricted', () => {
    const { state } = mountSetup(WalletAssetDetails as any, {});

    expect(state.asset.value.address).toBe(xorAsset.address);
    expect(state.isXorFullyRestricted.value).toBe(true);
    expect(state.isXor.value).toBe(true);
  });

  it('uses total ownership for fiat and exposes only non-overlapping balance breakdown fields', () => {
    const { state } = mountSetup(WalletAssetDetails as any, {});

    expect(state.balanceTypes).toEqual([
      BalanceType.Total,
      BalanceType.Transferable,
      [BalanceType.Free, BalanceType.Frozen, BalanceType.Reserved, BalanceType.Bonded],
    ]);

    expect(state.getSafeFiatBalance(BalanceType.Total)).toBe(`fiat:${xorAsset.balance.total}`);
    expect(getFiatAmountByCodecString).toHaveBeenCalledWith(xorAsset.balance.total, state.asset.value);
  });
});
