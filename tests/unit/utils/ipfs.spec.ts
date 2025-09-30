import { test, expect } from 'vitest';

import { toDwebLink } from '@/utils/ipfs';

test('toDwebLink: ipfs scheme', () => {
  expect(toDwebLink('ipfs://QmHash/img.png')).toBe('https://dweb.link/ipfs/QmHash/img.png');
});

test('toDwebLink: ipns scheme', () => {
  expect(toDwebLink('ipns://example.com/asset')).toBe('https://dweb.link/ipns/example.com/asset');
});

test('toDwebLink: path gateway', () => {
  expect(toDwebLink('https://ipfs.io/ipfs/QmHash/img.png')).toBe('https://dweb.link/ipfs/QmHash/img.png');
  expect(toDwebLink('https://cloudflare-ipfs.com/ipns/name/path')).toBe('https://dweb.link/ipns/name/path');
});

test('toDwebLink: subdomain gateway', () => {
  expect(toDwebLink('https://bafybeigdyrzt.ipfs.dweb.link/dir/file')).toBe(
    'https://dweb.link/ipfs/bafybeigdyrzt/dir/file'
  );
});

test('toDwebLink: passthrough', () => {
  const http = 'https://example.com/image.png';
  expect(toDwebLink(http)).toBe(http);
  expect(toDwebLink(undefined)).toBeUndefined();
  expect(toDwebLink(null as any)).toBeNull();
});
