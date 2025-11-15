import { FPNumber } from '@sora-substrate/sdk';

import type { OCLH, SnapshotItem } from '@/types/chart';

const formatDecimal = (value: FPNumber, withSign = false): string => value.toFixed(withSign ? 2 : 4);

export const signific =
  (value: FPNumber) =>
  (positive: string, negative: string, zero: string): string => {
    if (FPNumber.gt(value, FPNumber.ZERO)) return positive;

    return FPNumber.lt(value, FPNumber.ZERO) ? negative : zero;
  };

export const formatChange = (value: FPNumber): string => {
  const sign = signific(value)('+', '', '');
  const priceChange = formatDecimal(value, true);

  return `${sign}${priceChange}`;
};

export const formatAmount = (value: FPNumber, precision: number) => {
  return value.toLocaleString(precision);
};

export const formatPriceValue = (value: FPNumber, precision: number, symbol: string) => {
  return `${formatAmount(value, precision)} ${symbol}`;
};

export const dividePrice = (priceA: number, priceB: number): number => {
  return priceB !== 0 ? priceA / priceB : 0;
};

export const dividePrices = (priceA: OCLH, priceB: OCLH): OCLH => {
  return priceA.map((price, index) => dividePrice(price, priceB[index])) as OCLH;
};

export const mergeSnapshots = (a: Nullable<SnapshotItem>, b: Nullable<SnapshotItem>): SnapshotItem => {
  const timestamp = (a?.timestamp ?? b?.timestamp) as number;
  const price = b?.price && a?.price ? dividePrices(a.price, b.price) : (a?.price ?? [0, 0, 0, 0]);
  const volume = b?.volume && a?.volume ? Math.min(b.volume, a.volume) : (a?.volume ?? 0);

  return { timestamp, price, volume };
};

export const normalizeSnapshots = (
  collection: readonly SnapshotItem[],
  difference: number,
  lastTimestamp: number
): SnapshotItem[] => {
  const sample: SnapshotItem[] = [];
  for (const item of collection) {
    const buffer: SnapshotItem[] = [];
    const prevTimestamp = sample[sample.length - 1]?.timestamp ?? lastTimestamp;

    let currentTimestamp = item.timestamp;
    while ((currentTimestamp += difference) < prevTimestamp) {
      buffer.push({
        timestamp: currentTimestamp,
        price: [item.price[1], item.price[1], item.price[1], item.price[1]],
        volume: 0,
      });
    }

    sample.push(...buffer.reverse(), item);
  }

  return sample;
};

export const getPrecision = (value: number): number => {
  let precision = 2;

  if (value === 0 || !Number.isFinite(value)) return precision;

  let abs = Math.abs(value);

  while (Math.floor(abs) <= 0) {
    abs = abs * 10;
    precision++;
  }

  return precision;
};
