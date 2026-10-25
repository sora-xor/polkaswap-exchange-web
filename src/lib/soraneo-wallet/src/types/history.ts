import type { Operation } from '@sora-substrate/sdk';

export type HistoryQuery = {
  operationNames?: Operation[];
  assetsAddresses?: string[];
  accountAddress?: string;
  hexAddress?: string;
};

export type ExternalHistoryParams = {
  next?: boolean;
  address?: string;
  assetAddress?: string;
  pageAmount?: number;
  page?: number;
  query?: HistoryQuery;
};
