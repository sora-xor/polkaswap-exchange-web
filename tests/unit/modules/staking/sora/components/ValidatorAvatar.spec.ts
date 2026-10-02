import { describe, expect, it, vi } from 'vitest';

import { resolveValidatorAvatarUrl } from '@/modules/staking/sora/utils/validatorAvatar';

const toIpfsGatewayUrlMock = vi.fn((url: string) => `https://ipfs.example/${url}`);

vi.mock('@/utils/ipfs', () => ({
  __esModule: true,
  toIpfsGatewayUrl: (url: string) => toIpfsGatewayUrlMock(url),
}));

const createValidator = (image?: string) => ({
  address: 'addr-1',
  commission: '1000',
  apy: '12',
  identity: {
    info: {
      image,
      display: 'Validator',
    },
  },
});

describe('ValidatorAvatar', () => {
  it('returns null when no identity image', () => {
    const validator = createValidator(undefined);
    expect(resolveValidatorAvatarUrl(validator as any)).toBeNull();
  });

  it('converts IPFS images to maintained gateway links', () => {
    const validator = createValidator('ipfs://hash');
    expect(resolveValidatorAvatarUrl(validator as any)).toBe('https://ipfs.example/ipfs://hash');
    expect(toIpfsGatewayUrlMock).toHaveBeenCalledWith('ipfs://hash');
  });

  it('falls back to original url when conversion fails', () => {
    const error = new Error('boom');
    toIpfsGatewayUrlMock.mockImplementationOnce(() => {
      throw error;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const validator = createValidator('bad-url');
    expect(resolveValidatorAvatarUrl(validator as any)).toBe('bad-url');
    expect(warnSpy).toHaveBeenCalledWith('Failed to convert validator avatar url', error);

    warnSpy.mockRestore();
  });
});
