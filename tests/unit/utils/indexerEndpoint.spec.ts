// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  LOCAL_POLKASWAP_INDEXER_ENDPOINT,
  isLocalDevelopmentHost,
  resolvePolkaswapIndexerEndpoint,
} from '@/utils/indexerEndpoint';

describe('indexer endpoint resolution', () => {
  it('keeps the configured hosted endpoint for localhost previews', () => {
    const endpoint = 'https://pi.soramitsu.io/graphql';

    expect(resolvePolkaswapIndexerEndpoint(endpoint, 'localhost')).toBe(endpoint);
  });

  it('uses the local Polkaswap indexer for localhost previews without an explicit endpoint', () => {
    expect(resolvePolkaswapIndexerEndpoint('', '127.0.0.1')).toBe(LOCAL_POLKASWAP_INDEXER_ENDPOINT);
  });

  it('preserves custom localhost endpoints for focused integration testing', () => {
    const endpoint = 'http://localhost:9999/graphql';

    expect(resolvePolkaswapIndexerEndpoint(endpoint, 'localhost')).toBe(endpoint);
  });

  it('keeps the configured endpoint on non-local hosts', () => {
    const endpoint = 'https://pi.soramitsu.io/graphql';

    expect(resolvePolkaswapIndexerEndpoint(endpoint, 'polkaswap.io')).toBe(endpoint);
  });

  it('recognizes loopback hostnames used by local preview servers', () => {
    expect(isLocalDevelopmentHost('app.localhost')).toBe(true);
    expect(isLocalDevelopmentHost('127.0.0.1')).toBe(true);
    expect(isLocalDevelopmentHost('::1')).toBe(true);
    expect(isLocalDevelopmentHost('polkaswap.io')).toBe(false);
  });
});
