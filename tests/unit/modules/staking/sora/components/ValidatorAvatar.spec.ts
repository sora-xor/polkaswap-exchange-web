import { describe, expect, it, vi } from 'vitest';

import { resolveValidatorAvatarUrl } from '@/modules/staking/sora/utils/validatorAvatar';

const toDwebLinkMock = vi.fn((url: string) => `https://ipfs.example/${url}`);

vi.mock('@/utils/ipfs', () => ({
  __esModule: true,
  toDwebLink: (url: string) => toDwebLinkMock(url),
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

  it('converts ipfs image to dweb link', () => {
    const validator = createValidator('ipfs://hash');
    expect(resolveValidatorAvatarUrl(validator as any)).toBe('https://ipfs.example/ipfs://hash');
    expect(toDwebLinkMock).toHaveBeenCalledWith('ipfs://hash');
  });

  it('falls back to original url when conversion fails', () => {
    const error = new Error('boom');
    toDwebLinkMock.mockImplementationOnce(() => {
      throw error;
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const validator = createValidator('bad-url');
    expect(resolveValidatorAvatarUrl(validator as any)).toBe('bad-url');
    expect(warnSpy).toHaveBeenCalledWith('Failed to convert validator avatar url', error);

    warnSpy.mockRestore();
  });
});
