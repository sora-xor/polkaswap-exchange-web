import { KUSD } from '@/lib/substrate/sdk/assets/consts';

export const POLKAMARKT_COLLATERAL_ASSET = KUSD;
export const POLKAMARKT_CREATION_FEE_KUSD = '5';
export const POLKAMARKT_MIN_SEED_LIQUIDITY = '100';
export const POLKAMARKT_DEFAULT_SEED_LIQUIDITY = '100';
export const POLKAMARKT_MIN_DURATION_BLOCKS = 7_200;
export const POLKAMARKT_BLOCK_TIME_MS = 6_000;
export const POLKAMARKT_MIN_QUESTION_BYTES = 32;
export const POLKAMARKT_MAX_METADATA_BYTES = 512;
export const POLKAMARKT_TRADE_FEE_BPS = 50;
export const POLKAMARKT_MAX_BATCH_CLAIMS = 24;
export const POLKAMARKT_DEFAULT_ORACLE = 'SORA On-Chain Governance';
export const POLKAMARKT_DEFAULT_RESOLUTION_SOURCE = 'Weekly SORA governance resolution batch';

export const MARKET_CATEGORIES = [
  'Politics',
  'Geopolitics',
  'Elections',
  'Crypto',
  'Macro',
  'Finance',
  'Sports',
  'Technology',
  'AI',
  'Science',
  'Climate',
  'Health',
  'Business',
  'Entertainment',
  'Culture',
  'Legal',
  'Other',
] as const;

export const MARKET_STATUS_FILTERS = ['active', 'finalized', 'all'] as const;

export const MARKET_CATEGORY_ALIASES: Record<string, MarketCategory> = {
  ecosystem: 'Crypto',
  governance: 'Politics',
  grants: 'Business',
  infrastructure: 'Technology',
  liquidity: 'Crypto',
  markets: 'Finance',
  operations: 'Business',
  partnerships: 'Business',
  protocol: 'Crypto',
  research: 'Science',
  security: 'Technology',
  tokenomics: 'Crypto',
  treasury: 'Finance',
};

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];
export type MarketStatusFilter = (typeof MARKET_STATUS_FILTERS)[number];
