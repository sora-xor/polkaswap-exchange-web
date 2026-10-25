export type StatsRange = {
  from: number;
  to: number;
  previousFrom: number;
  previousTo: number;
};

/**
 * Builds rolling stats ranges in seconds. The upper bound intentionally uses
 * the current second, not the rounded bucket start, because indexer snapshots
 * keep their real block timestamp inside the bucket.
 */
export const createStatsRange = (nowMs: number, seconds: number, count: number): StatsRange => {
  const from = Math.floor(nowMs / 1000);
  const to = from - seconds * count;
  const previousTo = to - seconds * count;

  return {
    from,
    to,
    previousFrom: to,
    previousTo,
  };
};
