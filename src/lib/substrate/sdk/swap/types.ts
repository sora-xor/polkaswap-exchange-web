import type { SwapQuote, LiquiditySourceTypes } from '@sora-substrate/liquidity-proxy';
import type { DexId } from '../dex/consts';
import { FPNumber, NumberLike } from '@sora-substrate/math';

export interface SwapTransferBatchData {
  outcomeAssetId: string;
  outcomeAssetReuse: FPNumber | NumberLike;
  receivers: Array<SwapTransferBatchReceiver>;
  dexId: DexId;
}

export interface SwapTransferBatchReceiver {
  accountId: string;
  targetAmount: FPNumber | NumberLike;
}

export interface ReceiverHistoryItem {
  accountId?: string;
  amount?: string;
  assetId: string;
}

export interface SwapTransferBatchRates {
  [assetSymbol: string]: string; // dictionary type object, contains  prices of a batch's token in dollars at the time of the transaction.  { "val" = "0.37" }
}

export interface SwapTransferBatchAdditionalData {
  rates: SwapTransferBatchRates;
}

export type SwapQuoteData = {
  quote: SwapQuote;
  isAvailable: boolean;
  liquiditySources: LiquiditySourceTypes[];
};

export type FilterMode = 'Disabled' | 'AllowSelected' | 'ForbidSelected';
