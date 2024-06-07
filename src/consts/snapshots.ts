import { SUBQUERY_TYPES } from '@soramitsu/soraneo-wallet-web';

import { Timeframes } from '@/types/filters';
import type { SnapshotFilter } from '@/types/filters';

const { SnapshotTypes } = SUBQUERY_TYPES;

export const SECONDS_IN_TYPE = {
  [SnapshotTypes.DEFAULT]: 5 * 60,
  [SnapshotTypes.HOUR]: 60 * 60,
  [SnapshotTypes.DAY]: 24 * 60 * 60,
  [SnapshotTypes.MONTH]: 30 * 24 * 60 * 60,
};

const DAY_IN_MINS_FILTER = {
  name: Timeframes.DAY,
  label: '1D',
  type: SnapshotTypes.DEFAULT,
  count: 288,
};

const DAY_IN_HOURS_FILTER = {
  name: Timeframes.DAY,
  label: '1D',
  type: SnapshotTypes.HOUR,
  count: 24,
};

const WEEK_IN_HOURS_FILTER = {
  name: Timeframes.WEEK,
  label: '1W',
  type: SnapshotTypes.HOUR,
  count: 24 * 7,
};

const MONTH_IN_DAYS_FILTER = {
  name: Timeframes.MONTH,
  label: '1M',
  type: SnapshotTypes.DAY,
  count: 30,
};

const QUARTER_IN_DAYS_FILTER = {
  name: Timeframes.QUARTER,
  label: '3M',
  type: SnapshotTypes.DAY,
  count: 90,
};

const HALF_YEAR_IN_DAYS_FILTER = {
  name: Timeframes.HALF_YEAR,
  label: '6M',
  type: SnapshotTypes.DAY,
  count: 180,
};

const YEAR_IN_MONTHS_FILTER = {
  name: Timeframes.YEAR,
  label: '1Y',
  type: SnapshotTypes.MONTH,
  count: 12,
};

const YEAR_IN_DAYS_FILTER = {
  name: Timeframes.YEAR,
  label: '1Y',
  type: SnapshotTypes.DAY,
  count: 365,
};

const ALL_IN_DAYS_FILTER = {
  name: Timeframes.ALL,
  label: 'ALL',
  type: SnapshotTypes.DAY,
  count: Infinity,
};

export const NETWORK_STATS_FILTERS: SnapshotFilter[] = [
  DAY_IN_HOURS_FILTER,
  WEEK_IN_HOURS_FILTER,
  MONTH_IN_DAYS_FILTER,
  QUARTER_IN_DAYS_FILTER,
  HALF_YEAR_IN_DAYS_FILTER,
  YEAR_IN_MONTHS_FILTER,
  ALL_IN_DAYS_FILTER,
];

export const ASSET_SUPPLY_LINE_FILTERS: SnapshotFilter[] = [
  DAY_IN_HOURS_FILTER,
  WEEK_IN_HOURS_FILTER,
  MONTH_IN_DAYS_FILTER,
  QUARTER_IN_DAYS_FILTER,
  HALF_YEAR_IN_DAYS_FILTER,
  YEAR_IN_DAYS_FILTER,
  ALL_IN_DAYS_FILTER,
];
