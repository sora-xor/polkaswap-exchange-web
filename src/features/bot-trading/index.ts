/** Public feature entry point. Signing capabilities and provider credentials remain private. */
export { botTradingRoutes } from './routes';
/** Lightweight flag the top bar reads before loading the bot engine. */
export { botRunsHint } from './run-hint';
export type { BotDefinition, BotPolicy, BotPortfolio, StrategyConfig, TradeProposal } from './types';
