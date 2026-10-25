export type SupplyChartPoint = {
  mint: number;
  burn: number;
  value: number;
  timestamp: number;
};

export function getExtremum<T extends SupplyChartPoint>(data: readonly T[], prop: keyof T, min = false): number {
  return data.reduce((acc, item) => Math[min ? 'min' : 'max'](acc, item[prop] as number), min ? Infinity : 0);
}

/**
 * Returns a tight positive range for absolute supply charts so small token-level
 * changes are visible even when total issuance is very large.
 */
export function getSupplyRange<T extends SupplyChartPoint>(
  data: readonly T[],
  paddingRate = 0.1
): { min: number; max: number } | undefined {
  const values = data.map((item) => item.value).filter(Number.isFinite);
  if (values.length < 2) return undefined;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return undefined;

  const padding = (max - min) * paddingRate;

  return {
    min: Math.max(0, min - padding),
    max: max + padding,
  };
}

/** Returns a positive log-axis range for remint and burn bars, including values below 1. */
export function getMintBurnRange<T extends SupplyChartPoint>(
  data: readonly T[],
  paddingRate = 0.2
): { min: number; max: number } | undefined {
  const values = data
    .flatMap((item) => [item.mint, item.burn])
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return undefined;

  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    min: min / (1 + paddingRate),
    max: max * (1 + paddingRate),
  };
}
