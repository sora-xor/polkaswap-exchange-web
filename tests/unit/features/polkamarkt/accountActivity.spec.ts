import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const indexerRequestMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({
  getCurrentIndexer: () => ({
    services: {
      explorer: {
        request: indexerRequestMock,
      },
    },
  }),
}));

import { fetchPolkamarktAccountActivity, parseAccountActivity } from '@/features/polkamarkt/services/accountActivity';

describe('polkamarkt account activity service', () => {
  beforeEach(() => {
    indexerRequestMock.mockReset();
  });

  it('queries account positions and trades with PostGraphile filters', async () => {
    indexerRequestMock.mockResolvedValueOnce({
      accountPositions: { edges: [] },
      accountTrades: { edges: [] },
    });

    await expect(fetchPolkamarktAccountActivity('cnAccount', 25)).resolves.toMatchObject({
      account: 'cnAccount',
      positions: [],
      trades: [],
    });

    const [query, variables] = indexerRequestMock.mock.calls[0] ?? [];
    const source = print(query);
    expect(source).toMatch(/accountPositions\([^)]*filter:/s);
    expect(source).toMatch(/accountTrades\([^)]*filter:/s);
    expect(source).not.toContain('where:');
    expect(variables).toEqual({ account: 'cnAccount', limit: 25 });
  });

  it('parses account activity nodes from connection payloads', () => {
    expect(
      parseAccountActivity(
        {
          accountPositions: {
            edges: [{ node: { id: 'p1', marketId: '7', outcome: 'YES', shares: '2' } }],
          },
          accountTrades: {
            edges: [{ node: { id: 't1', marketId: '7', side: 'buy', sharesOut: '2', timestamp: 1_700_000_000 } }],
          },
        },
        'cnAccount'
      )
    ).toMatchObject({
      account: 'cnAccount',
      positions: [{ id: 'p1', marketId: 7, outcome: 'YES', shares: 2 }],
      trades: [{ id: 't1', marketId: 7, side: 'buy', sharesOut: 2, timestamp: '2023-11-14T22:13:20.000Z' }],
    });
  });
});
