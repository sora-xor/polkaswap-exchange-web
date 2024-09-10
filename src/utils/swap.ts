import { FPNumber } from '@sora-substrate/sdk';

export enum DifferenceStatus {
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

export const calcFiatDifference = (from: FPNumber, to: FPNumber): FPNumber => {
  if (from.isZero() || to.isZero()) return FPNumber.ZERO;

  const difference = to.sub(from).div(from).mul(FPNumber.HUNDRED);

  return difference;
};

export const getDifferenceStatus = (value: number): string => {
  if (value > 0) return DifferenceStatus.Success;
  if (value < -10) return DifferenceStatus.Error;
  if (value < -1) return DifferenceStatus.Warning;
  return '';
};
