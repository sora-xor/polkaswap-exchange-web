// @vitest-environment node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public env config', () => {
  it('allows the local Polkaswap indexer through the static CSP', async () => {
    const html = await readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';

    expect(csp).toContain('http://localhost:*');
    expect(csp).toContain('http://127.0.0.1:*');
    expect(csp).toContain('ws://localhost:*');
  });

  it('prefers the currently healthy MOF #2 SORA websocket endpoint first', async () => {
    const envPath = path.resolve(process.cwd(), 'public/env.json');
    const raw = await readFile(envPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      DEFAULT_NETWORKS: Array<{ name: string; address: string; location: string; chain: string }>;
    };

    expect(parsed.DEFAULT_NETWORKS).toEqual([
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #2',
        address: 'wss://mof2.sora.org',
        location: 'SG',
      },
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #1',
        address: 'wss://ws.mof.sora.org',
        location: 'GB',
      },
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #3',
        address: 'wss://mof3.sora.org',
        location: 'DE',
      },
    ]);
    expect(parsed.DEFAULT_NETWORKS.map((node) => node.name)).not.toContain('OnFinality');
    expect(parsed.DEFAULT_NETWORKS.map((node) => node.address)).not.toContain('wss://sora.api.onfinality.io/public-ws');
  });

  it('keeps the root production env aligned with the public production env', async () => {
    const [publicRaw, rootRaw] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'public/env.json'), 'utf8'),
      readFile(path.resolve(process.cwd(), 'env.json'), 'utf8'),
    ]);

    expect(JSON.parse(rootRaw)).toEqual(JSON.parse(publicRaw));
  });

  it('keeps the production env pointed at the hosted Polkaswap indexer', async () => {
    const raw = await readFile(path.resolve(process.cwd(), 'public/env.json'), 'utf8');
    const parsed = JSON.parse(raw) as { POLKASWAP_INDEXER_ENDPOINT?: string };

    expect(parsed.POLKASWAP_INDEXER_ENDPOINT).toBe('https://pi.soramitsu.io/graphql');
  });
});
