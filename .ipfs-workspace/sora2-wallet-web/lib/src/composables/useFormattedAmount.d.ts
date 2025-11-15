import { FPNumber, type CodecString } from '@sora-substrate/sdk';
import { BalanceType } from '@sora-substrate/sdk/build/assets/consts';
import { FontSizeRate, FontWeightRate } from '@/consts';
import type { AccountAsset, Asset } from '@sora-substrate/sdk/build/assets/types';
export declare function useFormattedAmount(): {
  FontSizeRate: typeof FontSizeRate;
  FontWeightRate: typeof FontWeightRate;
  getAssetFiatPrice: (asset: Asset | AccountAsset) => Nullable<CodecString>;
  getFiatBalance: (asset?: Nullable<AccountAsset>, type?: BalanceType) => Nullable<string>;
  getFiatAmount: (
    amount: string | CodecString,
    asset: Asset | AccountAsset,
    isCodecString?: boolean
  ) => Nullable<string>;
  getFiatAmountByString: (amount: string, asset: AccountAsset | Asset) => Nullable<string>;
  getFPNumberFiatAmountByFPNumber: (amount: FPNumber, asset?: Asset | AccountAsset) => Nullable<FPNumber>;
  getFiatAmountByFPNumber: (amount: FPNumber, asset?: Asset | AccountAsset) => Nullable<string>;
  getFiatAmountByCodecString: (amount: CodecString, asset?: Asset | AccountAsset) => Nullable<string>;
};
