import { CodecString, AccountAsset, LPRewardsInfo } from '@sora-substrate/util';

interface SwapInfo {
  title: string;
  tokenFrom?: Nullable<AccountAsset>;
  tokenTo?: Nullable<AccountAsset>;
  minMaxReceived?: CodecString;
  isExchangeB?: boolean;
  liquidityProviderFee?: CodecString;
  rewards?: Array<LPRewardsInfo>;
  priceImpact?: string;
}

export const MOCK_SWAP_INFO: Array<SwapInfo> = [];
