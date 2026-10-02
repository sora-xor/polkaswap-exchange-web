import { afterEach, describe, expect, it, vi } from 'vitest';

import { IPFS_GATEWAY_BASE_URL } from '@/utils/ipfs';

import { getBase64Icon, sanitizeIconSource } from '@/util/image';

const decodeSvgPayload = (dataUri: string): string => {
  const payload = dataUri.split(',')[1] ?? '';
  return Buffer.from(payload, 'base64').toString('utf-8');
};

describe('sanitizeIconSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['ipfs://QmToken/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`],
    ['ipns://example.com/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipns/example.com/logo.png`],
    ['https://ipfs.io/ipfs/QmToken/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/QmToken/logo.png`],
    ['https://bafytoken.ipfs.dweb.link/logo.png', `${IPFS_GATEWAY_BASE_URL}/ipfs/bafytoken/logo.png`],
    ['https://dedicated.example/ipfs/QmToken/logo.png', 'https://dedicated.example/ipfs/QmToken/logo.png'],
  ])('resolves CSS icon sources through maintained gateways: %s', (source, expected) => {
    expect(sanitizeIconSource(source)).toBe(expected);
  });

  it.each([
    'ipfs://QmToken/logo\".png',
    'ipfs://QmToken/logo(1).png',
    'ipfs://QmToken/bad icon.png',
    'ipfs://QmToken/../../api/v0/version',
  ])('preserves safety checks for native IPFS icon sources: %s', (source) => {
    expect(sanitizeIconSource(source)).toBe('');
  });

  it('accepts utf8-encoded svg data URIs and normalizes them to base64', () => {
    const input =
      "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2010%2010'%3E%3Ccircle%20cx='5'%20cy='5'%20r='4'/%3E%3C/svg%3E";

    const sanitized = sanitizeIconSource(input);

    expect(sanitized.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(decodeSvgPayload(sanitized)).toContain('<svg');
    expect(decodeSvgPayload(sanitized)).toContain('<circle');
  });

  it('strips script nodes from utf8-encoded svg data URIs', () => {
    const input =
      "data:image/svg+xml;charset=utf8,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%3E%3Cscript%3Ealert(1)%3C/script%3E%3Ccircle%20cx='5'%20cy='5'%20r='4'/%3E%3C/svg%3E";

    const sanitized = sanitizeIconSource(input);
    const decoded = decodeSvgPayload(sanitized);

    expect(sanitized.startsWith('data:image/svg+xml;base64,')).toBe(true);
    expect(decoded.toLowerCase()).not.toContain('<script');
    expect(decoded).toContain('<circle');
  });

  it('accepts safe local asset paths and rejects unsafe relative icon paths', () => {
    expect(sanitizeIconSource('/assets/solswap-mark.svg')).toBe('/assets/solswap-mark.svg');
    expect(sanitizeIconSource('assets/solswap-mark.ABC123.svg?v=1')).toBe('assets/solswap-mark.ABC123.svg?v=1');
    expect(sanitizeIconSource('//cdn.example.com/icon.svg')).toBe('');
    expect(sanitizeIconSource('../private/icon.svg')).toBe('');
    expect(sanitizeIconSource('assets/%2e%2e/private.svg')).toBe('');
    expect(sanitizeIconSource('assets/bad icon.svg')).toBe('');
  });

  it('settles SVG image load failures with an empty icon', async () => {
    const svgIcon = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>').toString(
      'base64'
    )}`;

    class ImageStub {
      public onload: null | (() => void) = null;
      public onerror: null | ((error: Error) => void) = null;

      set src(_value: string) {
        queueMicrotask(() => this.onerror?.(new Error('invalid image')));
      }
    }

    vi.stubGlobal('Image', ImageStub);

    await expect(getBase64Icon(svgIcon)).resolves.toBe('');
  });
});
