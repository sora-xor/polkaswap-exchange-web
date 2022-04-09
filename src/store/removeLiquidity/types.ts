import type { CodecString } from '@sora-substrate/util';

export type FocusedField = 'removePart' | 'firstTokenAmount' | 'secondTokenAmount';

export type RemoveLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  removePart: number;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  focusedField: Nullable<FocusedField>;
  reserveA: CodecString;
  reserveB: CodecString;
  totalSupply: CodecString;
};
