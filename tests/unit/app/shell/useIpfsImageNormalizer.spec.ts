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
    window.history.replaceState({}, '', '/');
    toDwebLinkMock.mockClear();
  });

  it('keeps absolute bundled image URLs on the current IPFS deployment', () => {
    window.history.replaceState({}, '', '/ipfs/polkaswap-e2e/#/store');
    const source = `${window.location.origin}/ipfs/polkaswap-e2e/assets/sencha-showcase.png`;
    document.body.innerHTML = `<img alt="tea" src="${source}">`;
    const normalizer = createIpfsImageNormalizer();
    normalizer.start();
    expect(document.querySelector('img')?.getAttribute('src')).toBe(source);
    expect(toDwebLinkMock).not.toHaveBeenCalled();
    normalizer.stop();
  });

  it('still normalizes images outside the current deployment asset directory', () => {
    window.history.replaceState({}, '', '/ipfs/polkaswap-e2e/#/store');
    const sources = [
      `${window.location.origin}/ipfs/another-cid/assets/token.svg`,
      'https://example.test/ipfs/polkaswap-e2e/assets/token.svg',
      'ipfs://token-cid/token.svg',
    ];
    document.body.innerHTML = sources.map((source) => `<img src="${source}" alt="token">`).join('');
    const normalizer = createIpfsImageNormalizer();
    normalizer.start();
    for (const source of sources) expect(toDwebLinkMock).toHaveBeenCalledWith(source);
    normalizer.stop();
  });

  it('preserves bundled images inserted after route navigation', async () => {
    window.history.replaceState({}, '', '/ipfs/polkaswap-e2e/#/store');
    const source = `${window.location.origin}/ipfs/polkaswap-e2e/assets/sencha-back.jpg`;
    const normalizer = createIpfsImageNormalizer();
    normalizer.start();
    const image = document.createElement('img');
    image.src = source;
    document.body.append(image);
    await Promise.resolve();
    expect(image.getAttribute('src')).toBe(source);
    expect(toDwebLinkMock).not.toHaveBeenCalled();
    normalizer.stop();
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
