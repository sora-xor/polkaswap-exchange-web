import type { CodecString } from '@sora-substrate/util';

export enum FocusedField {
  First = 'firstTokenAmount',
  Second = 'secondTokenAmount',
  Percent = 'removePart',
}

export type RemoveLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  removePart: string;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  focusedField: Nullable<FocusedField>;
};
