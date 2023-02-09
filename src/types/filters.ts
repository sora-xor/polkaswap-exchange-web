import type { SnapshotTypes } from '@soramitsu/soraneo-wallet-web/lib/services/subquery/types';

export enum Timeframes {
  FIVE_MINUTES = 'FIVE_MINUTES',
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',
  THIRTY_MINUTES = 'THIRTY_MINUTES',
  HOUR = 'HOUR',
  FOUR_HOURS = 'FOUR_HOURS',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  ALL = 'ALL',
}

export type SnapshotFilter = {
  name: Timeframes;
  label: string;
  type: SnapshotTypes;
  count: number;
  group?: number;
};
