import { describe, expect, it, vi } from 'vitest';

import { WcWallet } from '@/lib/soraneo-wallet/src/services/walletconnect/wallet';

describe('walletconnect/wallet', () => {
  it('enables access and exposes the signer after a successful provider connection', async () => {
    const provider = {
      connect: vi.fn().mockResolvedValue(undefined),
      getAccounts: vi.fn(),
      signTransaction: vi.fn(),
    } as any;
    const wallet = new WcWallet(provider);

    const injected = await wallet.enable();

    expect(WcWallet.version).toBe('0.0.1');
    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(injected).toEqual({
      accounts: wallet.wcAccounts,
      metadata: undefined,
      provider,
      signer: wallet.wcSigner,
    });
  });

  it('returns the wallet API without a signer when the provider connection fails', async () => {
    const provider = {
      connect: vi.fn().mockRejectedValue(new Error('connect failed')),
      getAccounts: vi.fn(),
      signTransaction: vi.fn(),
    } as any;
    const wallet = new WcWallet(provider);

    const injected = await wallet.enable();

    expect(provider.connect).toHaveBeenCalledTimes(1);
    expect(injected.accounts).toBe(wallet.wcAccounts);
    expect(injected.provider).toBe(provider);
    expect(injected.signer).toBeUndefined();
  });
});
