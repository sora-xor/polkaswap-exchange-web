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

export enum SnapshotTypes {
  DEFAULT = 'DEFAULT',
  HOUR = 'HOUR',
  DAY = 'DAY',
  MONTH = 'MONTH',
}

export type SnapshotFilter = {
  name: Timeframes;
  label: string;
  type: SnapshotTypes;
  count: number;
  group?: number;
};
