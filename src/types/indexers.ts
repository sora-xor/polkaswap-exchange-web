import { IndexerType } from '@soramitsu/soraneo-wallet-web/lib/consts';

import type { ProviderInterfaceEmitted, ProviderInterfaceEmitCb } from '@polkadot/rpc-provider/types';

export interface Indexer {
  name: string;
  type: IndexerType;
  endpoint: string;
  online: boolean;
}

export interface RunConnectionOptions {
  once?: boolean;
  timeout?: number;
  eventListeners?: Array<[ProviderInterfaceEmitted, ProviderInterfaceEmitCb]>;
}

export interface ConnectToIndexerOptions {
  indexer?: Nullable<Indexer>;
  connectionOptions?: RunConnectionOptions;
  onError?: (error) => void;
  onReconnect?: (indexer: Indexer) => void;
  onDisconnect?: (indexer: Indexer) => void;
  currentIndexerIndex?: number;
}
