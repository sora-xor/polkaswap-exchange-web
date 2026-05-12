import { describe, expect, it, vi } from 'vitest';

vi.mock('@tests/stubs/walletRuntime', () => ({
  WALLET_CONSTS: {
    IndexerType: {
      POLKASWAP: 'polkaswap',
    },
  },
  WALLET_TYPES: {
    ConnectionStatus: {
      Available: 'available',
      Unavailable: 'unavailable',
      Loading: 'loading',
    },
  },
}));

import { resolveIndexerStatus } from '@/components/App/Footer/utils/resolveIndexerStatus';

describe('resolveIndexerStatus', () => {
  it('returns the selected indexer status when it is present', () => {
    const result = resolveIndexerStatus(
      'polkaswap' as any,
      {
        polkaswap: { status: 'available' as any },
      } as any
    );

    expect(result).toBe('available');
  });

  it('falls back to available when selected status is missing', () => {
    const result = resolveIndexerStatus(
      'polkaswap' as any,
      {
        polkaswap: {},
        backup: { status: 'available' as any },
      } as any
    );

    expect(result).toBe('available');
  });

  it('falls back to unavailable when no indexer is available', () => {
    const result = resolveIndexerStatus(
      'polkaswap' as any,
      {
        polkaswap: {},
        backup: { status: 'unavailable' as any },
      } as any
    );

    expect(result).toBe('unavailable');
  });

  it('returns loading when no indexer has status information', () => {
    const result = resolveIndexerStatus(
      'polkaswap' as any,
      {
        polkaswap: {},
        backup: {},
      } as any
    );

    expect(result).toBe('loading');
  });
});
