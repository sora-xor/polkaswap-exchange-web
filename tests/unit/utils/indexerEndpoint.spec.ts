// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { resolvePolkaswapIndexerEndpoint } from '@/utils/indexerEndpoint';

describe('indexer endpoint resolution', () => {
  it('keeps the configured hosted indexer for localhost previews', () => {
    const endpoint = 'https://pi.soramitsu.io/graphql';

    expect(resolvePolkaswapIndexerEndpoint(endpoint)).toBe(endpoint);
    expect(resolvePolkaswapIndexerEndpoint(` ${endpoint}/ `)).toBe(`${endpoint}/`);
  });

  it('returns an empty endpoint when no endpoint is configured', () => {
    expect(resolvePolkaswapIndexerEndpoint('')).toBe('');
    expect(resolvePolkaswapIndexerEndpoint(undefined)).toBe('');
    expect(resolvePolkaswapIndexerEndpoint(null)).toBe('');
  });

  it('preserves custom localhost endpoints for focused integration testing', () => {
    const endpoint = 'http://localhost:9999/graphql';

    expect(resolvePolkaswapIndexerEndpoint(endpoint)).toBe(endpoint);
  });

  it('keeps the configured endpoint on non-local hosts', () => {
    const endpoint = 'https://pi.soramitsu.io/graphql';

    expect(resolvePolkaswapIndexerEndpoint(endpoint)).toBe(endpoint);
  });
});
