import { Status } from '@/compat/soramitsu-ui';

export function getLtvStatus(ltv: number): Status {
  let status = Status.SUCCESS;
  if (ltv > 30 && ltv <= 50) status = Status.WARNING;
  else if (ltv > 50) status = Status.ERROR;
  return status;
}
