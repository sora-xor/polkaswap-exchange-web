import { describe, expect, it, vi } from 'vitest';

import WcSigner from '@/lib/soraneo-wallet/src/services/walletconnect/wallet/signer';

describe('walletconnect/wallet/signer', () => {
  it('signs payloads through the walletconnect provider and derives the numeric id from the nonce', async () => {
    const provider = {
      signTransaction: vi.fn().mockResolvedValue('0xsigned'),
    } as any;
    const signer = new WcSigner(provider);
    const payload = { nonce: '0x0a', address: 'alice' } as any;

    await expect(signer.signPayload(payload)).resolves.toEqual({
      id: 10,
      signature: '0xsigned',
    });
    expect(provider.signTransaction).toHaveBeenCalledWith(payload);
  });
});
