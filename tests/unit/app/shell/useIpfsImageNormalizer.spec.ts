import { afterEach, describe, expect, it, vi } from 'vitest';

const toIpfsGatewayUrlMock = vi.hoisted(() =>
  vi.fn((value: string) => (value.startsWith('ipfs://') ? value.replace('ipfs://', '/ipfs/') : value))
);

vi.mock('@/utils/ipfs', () => ({
  toIpfsGatewayUrl: toIpfsGatewayUrlMock,
}));

import { createIpfsImageNormalizer } from '@/app/shell/useIpfsImageNormalizer';

describe('createIpfsImageNormalizer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
    toIpfsGatewayUrlMock.mockClear();
  });

  it('keeps absolute bundled image URLs on the current IPFS deployment', () => {
    window.history.replaceState({}, '', '/ipfs/polkaswap-e2e/#/burn');
    const source = `${window.location.origin}/ipfs/polkaswap-e2e/assets/solswap-mark.svg`;
    document.body.innerHTML = `<img alt="logo" src="${source}">`;
    const normalizer = createIpfsImageNormalizer();
    normalizer.start();
    expect(document.querySelector('img')?.getAttribute('src')).toBe(source);
    expect(toIpfsGatewayUrlMock).not.toHaveBeenCalled();
    normalizer.stop();
  });

  it('still normalizes images outside the current deployment asset directory', () => {
    window.history.replaceState({}, '', '/ipfs/polkaswap-e2e/#/swap');
    const sources = [
      `${window.location.origin}/ipfs/another-cid/assets/token.svg`,
      'https://ipfs.io/ipfs/polkaswap-e2e/assets/token.svg',
      'ipfs://token-cid/token.svg',
    ];
    document.body.innerHTML = sources.map((source) => `<img src="${source}" alt="token">`).join('');
    const normalizer = createIpfsImageNormalizer();
    normalizer.start();
    for (const source of sources) expect(toIpfsGatewayUrlMock).toHaveBeenCalledWith(source);
    normalizer.stop();
  });

  it('preserves bundled images inserted after route navigation', async () => {
    window.history.replaceState({}, '', '/ipfs/polkaswap-e2e/#/burn');
    const source = `${window.location.origin}/ipfs/polkaswap-e2e/assets/solswap-mark.svg`;
    const normalizer = createIpfsImageNormalizer();
    normalizer.start();
    const image = document.createElement('img');
    image.src = source;
    document.body.append(image);
    await Promise.resolve();
    expect(image.getAttribute('src')).toBe(source);
    expect(toIpfsGatewayUrlMock).not.toHaveBeenCalled();
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
