/**
 * General status enum. Used, for example, in notifications and alerts.
 */
const statusValues = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Error: 'error',
} as const;

export const Status = {
  ...statusValues,
  INFO: statusValues.Info,
  SUCCESS: statusValues.Success,
  WARNING: statusValues.Warning,
  ERROR: statusValues.Error,
} as const;

export type Status = (typeof statusValues)[keyof typeof statusValues];
export type StatusValue = Status;

export const SortDirection = {
  ASC: 'ascending',
  DESC: 'descending',
} as const;

export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];
