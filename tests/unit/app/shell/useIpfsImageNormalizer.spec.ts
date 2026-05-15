import { afterEach, describe, expect, it, vi } from 'vitest';

const toDwebLinkMock = vi.hoisted(() =>
  vi.fn((value: string) => (value.startsWith('ipfs://') ? value.replace('ipfs://', '/ipfs/') : value))
);

vi.mock('@/utils/ipfs', () => ({
  toDwebLink: toDwebLinkMock,
}));

import { createIpfsImageNormalizer } from '@/app/shell/useIpfsImageNormalizer';

describe('createIpfsImageNormalizer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    toDwebLinkMock.mockClear();
  });

  it('normalizes existing image sources when started', () => {
    document.body.innerHTML = '<img alt="asset" src="ipfs://token.png">';

    const normalizer = createIpfsImageNormalizer();
    normalizer.start();

    const image = document.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/ipfs/token.png');

    normalizer.stop();
  });
});
