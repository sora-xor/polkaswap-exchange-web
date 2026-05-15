import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/staticAssets', () => ({
  resolveStaticAssetUrl: (candidate: string) => `scoped/${candidate.replace(/^\/+/g, '')}`,
}));

import { buildRuntimeEnvConfigUrls, resolveRuntimeEnvConfigPayload } from '@/app/shell/runtimeEnvConfig';

describe('runtime env config shell helpers', () => {
  it('builds scoped and origin-root config URLs in lookup order', () => {
    expect(buildRuntimeEnvConfigUrls('/env.json', 'https://example.org')).toEqual([
      'scoped/env.json',
      'https://example.org/env.json',
    ]);
  });

  it('uses only the scoped URL when no origin is available', () => {
    expect(buildRuntimeEnvConfigUrls('env.json')).toEqual(['scoped/env.json']);
  });

  it('accepts object payloads as runtime env config', () => {
    const config = {
      NETWORK_TYPE: 'test',
      POLKASWAP_INDEXER_ENDPOINT: 'https://indexer.test',
    };

    expect(resolveRuntimeEnvConfigPayload(config)).toEqual({
      ok: true,
      config,
    });
  });

  it('describes invalid payloads for logging without accepting them as config', () => {
    expect(resolveRuntimeEnvConfigPayload([])).toEqual({
      ok: false,
      isHtmlFallback: false,
      payloadType: 'array',
    });
    expect(resolveRuntimeEnvConfigPayload('{"NETWORK_TYPE":"test"}')).toEqual({
      ok: false,
      isHtmlFallback: false,
      payloadType: 'string',
    });
    expect(resolveRuntimeEnvConfigPayload('   <!doctype html><html></html>')).toEqual({
      ok: false,
      isHtmlFallback: true,
      payloadType: 'string',
    });
  });
});
