import { ValidatorsFilterType } from './consts';

export type ValidatorsFilter = {
  [ValidatorsFilterType.HAS_IDENTITY]: boolean;
  [ValidatorsFilterType.NOT_SLASHED]: boolean;
  [ValidatorsFilterType.NOT_OVERSUBSCRIBED]: boolean;
  [ValidatorsFilterType.TWO_VALIDATORS_PER_IDENTITY]: boolean;
};
