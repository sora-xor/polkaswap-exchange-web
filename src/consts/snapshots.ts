import { SnapshotTypes } from '@/types/filters';

export const SECONDS_IN_TYPE = {
  [SnapshotTypes.DEFAULT]: 5 * 60,
  [SnapshotTypes.HOUR]: 60 * 60,
  [SnapshotTypes.DAY]: 24 * 60 * 60,
  [SnapshotTypes.MONTH]: 30 * 24 * 60 * 60,
};
