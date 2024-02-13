import type { Node } from '@/types/nodes';
import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';

import type { Connection } from '@sora-substrate/connection';
import type { Storage } from '@sora-substrate/util';

const NODE_CONNECTION_TIMEOUT = 60_000;

class NodesConnection {
  private _node: Nullable<Node> = null;
  private _customNodes: Array<Node> = [];

  public defaultNodes: Array<Node> = [];
  public nodeAddressConnecting = '';
  public chainGenesisHash = '';

  protected storage!: Storage;
  protected connection!: Connection;

  constructor(storage: Storage, connection: Connection) {
    this.storage = storage;
    this.connection = connection;
  }

  get node(): Nullable<Node> {
    const node = this.storage.get('node');

    this._node = node ? JSON.parse(node) : null;

    return this._node;
  }

  set node(node: Nullable<Node>) {
    if (node) {
      this.storage.set('node', JSON.stringify(node));
    } else {
      this.storage.remove('node');
    }

    this._node = node;
  }

  get customNodes(): Node[] {
    const nodes = this.storage.get('customNodes');

    this._customNodes = nodes ? JSON.parse(nodes) : [];

    return this._customNodes;
  }

  set customNodes(nodes: Node[]) {
    this.storage.set('customNodes', JSON.stringify(nodes));
    this._customNodes = [...nodes];
  }

  get nodeList(): Node[] {
    return [...this.defaultNodes, ...this.customNodes];
  }

  updateCustomNode(node: Node): void {
    this.removeCustomNode(node);
    this.customNodes = [...this.customNodes, node];
  }

  removeCustomNode(node: Node): void {
    this.customNodes = this.customNodes.filter((item) => item.address !== node.address);
  }

  setDefaultNodes(nodes: Array<Node>): void {
    this.defaultNodes = [...nodes];

    if (!this.node) return;

    const defaultNode = this.defaultNodes.find((item) => item.address === this.node!.address);

    if (!defaultNode) return;
    // If node from default nodes list - keep this node from localstorage up to date
    this.node = defaultNode;
  }

  setNodeRequest(node: Node): void {
    this.nodeAddressConnecting = node.address;
  }

  setNodeSuccess(node: Node): void {
    this.node = node;
    this.setNodeFailure();
  }

  // rename
  setNodeFailure(): void {
    this.nodeAddressConnecting = '';
  }

  resetNode(): void {
    this.node = null;
  }

  setNetworkChainGenesisHash(hash?: string): void {
    this.chainGenesisHash = hash || '';
  }

  async updateNetworkChainGenesisHash(): Promise<void> {
    try {
      const genesisHash = await Promise.any(this.defaultNodes.map((node) => this.getChainId(node.address)));
      this.setNetworkChainGenesisHash(genesisHash);
    } catch (error) {
      console.error(error);
    }
  }

  protected async getChainId(endpoint: string) {
    const id = await fetchRpc(getRpcEndpoint(endpoint), 'chain_getBlockHash', [0]);

    return id;
  }

  async closeConnectionWithInfo() {
    const { endpoint, opened } = this.connection;

    if (endpoint && opened) {
      await this.connection.close();
      console.info('[SORA] Disconnected from node', endpoint);
    }
  }
}
