import { describe, expect, it, vi } from 'vitest';

import WalletAssetDetails from '@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue';
import { Operations } from '@/lib/soraneo-wallet/src/types/common';

describe('Wallet WalletAssetDetails', () => {
  it('navigates to send for the send action and emits the rest', () => {
    const navigate = vi.fn();
    const emit = vi.fn();
    const asset = { address: 'asset-address', symbol: 'XOR' };

    (WalletAssetDetails as any).methods.handleOperation.call({ navigate, $emit: emit, asset }, Operations.Send);
    (WalletAssetDetails as any).methods.handleOperation.call({ navigate, $emit: emit, asset }, Operations.Swap);

    expect(navigate).toHaveBeenCalledWith({ name: 'WalletSend', params: { asset } });
    expect(emit).toHaveBeenCalledWith(Operations.Swap, asset);
  });
});
