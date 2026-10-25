import { describe, expect, it } from 'vitest';
import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import { SUB_NETWORKS } from '@/consts/sub';

describe('Sub network constants', () => {
  it('configures active Liberland RPC nodes with a fallback endpoint', () => {
    const nodes = SUB_NETWORKS[SubNetworkId.Liberland]?.nodes ?? [];
    const addresses = nodes.map((node) => node.address);

    expect(addresses).toContain('wss://liberland-rpc.n.dwellir.com');
    expect(addresses).toContain('wss://mainnet.liberland.org');
    expect(addresses).not.toContain('wss://liberland-rpc.dwellir.com');
  });

  it('tries the current Dwellir Liberland endpoint before fallback nodes', () => {
    const nodes = SUB_NETWORKS[SubNetworkId.Liberland]?.nodes ?? [];

    expect(nodes[0]).toMatchObject({
      name: 'Dwellir',
      address: 'wss://liberland-rpc.n.dwellir.com',
    });
  });

  it('does not include duplicate Liberland RPC endpoints', () => {
    const nodes = SUB_NETWORKS[SubNetworkId.Liberland]?.nodes ?? [];
    const addresses = nodes.map((node) => node.address);

    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it('keeps Liberland RPC entries normalized as websocket URLs', () => {
    const nodes = SUB_NETWORKS[SubNetworkId.Liberland]?.nodes ?? [];

    for (const node of nodes) {
      expect(node.name.trim()).toBe(node.name);
      expect(node.name.length).toBeGreaterThan(0);
      expect(node.address.trim()).toBe(node.address);
      expect(node.address).toMatch(/^wss:\/\/[^/\s]+(?:\/[^\s]*)?$/);
    }
  });
});
