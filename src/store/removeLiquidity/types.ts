import type { CodecString } from '@sora-substrate/util';

export type RemoveLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  removePart: number;
  liquidityAmount: string;
  firstTokenAmount: string;
  secondTokenAmount: string;
  focusedField: Nullable<string>;
  reserveA: CodecString;
  reserveB: CodecString;
  totalSupply: CodecString;
};
