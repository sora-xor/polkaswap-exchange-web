import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type CreatePairState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  secondTokenBalance: Nullable<AccountBalance>;
  minted: CodecString;
  isAvailable: boolean;
};
