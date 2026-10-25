import { describe, expect, it } from 'vitest';

import { IPFS_GATEWAY_BASE_URL, toIpfsGatewayUrl } from '@/utils/ipfs';

describe('toIpfsGatewayUrl', () => {
  it.each([
    ['ipfs://QmHash/img.png', '/ipfs/QmHash/img.png'],
    ['ipns://example.com/asset', '/ipns/example.com/asset'],
    ['IPFS://QmHash/img.png', '/ipfs/QmHash/img.png'],
    ['  ipfs://QmHash/dir/a%20b.png?download=1#preview  ', '/ipfs/QmHash/dir/a%20b.png?download=1#preview'],
  ])('resolves native URL %s through the maintained gateway', (source, path) => {
    expect(toIpfsGatewayUrl(source)).toBe(`${IPFS_GATEWAY_BASE_URL}${path}`);
  });

  it.each([
    ['https://ipfs.io/ipfs/QmHash/img.png', '/ipfs/QmHash/img.png'],
    ['http://gateway.ipfs.io/ipfs/QmHash', '/ipfs/QmHash'],
    ['https://dweb.link/ipfs/QmHash/img.png?download=1#preview', '/ipfs/QmHash/img.png?download=1#preview'],
    ['https://cloudflare-ipfs.com/ipns/example.com/path', '/ipns/example.com/path'],
    ['https://cf-ipfs.com/ipfs/QmHash/img.png', '/ipfs/QmHash/img.png'],
    ['https://ipfs.io./ipfs/QmHash/img.png', '/ipfs/QmHash/img.png'],
    ['https://bafybeigdyrzt.ipfs.cf-ipfs.com./img.png', '/ipfs/bafybeigdyrzt/img.png'],
    ['https://bafybeigdyrzt.ipfs.dweb.link/dir/file', '/ipfs/bafybeigdyrzt/dir/file'],
    ['https://bafybeigdyrzt.ipfs.dweb.link', '/ipfs/bafybeigdyrzt'],
    ['https://bafybeigdyrzt.ipfs.dweb.link?download=1#preview', '/ipfs/bafybeigdyrzt?download=1#preview'],
    ['https://k51name.ipns.dweb.link/avatar.png', '/ipns/k51name/avatar.png'],
    ['https://docs-ipfs-tech.ipns.dweb.link/avatar.png', '/ipns/docs.ipfs.tech/avatar.png'],
    ['https://my--site-example.ipns.dweb.link/avatar.png', '/ipns/my-site.example/avatar.png'],
    ['https://my-site.example.ipns.dweb.link/avatar.png', '/ipns/my-site.example/avatar.png'],
  ])('migrates retired gateway URL %s', (source, path) => {
    expect(toIpfsGatewayUrl(source)).toBe(`${IPFS_GATEWAY_BASE_URL}${path}`);
  });

  it.each([
    'https://ipfs.filebase.io/ipfs/QmHash/img.png',
    'https://dedicated.example/ipns/name/path?token=secret#preview',
    'https://bafybeigdyrzt.ipfs.dedicated.example/avatar.png',
    `${IPFS_GATEWAY_BASE_URL}/ipfs/QmHash/img.png`,
    'https://example.com/image.png',
    'https://dweb.link.example/ipfs/QmHash/img.png',
    'https://ipfs.io@other.example/ipfs/QmHash/img.png',
    'https://example.com/image.png?next=https://ipfs.io/ipfs/QmHash',
    '/assets/token.svg',
    'data:image/png;base64,aGVsbG8=',
    '',
  ])('preserves maintained gateways and other image URLs: %s', (source) => {
    expect(toIpfsGatewayUrl(source)).toBe(source);
  });

  it.each([
    'ipfs://',
    'ipfs:///image.png',
    'ipfs://./api/v0/version',
    'ipfs://../api/v0/version',
    'ipns://../api/v0/version',
    'ipfs://%2e%2e/api/v0/version',
    'ipfs://QmHash%2f..%2f../api/v0/version',
    'ipfs://QmHash/../../api/v0/version',
    'ipfs://QmHash/%2e%2e/%2e%2e/api/v0/version',
    'ipns://example.com/%252e%252e/api/v0/version',
    'ipfs://QmHash/%2f..%2f../api/v0/version',
    'ipfs://QmHash/%252f..%252f../api/v0/version',
    'ipfs://QmHash/..\\..\\api/v0/version',
    'ipfs://user:password@QmHash/avatar.png',
    'https://ipfs.io/ipfs//image.png',
    'https://dweb.link/ipfs/QmHash/../../api/v0/version',
    'https://bafybeigdyrzt.ipfs.dweb.link/../../api/v0/version',
    'https://ipfs.io/not-ipfs/QmHash/image.png',
    'not a URL',
  ])('does not turn malformed content paths into gateway requests: %s', (source) => {
    expect(toIpfsGatewayUrl(source)).toBe(source);
  });

  it('preserves absent or unexpectedly typed image values', () => {
    expect(toIpfsGatewayUrl(undefined)).toBeUndefined();
    expect(toIpfsGatewayUrl(null)).toBeNull();
    const value = { trim: null };
    expect(toIpfsGatewayUrl(value as unknown as string)).toBe(value);
  });
});
