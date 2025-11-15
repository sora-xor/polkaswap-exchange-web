import { LiquiditySourceTypes } from '../consts';
import { LiquidityRegistry } from './liquidityProxy/liquidityRegistry';

import type { QuotePayload } from '../types';

// list_liquidity_sources
/**
 * Liquidity sources for direct exchange between two asssets
 */
export const listLiquiditySources = (
  baseAssetId: string,
  syntheticBaseAssetId: string,
  inputAssetId: string,
  outputAssetId: string,
  selectedSources: LiquiditySourceTypes[] = [],
  payload: QuotePayload
): Array<LiquiditySourceTypes> => {
  return Object.values(LiquiditySourceTypes).filter((source) => {
    if (!source) return false;
    if (selectedSources.length && !selectedSources.includes(source)) return false;
    if (payload.lockedSources.includes(source)) return false;
    return LiquidityRegistry.canExchange(source)(
      baseAssetId,
      syntheticBaseAssetId,
      inputAssetId,
      outputAssetId,
      payload
    );
  });
};
