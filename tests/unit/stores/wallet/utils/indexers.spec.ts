import { describe, expect, it } from 'vitest';

import { ConnectionStatus } from '@/lib/soraneo-wallet/src/types/common';
import { IndexerType } from '@/lib/soraneo-wallet/src/consts';
import { hasConfiguredIndexerEndpoint, resolvePreferredIndexer } from '@/stores/wallet/utils/indexers';

describe('wallet indexer selection helpers', () => {
  it('treats empty endpoints as unconfigured', () => {
    expect(hasConfiguredIndexerEndpoint({ endpoint: '' })).toBe(false);
    expect(hasConfiguredIndexerEndpoint({ endpoint: 'https://indexer.example/graphql' })).toBe(true);
  });

  it('rejects unsupported requested indexers', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: 'https://polkaswap.example/graphql', status: ConnectionStatus.Available },
      legacy: { endpoint: 'https://legacy.example/graphql', status: ConnectionStatus.Available },
    };

    expect(resolvePreferredIndexer('legacy', indexers)).toBeNull();
  });

  it('rejects the requested indexer when it has no endpoint', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: 'https://polkaswap.example/graphql', status: ConnectionStatus.Available },
    };

    expect(resolvePreferredIndexer(IndexerType.POLKASWAP, { [IndexerType.POLKASWAP]: { endpoint: '' } })).toBeNull();
    expect(resolvePreferredIndexer(IndexerType.POLKASWAP, indexers)).toBe(IndexerType.POLKASWAP);
  });

  it('rejects unsupported requested indexers even when no endpoint is configured', () => {
    const indexers = {
      [IndexerType.POLKASWAP]: { endpoint: '', status: ConnectionStatus.Loading },
      legacy: { endpoint: '', status: ConnectionStatus.Loading },
    };

    expect(resolvePreferredIndexer('legacy', indexers)).toBeNull();
  });
});
