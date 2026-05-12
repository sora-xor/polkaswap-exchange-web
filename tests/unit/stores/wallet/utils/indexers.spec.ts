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

  it('uses the Polkaswap indexer even when a legacy source is configured', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: 'https://polkaswap.example/graphql', status: ConnectionStatus.Available },
      legacy: { endpoint: 'https://legacy.example/graphql', status: ConnectionStatus.Available },
    };

    expect(resolvePreferredIndexer('legacy', indexers)).toBe(IndexerType.POLKASWAP);
  });

  it('falls back to the first configured indexer when the requested one has no endpoint', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: 'https://polkaswap.example/graphql', status: ConnectionStatus.Available },
      legacy: { endpoint: '', status: ConnectionStatus.Loading },
    };

    expect(resolvePreferredIndexer('legacy', indexers)).toBe(IndexerType.POLKASWAP);
  });

  it('does not keep an unsupported requested indexer when no endpoint is configured', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: '', status: ConnectionStatus.Loading },
      legacy: { endpoint: '', status: ConnectionStatus.Loading },
    };

    expect(resolvePreferredIndexer('legacy', indexers)).toBe(IndexerType.POLKASWAP);
  });

  it('only selects fallback indexers that are configured and not unavailable', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: 'https://polkaswap.example/graphql', status: ConnectionStatus.Available },
      legacy: { endpoint: '', status: ConnectionStatus.Loading },
    };

    expect(resolveFallbackIndexer('legacy', indexers)).toBe(IndexerType.POLKASWAP);
    expect(resolveFallbackIndexer(IndexerType.POLKASWAP, indexers)).toBeNull();
  });

  it('does not fall back from Polkaswap indexer to legacy configured sources by default', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: '', status: ConnectionStatus.Unavailable },
      legacy: { endpoint: 'https://legacy.example/graphql', status: ConnectionStatus.Available },
    };

    expect(resolveFallbackIndexer(IndexerType.POLKASWAP, indexers)).toBeNull();
  });
});
