import { SnapshotTypes, Timeframes } from '@/types/filters';

import type { SnapshotFilter } from '@/types/filters';

export const SECONDS_IN_TYPE = {
  [SnapshotTypes.DEFAULT]: 5 * 60,
  [SnapshotTypes.HOUR]: 60 * 60,
  [SnapshotTypes.DAY]: 24 * 60 * 60,
  [SnapshotTypes.MONTH]: 30 * 24 * 60 * 60,
};

export const NETWORK_STATS_FILTERS: SnapshotFilter[] = [
  {
    name: Timeframes.DAY,
    label: '1D',
    type: SnapshotTypes.HOUR,
    count: 24,
  },
  {
    name: Timeframes.WEEK,
    label: '1W',
    type: SnapshotTypes.HOUR,
    count: 24 * 7,
  },
  {
    name: Timeframes.MONTH,
    label: '1M',
    type: SnapshotTypes.DAY,
    count: 30,
  },
  {
    name: Timeframes.QUARTER,
    label: '3M',
    type: SnapshotTypes.DAY,
    count: 90,
  },
  {
    name: Timeframes.YEAR,
    label: '1Y',
    type: SnapshotTypes.MONTH,
    count: 12,
  },
];
