import { IndexerType } from '@/lib/soraneo-wallet/src/consts';

export interface Indexer {
  name: string;
  type: IndexerType;
  endpoint: string;
  online: boolean;
}

export type FetchVariables = {
  id?: number | string;
  first?: number;
  offset?: number;
  filter?: any;
  fromTimestamp?: number;
};
