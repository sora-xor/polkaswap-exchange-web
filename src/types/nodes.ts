import type { ProviderInterfaceEmitted, ProviderInterfaceEmitCb } from '@polkadot/rpc-provider/types';

export interface Node {
  chain: string;
  name: string;
  address: string;
  location?: string;
}

export interface NodeItem extends Node {
  title?: string;
  connecting?: boolean;
}

export interface RunConnectionOptions {
  once?: boolean;
  timeout?: number;
  eventListeners?: Array<[ProviderInterfaceEmitted, ProviderInterfaceEmitCb]>;
}

export interface ConnectToNodeOptions {
  node?: Nullable<Node>;
  connectionOptions?: RunConnectionOptions;
  onError?: (error, node: Node) => void;
  onReconnect?: (node: Node) => void;
  onDisconnect?: (node: Node) => void;
  currentNodeIndex?: number;
}
