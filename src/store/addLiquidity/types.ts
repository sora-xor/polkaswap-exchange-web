import type { CodecString } from '@sora-substrate/util';
import type { AccountBalance } from '@sora-substrate/util/build/assets/types';
import type { Subscription } from 'rxjs';

export enum FocusedField {
  First = 'firstTokenValue',
  Second = 'secondTokenValue',
}

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
  totalSupplySubscription: Nullable<Subscription>;
  focusedField: Nullable<FocusedField>;
  isAvailable: boolean;
  availabilitySubscription: Nullable<Subscription>;
};
