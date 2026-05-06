import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.hoisted(() => vi.fn());
const showAppNotification = vi.hoisted(() => vi.fn());
const walletMockState = vi.hoisted(() => ({
  assetsDataTable: {} as Record<string, unknown>,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    get assetsDataTable() {
      return walletMockState.assetsDataTable;
    },
    navigate,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    showAppNotification,
    t: (key: string) => key,
  }),
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    getPublicKeyByAddress: () => 'public-key',
  },
}));

vi.mock('@/lib/soraneo-wallet/src/util', () => ({
  formatAccountAddress: (value: string) => value,
}));

import { RouteNames } from '@/lib/soraneo-wallet/src/consts';
import { useQrCodeParser } from '@/lib/soraneo-wallet/src/composables/useQrCodeParser';

describe('useQrCodeParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletMockState.assetsDataTable = {};
  });

  it('routes plain addresses through the wallet store boundary', async () => {
    const state = useQrCodeParser();

    await state.parseQrCodeValue('cnRecipient');

    expect(navigate).toHaveBeenCalledWith({
      name: RouteNames.SelectAsset,
      params: { address: 'cnRecipient' },
    });
  });

  it('routes receive-by-qr flows through the wallet store boundary', () => {
    const asset = { address: 'xor', symbol: 'XOR' } as any;
    const state = useQrCodeParser();

    state.receiveByQrCode(asset);

    expect(navigate).toHaveBeenCalledWith({
      name: RouteNames.ReceiveToken,
      params: { asset },
    });
  });
});
