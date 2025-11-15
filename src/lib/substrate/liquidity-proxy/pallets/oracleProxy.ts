import { bandQuote, bandQuoteUnchecked } from './band';

import type { QuotePayload, OracleRate } from '../types';

export const oracleProxyQuote = (symbol: string, payload: QuotePayload): OracleRate => {
  return bandQuote(symbol, payload);
};

export const oracleProxyQuoteUnchecked = (symbol: string, payload: QuotePayload): OracleRate => {
  return bandQuoteUnchecked(symbol, payload);
};
