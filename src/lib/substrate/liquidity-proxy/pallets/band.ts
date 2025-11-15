import type { QuotePayload, OracleRate } from '../types';

export const bandQuote = (symbol: string, payload: QuotePayload): OracleRate => {
  if (!(symbol in payload.rates)) {
    throw new Error(`[liquidityProxy] Band: Rate not exists for symbol "${symbol}"`);
  }

  const rate = payload.rates[symbol];
  const currentTime = Date.now(); // ms
  const stalePeriod = payload.consts.band.rateStalePeriod; //ms
  const lastUpdated = rate.lastUpdated * 1000; //ms

  if (lastUpdated >= currentTime) {
    throw new Error(`[liquidityProxy] Band: "${symbol}" Rate has invalid timestamp: "${lastUpdated}"`);
  }

  const currentPeriod = currentTime - lastUpdated;

  if (currentPeriod > stalePeriod) {
    throw new Error(`[liquidityProxy] Band: "${symbol}" Rate is expired and can't be used until next update`);
  }

  return rate;
};

export const bandQuoteUnchecked = (symbol: string, payload: QuotePayload): OracleRate => {
  return payload.rates[symbol];
};
