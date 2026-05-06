import { MarketAlgorithms } from '@/consts';

/**
 * Ensures the settings popup always has at least one selectable algorithm tab.
 */
export const resolveMarketAlgorithms = (algorithms: ReadonlyArray<MarketAlgorithms>): Array<MarketAlgorithms> => {
  return algorithms.length ? [...algorithms] : [MarketAlgorithms.SMART];
};

/**
 * Returns a valid currently selected algorithm for the available tabs.
 */
export const resolveCurrentMarketAlgorithm = (
  isAvailable: boolean,
  selected: MarketAlgorithms,
  available: ReadonlyArray<MarketAlgorithms>
): MarketAlgorithms => {
  if (!isAvailable) return MarketAlgorithms.SMART;

  return available.includes(selected) ? selected : MarketAlgorithms.SMART;
};
