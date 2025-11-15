export type SupplyChartPoint = {
  mint: number;
  burn: number;
  value: number;
  timestamp: number;
};

export function getExtremum<T extends SupplyChartPoint>(data: readonly T[], prop: keyof T, min = false): number {
  return data.reduce((acc, item) => Math[min ? 'min' : 'max'](acc, item[prop] as number), min ? Infinity : 0);
}
