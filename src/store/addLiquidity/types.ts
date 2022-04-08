import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type FocusedField = 'firstTokenValue' | 'secondTokenValue';

export type AddLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  secondTokenBalance: Nullable<AccountBalance>;
  reserve: Nullable<Array<CodecString>>;
  minted: CodecString;
  totalSupply: CodecString;
  focusedField: Nullable<FocusedField>;
  isAvailable: boolean;
};
