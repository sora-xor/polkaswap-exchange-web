import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type AddLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  secondTokenBalance: Nullable<AccountBalance>;
  reserve: Nullable<Array<CodecString>>;
  minted: CodecString;
  totalSupply: CodecString;
  focusedField: Nullable<string>;
  isAvailable: boolean;
};
