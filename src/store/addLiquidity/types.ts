import type { Subscription } from 'rxjs';
import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';

export type FocusedField = 'firstTokenValue' | 'secondTokenValue';

export type AddLiquidityState = {
  firstTokenAddress: string;
  secondTokenAddress: string;
  firstTokenValue: string;
  secondTokenValue: string;
  firstTokenBalance: Nullable<AccountBalance>;
  secondTokenBalance: Nullable<AccountBalance>;
  reserve: Nullable<Array<CodecString>>;
  reserveSubscription: Nullable<Subscription>;
  minted: CodecString;
  totalSupply: CodecString;
  focusedField: Nullable<FocusedField>;
  isAvailable: boolean;
  availabilitySubscription: Nullable<Subscription>;
};
