// @vitest-environment node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const getCspDirectiveValues = (csp: string, directive: string): string[] => {
  const value = csp
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${directive} `));

  return value ? value.split(/\s+/).slice(1) : [];
};

describe('public env config', () => {
  it('allows the local Polkaswap indexer through the static CSP', async () => {
    const html = await readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';

    expect(csp).toContain('http://localhost:*');
    expect(csp).toContain('http://127.0.0.1:*');
    expect(csp).toContain('ws://localhost:*');
  });

  it('allows Google Drive wallet scripts through the static CSP', async () => {
    const html = await readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';

    expect(csp).toContain('https://accounts.google.com');
    expect(csp).toContain('https://apis.google.com');
    expect(csp).toContain('https://content.googleapis.com');
    expect(csp).toContain('https://www.gstatic.com');
    expect(getCspDirectiveValues(csp, 'frame-src')).toContain('https://content.googleapis.com');
  });

  it('allows browser wallet extension page bridges through the static CSP', async () => {
    const html = await readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
    const scriptSources = getCspDirectiveValues(csp, 'script-src');

    expect(scriptSources).toContain('chrome-extension:');
    expect(scriptSources).toContain('moz-extension:');
  });

  it('renders the branded bootstrap loader before Vue mounts', async () => {
    const html = await readFile(path.resolve(process.cwd(), 'index.html'), 'utf8');

    expect(html).not.toContain('<div id="app"></div>');
    expect(html).toContain('class="app-bootstrap-loader"');
    expect(html).toContain('class="app-bootstrap-loader__mark"');
    expect(html).toContain('src="/src/assets/img/pswap-loader.svg"');
  });

  it('exposes only the healthy MOF SORA websocket endpoints in production envs', async () => {
    const envPaths = ['public/env.json', 'public/env.taira.json', 'env.json'];
    const expectedNodes = [
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #1',
        address: 'wss://ws.mof.sora.org',
      },
      {
        chain: 'SORA',
        name: 'SORA Parliament Ministry of Finance #2',
        address: 'wss://mof2.sora.org',
        location: 'SG',
      },
    ];

    for (const envPath of envPaths) {
      const raw = await readFile(path.resolve(process.cwd(), envPath), 'utf8');
      const parsed = JSON.parse(raw) as {
        DEFAULT_NETWORKS: Array<{ name: string; address: string; location?: string; chain: string }>;
      };

      expect(parsed.DEFAULT_NETWORKS).toEqual(expectedNodes);
      expect(parsed.DEFAULT_NETWORKS.map((node) => node.address)).not.toContain('wss://mof3.sora.org');
      expect(parsed.DEFAULT_NETWORKS.map((node) => node.address)).not.toContain(
        'wss://sora.api.onfinality.io/public-ws'
      );
    }
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
    const parsed = JSON.parse(raw) as { POLKASWAP_INDEXER_ENDPOINT?: string; SORAMETRICS_API_ENDPOINT?: string };

    expect(parsed.POLKASWAP_INDEXER_ENDPOINT).toBe('https://pi.soramitsu.io/graphql');
    expect(parsed.SORAMETRICS_API_ENDPOINT).toBe('https://sorametrics.org');
  });

  it('keeps the task-based point system enabled in production envs', async () => {
    const envPaths = ['public/env.json', 'public/env.taira.json', 'env.json'];

    for (const envPath of envPaths) {
      const raw = await readFile(path.resolve(process.cwd(), envPath), 'utf8');
      const parsed = JSON.parse(raw) as { FEATURE_FLAGS?: { pointSystemV2?: boolean } };

      expect(parsed.FEATURE_FLAGS?.pointSystemV2).toBe(true);
    }
  });

  it('does not expose the retired Sora Card feature flag in shipped envs', async () => {
    const envPaths = ['public/env.json', 'public/env.dev.json', 'public/env.taira.json', 'env.json'];

    for (const envPath of envPaths) {
      const raw = await readFile(path.resolve(process.cwd(), envPath), 'utf8');
      const parsed = JSON.parse(raw) as { FEATURE_FLAGS?: Record<string, unknown> };

      expect(parsed.FEATURE_FLAGS).not.toHaveProperty('soraCard');
    }
  });
});
