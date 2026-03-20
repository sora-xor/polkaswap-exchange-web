import { describe, expect, test } from 'vitest';

import { isIpfsGatewayLocation } from '@/lib/soraneo-wallet/src/util/ipfsContext';

describe('isIpfsGatewayLocation', () => {
  test('detects path-based IPFS gateway routes', () => {
    expect(isIpfsGatewayLocation({ pathname: '/ipfs/QmHash/index.html', hostname: 'gateway.example.com' })).toBe(true);
    expect(isIpfsGatewayLocation({ pathname: '/ipns/polkaswap-app/', hostname: 'gateway.example.com' })).toBe(true);
  });

  test('detects subdomain IPFS gateways', () => {
    expect(
      isIpfsGatewayLocation({
        pathname: '/',
        hostname: 'bafybeiab2m7lr56r767xhajwurb4a2ytwsi7p5ltlclif36n5gapy5mafu.ipfs.dweb.link',
      })
    ).toBe(true);
    expect(isIpfsGatewayLocation({ pathname: '/', hostname: 'polkaswap.ipns.gateway.example' })).toBe(true);
  });

  test('returns false for non-gateway locations', () => {
    expect(isIpfsGatewayLocation({ pathname: '/', hostname: 'polkaswap.io' })).toBe(false);
    expect(isIpfsGatewayLocation({ pathname: '/swap', hostname: 'ipfs.io' })).toBe(false);
    expect(isIpfsGatewayLocation(null)).toBe(false);
    expect(isIpfsGatewayLocation(undefined)).toBe(false);
  });
});
