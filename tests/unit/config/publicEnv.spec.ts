// @vitest-environment node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public env config', () => {
  it('ships the same SORA websocket endpoints as production polkaswap.io', async () => {
    const envPath = path.resolve(process.cwd(), 'public/env.json');
    const raw = await readFile(envPath, 'utf8');
    const parsed = JSON.parse(raw) as {
      DEFAULT_NETWORKS: Array<{ name: string; address: string; location: string; chain: string }>;
    };

    expect(parsed.DEFAULT_NETWORKS).toEqual([
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #1',
        address: 'wss://ws.mof.sora.org',
        location: 'GB',
      },
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #2',
        address: 'wss://mof2.sora.org',
        location: 'SG',
      },
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #3',
        address: 'wss://mof3.sora.org',
        location: 'DE',
      },
      {
        chain: 'SORA',
        name: 'OnFinality',
        address: 'wss://sora.api.onfinality.io/public-ws',
        location: 'JP',
      },
    ]);
  });

  it('keeps the root production env aligned with the public production env', async () => {
    const [publicRaw, rootRaw] = await Promise.all([
      readFile(path.resolve(process.cwd(), 'public/env.json'), 'utf8'),
      readFile(path.resolve(process.cwd(), 'env.json'), 'utf8'),
    ]);

    expect(JSON.parse(rootRaw)).toEqual(JSON.parse(publicRaw));
  });
});
