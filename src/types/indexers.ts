import { IndexerType } from '@soramitsu/soraneo-wallet-web/lib/consts';

export interface Indexer {
  name: string;
  type: IndexerType;
  endpoint: string;
  online: boolean;
}
