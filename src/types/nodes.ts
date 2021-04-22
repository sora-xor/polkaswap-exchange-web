export interface Node {
  chain: string;
  name: string;
  address: string;
}

export interface NodeItemNetworkStatus {
  checked: boolean;
  online: boolean;
}

export interface NodeItem extends Node {
  title?: string;
  networkStatus?: NodeItemNetworkStatus;
}
