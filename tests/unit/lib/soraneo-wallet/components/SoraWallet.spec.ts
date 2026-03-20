import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/soraneo-wallet/src/components/AddAsset/AddAsset.vue', () => ({
  default: { name: 'AddAssetStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/CreateToken.vue', () => ({
  default: { name: 'CreateTokenStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/ReceiveToken.vue', () => ({
  default: { name: 'ReceiveTokenStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/SelectAsset.vue', () => ({
  default: { name: 'SelectAssetStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/Wallet.vue', () => ({
  default: { name: 'WalletStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletAssetDetails.vue', () => ({
  default: { name: 'WalletAssetDetailsStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletConnection.vue', () => ({
  default: { name: 'WalletConnectionStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletProviders.vue', () => ({
  default: { name: 'WalletProvidersStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletSend.vue', () => ({
  default: { name: 'WalletSendStub' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/WalletTransactionDetails.vue', () => ({
  default: { name: 'WalletTransactionDetailsStub' },
}));

import SoraWallet from '@/lib/soraneo-wallet/src/SoraWallet.vue';
import { Operations } from '@/lib/soraneo-wallet/src/types/common';

describe('Wallet SoraWallet', () => {
  it('re-emits wallet operations with their asset payload', () => {
    const emit = vi.fn();
    const asset = { address: 'asset-1' };

    (SoraWallet as any).methods.handleOperation.call({ $emit: emit }, Operations.Swap, asset);

    expect(emit).toHaveBeenCalledWith(Operations.Swap, asset);
  });

  it('re-emits close and learn-more events', () => {
    const emit = vi.fn();

    (SoraWallet as any).methods.handleClose.call({ $emit: emit });
    (SoraWallet as any).methods.handleLearnMore.call({ $emit: emit });

    expect(emit).toHaveBeenNthCalledWith(1, 'close');
    expect(emit).toHaveBeenNthCalledWith(2, 'learn-more');
  });
});
