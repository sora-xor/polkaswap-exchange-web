export enum DifferenceStatus {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export const getDifferenceStatus = (value: number): string => {
  if (value > 0) return DifferenceStatus.Success;
  if (value < -5) return DifferenceStatus.Error;
  if (value < -1) return DifferenceStatus.Warning;
  return '';
};
