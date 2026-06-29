import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/substrate/sdk/api', () => ({
  api: {},
}));

import { MstModule } from '@/lib/substrate/sdk/mst';

describe('MstModule.getMstAccount', () => {
  it('returns the matching multisig account without debug logging', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const multisigAccount = {
      address: 'SORA-MST',
      meta: {
        isMultisig: true,
        name: 'Treasury',
      },
    };
    const root = {
      formatAddress: vi.fn((address: string) => address.toLowerCase()),
      keyring: {
        getAddresses: vi.fn(() => [
          { address: 'SORA-USER', meta: { isMultisig: false, name: 'Signer' } },
          multisigAccount,
        ]),
      },
    };
    const mstModule = new MstModule(root as never);

    try {
      expect(mstModule.getMstAccount('sora-mst')).toBe(multisigAccount);
      expect(root.keyring.getAddresses).toHaveBeenCalledTimes(1);
      expect(root.formatAddress).toHaveBeenCalledWith('SORA-MST', false);
      expect(root.formatAddress).toHaveBeenCalledWith('sora-mst', false);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    } finally {
      consoleInfoSpy.mockRestore();
    }
  });

  it('returns undefined when the keyring address API is not ready', () => {
    const root = {
      formatAddress: vi.fn((address: string) => address.toLowerCase()),
      keyring: undefined,
    };
    const mstModule = new MstModule(root as never);

    expect(mstModule.getMstAccount('sora-mst')).toBeUndefined();
    expect(root.formatAddress).not.toHaveBeenCalled();
  });
});
