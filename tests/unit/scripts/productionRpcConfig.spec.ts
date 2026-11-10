import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Read only the public node configuration used by the static publisher. */
function readProductionNodes(file: string) {
  const config = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'));
  return {
    nodes: config.DEFAULT_NETWORKS,
    genesis: config.CHAIN_GENESIS_HASH,
    network: config.NETWORK_TYPE,
  };
}

describe('production live RPC configuration', () => {
  it('ships both approved nodes in matching publisher and browser configurations', () => {
    const publisher = readProductionNodes('env.json');
    expect(readProductionNodes('public/env.json')).toEqual(publisher);
    expect(publisher.nodes).toEqual([
      { chain: 'SORA', name: 'SORA Parliament Ministry of Finance #1', address: 'wss://ws.mof.sora.org' },
      { chain: 'SORA', name: 'SORA Parliament Ministry of Finance #2', address: 'wss://mof2.sora.org' },
    ]);
    expect(publisher.network).toBe('Prod');
    expect(publisher.genesis).toBe('0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5');
  });
});
