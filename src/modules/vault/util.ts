import { FPNumber } from '@sora-substrate/sdk';

import { Status } from '@soramitsu-ui/ui/types';

const ZERO = FPNumber.ZERO;

export function subtractWithFloor(value: FPNumber, amount: FPNumber): FPNumber {
  const result = value.sub(amount);
  return result.lt(ZERO) ? ZERO : result;
}

export function percentOf(value: FPNumber, total: FPNumber): number {
  if (total.isZero()) return 0;

  const percent = value.div(total).mul(new FPNumber(100)).toNumber();

  if (!Number.isFinite(percent)) return 0;

  if (percent < 0) return 0;
  if (percent > 100) return 100;
  return percent;
}

export function clampByAvailable(value: FPNumber, available: FPNumber): FPNumber {
  if (value.lt(ZERO)) return ZERO;
  if (value.gt(available)) return available;
  return value;
}

export function getLtvStatus(ltv: number): Status {
  if (ltv > 50) return Status.Error;
  if (ltv > 30) return Status.Warning;
  return Status.Success;
}
