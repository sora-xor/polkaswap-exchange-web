import { POLKAMARKT_COLLATERAL_ASSET } from '../consts';
import { formatMarketProbability, getMarketDisplayStatus, yesNoPricesFromProbability } from './markets';

import type { PolkamarktMarket } from '../types';

export type MarketShareTarget = 'telegram' | 'x';

const POLKASWAP_URL = 'https://polkaswap.io/';

const formatPrice = (value?: number): string =>
  Number.isFinite(value) ? `${(value ?? 0).toFixed(2)} ${POLKAMARKT_COLLATERAL_ASSET.symbol}` : 'Not indexed';

const formatUsd = (value?: number): string =>
  Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
        value ?? 0
      )
    : 'Not indexed';

const formatBlock = (value?: number): string =>
  Number.isFinite(value) ? Number(value).toLocaleString('en-US') : 'Not indexed';

/**
 * Builds the absolute static-app URL for a selected Polkamarkt market.
 * The hash route keeps the link IPFS-safe while preserving the current gateway/path.
 */
export function buildPolkamarktTradeLink(market: Pick<PolkamarktMarket, 'chainId' | 'id'>, href = ''): string {
  const marketId = market.chainId ?? market.id;
  const url = new URL(href || POLKASWAP_URL, POLKASWAP_URL);
  url.search = '';
  url.hash = `/polkamarkt/${encodeURIComponent(String(marketId))}`;
  return url.toString();
}

/**
 * Creates a compact text snapshot suitable for Telegram, social media, and chat apps.
 */
export function buildMarketShareSnapshot(market: PolkamarktMarket, currentBlock?: number): string {
  const prices = yesNoPricesFromProbability(market.probability);
  const yesPercent = formatMarketProbability(market.probability, false, 'Not indexed');
  const noPercent = formatMarketProbability(market.probability, true, 'Not indexed');
  const status = getMarketDisplayStatus(market, currentBlock) ?? 'Active';

  return [
    market.title,
    `${market.category} · ${status}`,
    `YES ${yesPercent} (${formatPrice(prices.yes)}) · NO ${noPercent} (${formatPrice(prices.no)})`,
    `Liquidity ${formatUsd(market.liquidity)} · Volume ${formatUsd(market.volume)}`,
    `Close block ${formatBlock(market.closeBlock)}`,
  ].join('\n');
}

/**
 * Adds the Polkaswap trade URL to the snapshot for copy and native share flows.
 */
export function buildMarketShareText(market: PolkamarktMarket, tradeLink: string, currentBlock?: number): string {
  return `${buildMarketShareSnapshot(market, currentBlock)}\nTrade on Polkaswap: ${tradeLink}`;
}

/**
 * Builds outbound share intent URLs while keeping the trade link as a first-class URL parameter.
 */
export function buildMarketShareUrl(target: MarketShareTarget, snapshot: string, tradeLink: string): string {
  const encodedSnapshot = encodeURIComponent(snapshot);
  const encodedLink = encodeURIComponent(tradeLink);

  if (target === 'telegram') {
    return `https://t.me/share/url?url=${encodedLink}&text=${encodedSnapshot}`;
  }

  return `https://twitter.com/intent/tweet?text=${encodedSnapshot}&url=${encodedLink}`;
}
