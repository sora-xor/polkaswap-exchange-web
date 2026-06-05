import { describe, expect, it } from 'vitest';

import {
  buildMarketShareSnapshot,
  buildMarketShareText,
  buildMarketShareUrl,
  buildPolkamarktTradeLink,
} from '@/features/polkamarkt/lib/share';

import type { PolkamarktMarket } from '@/features/polkamarkt/types';

const market = {
  id: 'market-node-1',
  chainId: 42,
  title: 'Will the Straight of Hormuz remain open?',
  category: 'Geopolitics',
  status: 'Open',
  liquidity: 156.579,
  volume: 54.5,
  probability: 29,
  closeBlock: 26389173,
} satisfies PolkamarktMarket;

describe('polkamarkt share helpers', () => {
  it('builds static hash trade links for selected markets', () => {
    expect(buildPolkamarktTradeLink(market, 'https://polkaswap.io/ipfs/root/#/polkamarkt')).toBe(
      'https://polkaswap.io/ipfs/root/#/polkamarkt/42'
    );
  });

  it('creates a compact market snapshot and copy text with a trade link', () => {
    const link = buildPolkamarktTradeLink(market, 'https://polkaswap.io/#/polkamarkt');
    const snapshot = buildMarketShareSnapshot(market);
    const text = buildMarketShareText(market, link);

    expect(snapshot).toContain(market.title);
    expect(snapshot).toContain('YES 29% (0.29 KUSD)');
    expect(snapshot).toContain('NO 71% (0.71 KUSD)');
    expect(snapshot).toContain('Liquidity $157');
    expect(snapshot).toContain('Close block 26,389,173');
    expect(text).toContain(`Trade on Polkaswap: ${link}`);
  });

  it('marks share snapshots as closed after the close block passes', () => {
    expect(buildMarketShareSnapshot(market, market.closeBlock)).toContain('Geopolitics · Closed');
  });

  it('builds Telegram and X intent URLs with encoded snapshot and link', () => {
    const link = buildPolkamarktTradeLink(market, 'https://polkaswap.io/#/polkamarkt');
    const snapshot = buildMarketShareSnapshot(market);

    expect(buildMarketShareUrl('telegram', snapshot, link)).toContain('https://t.me/share/url?');
    expect(buildMarketShareUrl('telegram', snapshot, link)).toContain(encodeURIComponent(link));
    expect(buildMarketShareUrl('x', snapshot, link)).toContain('https://twitter.com/intent/tweet?');
    expect(buildMarketShareUrl('x', snapshot, link)).toContain(encodeURIComponent(snapshot));
  });
});
