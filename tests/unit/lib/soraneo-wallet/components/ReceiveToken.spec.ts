import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    getPublicKeyByAddress: vi.fn(() => 'abcd'),
  },
}));

import ReceiveToken from '@/lib/soraneo-wallet/src/components/ReceiveToken.vue';
import { RouteNames } from '@/lib/soraneo-wallet/src/consts';

describe('Wallet ReceiveToken', () => {
  it('builds the qr payload from the selected asset, account, and amount', () => {
    const code = (ReceiveToken as any).computed.code.call({
      account: {
        address: 'account-address',
        name: 'Primary',
      },
      asset: {
        address: 'asset-address',
      },
      amount: '12.5',
    });

    expect(code).toBe('substrate:account-address:0xabcd:Primary:asset-address:12.5');
  });

  it('navigates back to the previous wallet route', () => {
    const navigate = vi.fn();

    (ReceiveToken as any).methods.handleBack.call({
      routerStore: { navigate },
      previousRoute: RouteNames.Wallet,
      previousRouteParams: { assetId: 'asset-address' },
    });

    expect(navigate).toHaveBeenCalledWith({
      name: RouteNames.Wallet,
      params: { assetId: 'asset-address' },
    });
  });
});
