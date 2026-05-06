import { describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';
import { IndexerType } from '@/lib/soraneo-wallet/src/consts';
import {
  hasConfiguredIndexerEndpoint,
  resolveFallbackIndexer,
  resolvePreferredIndexer,
} from '@/stores/wallet/utils/indexers';

describe('wallet indexer selection helpers', () => {
  it('treats empty endpoints as unconfigured', () => {
    expect(hasConfiguredIndexerEndpoint({ endpoint: '' })).toBe(false);
    expect(hasConfiguredIndexerEndpoint({ endpoint: 'https://indexer.example/graphql' })).toBe(true);
  });

  it('prefers the requested configured indexer', () => {
    const indexers = {
      [IndexerType.SUBQUERY]: { endpoint: 'https://subquery.example/graphql', status: ConnectionStatus.Available },
      [IndexerType.SUBSQUID]: { endpoint: 'https://subsquid.example/graphql', status: ConnectionStatus.Available },
    };

    expect(resolvePreferredIndexer(IndexerType.SUBSQUID, indexers)).toBe(IndexerType.SUBSQUID);
  });

  it('falls back to the first configured indexer when the requested one has no endpoint', () => {
    const indexers = {
      [IndexerType.SUBQUERY]: { endpoint: 'https://subquery.example/graphql', status: ConnectionStatus.Available },
      [IndexerType.SUBSQUID]: { endpoint: '', status: ConnectionStatus.Loading },
    };

    expect(resolvePreferredIndexer(IndexerType.SUBSQUID, indexers)).toBe(IndexerType.SUBQUERY);
  });

  it('only selects fallback indexers that are configured and not unavailable', () => {
    const indexers = {
      [IndexerType.SUBQUERY]: { endpoint: 'https://subquery.example/graphql', status: ConnectionStatus.Available },
      [IndexerType.SUBSQUID]: { endpoint: '', status: ConnectionStatus.Loading },
    };

    expect(resolveFallbackIndexer(IndexerType.SUBSQUID, indexers)).toBe(IndexerType.SUBQUERY);
    expect(resolveFallbackIndexer(IndexerType.SUBQUERY, indexers)).toBeNull();
  });
});
