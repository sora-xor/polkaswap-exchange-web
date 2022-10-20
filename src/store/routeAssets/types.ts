import { Asset } from '@sora-substrate/util/build/assets/types';
import { Subscription } from 'rxjs';
import type { QuotePaths, QuotePayload } from '@sora-substrate/liquidity-proxy/build/types';
import type { LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy/build/consts';

export type RouteAssetsState = {
  recipients: Array<any>;
  file: Nullable<File>;
  processed: boolean;
  uploadCSVPage: boolean;
  subscriptions: Array<any>;
};

export type Recipient = {
  name: string;
  wallet: string;
  processed: boolean;
  usd: number;
  asset: Asset;
  amount: number;
};

export type RouteAssetsSubscription = {
  liquidityReservesSubscription: Subscription;
  payload: Nullable<QuotePayload>;
  paths: Nullable<QuotePaths>;
  liquiditySources: Nullable<LiquiditySourceTypes>;
  assetAddress: string;
};
