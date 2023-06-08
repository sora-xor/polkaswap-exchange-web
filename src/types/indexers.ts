import type { ProviderInterfaceEmitted, ProviderInterfaceEmitCb } from '@polkadot/rpc-provider/types';
import { IndexerType } from '@soramitsu/soraneo-wallet-web/lib/consts';

export interface Indexer {
  name: string;
  type: IndexerType;
  address: string;
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
