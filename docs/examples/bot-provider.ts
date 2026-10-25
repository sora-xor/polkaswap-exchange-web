import type { BotProviderRequest, BotProviderResponse } from '../../src/features/bot-trading/provider-protocol';

/** Minimal provider logic: adapt behind an authenticated HTTPS endpoint with explicit CORS. */
export function exampleBotResponse(request: BotProviderRequest): BotProviderResponse {
  if (request.version !== 1 || request.task !== 'trade') throw new Error('Unsupported provider request');
  return { proposal: { action: 'hold', amount: '0', reason: 'No configured trading signal.' } };
}
