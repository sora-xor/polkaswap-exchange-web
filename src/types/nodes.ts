export interface Node {
  chain: string;
  name: string;
  address: string;
}

export interface NodeItem extends Node {
  title?: string;
  connecting?: boolean;
}
