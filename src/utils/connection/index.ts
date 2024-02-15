import type { Node, ConnectToNodeOptions } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';
import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';

import type { Connection } from '@sora-substrate/connection';
import type { Storage } from '@sora-substrate/util';

const NODE_CONNECTION_TIMEOUT = 60_000;

export class NodesConnection {
  private _node: Nullable<Node> = null;
  private _customNodes: Array<Node> = [];

  protected storage!: Storage;
  public readonly connection!: Connection;
  public readonly network!: string;

  public defaultNodes: Array<Node> = [];
  public nodeAddressConnecting = '';
  public chainId = '';
  public nodeIsConnected = false;

  constructor(storage: Storage, connection: Connection, network = 'SORA') {
    this.storage = storage;
    this.connection = connection;
    this.network = network;

    this.initData();
  }

  protected initData(): void {
    const node = this.storage.get('node');
    const nodes = this.storage.get('customNodes');

    this._node = node ? JSON.parse(node) : null;
    this._customNodes = nodes ? JSON.parse(nodes) : [];
  }

  get node(): Nullable<Node> {
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
    return this._customNodes;
  }

  set customNodes(nodes: Node[]) {
    this.storage.set('customNodes', JSON.stringify(nodes));

    this._customNodes = [...nodes];
  }

  get nodeList(): Node[] {
    return [...this.defaultNodes, ...this.customNodes];
  }

  protected updateConnectionStatus(): void {
    this.nodeIsConnected = !!this.node?.address && !this.nodeAddressConnecting && this.connection.opened;
  }

  protected addCustomNode(node: Node): void {
    this.customNodes = [...this.customNodes, node];
  }

  removeCustomNode(node: Node): void {
    this.customNodes = this.customNodes.filter((item) => item.address !== node.address);
  }

  updateCustomNode(node: Node): void {
    this.removeCustomNode(node);
    this.addCustomNode(node);
  }

  setDefaultNodes(nodes: Array<Node>): void {
    this.defaultNodes = [...nodes];

    if (!this.node) return;

    const defaultNode = this.defaultNodes.find((item) => item.address === this.node!.address);

    if (!defaultNode) return;
    // If node from default nodes list - keep this node from localstorage up to date
    this.node = defaultNode;
  }

  protected setNodeRequest(node: Node): void {
    this.nodeAddressConnecting = node.address;
    this.updateConnectionStatus();
  }

  protected setNodeSuccess(node: Node): void {
    this.node = node;
    this.setNodeFailure();
  }

  // rename
  protected setNodeFailure(): void {
    this.nodeAddressConnecting = '';
    this.updateConnectionStatus();
  }

  protected resetNode(): void {
    this.node = null;
    this.updateConnectionStatus();
  }

  public setNetworkChainGenesisHash(hash?: string): void {
    this.chainId = hash || '';
  }

  protected async updateNetworkChainGenesisHash(): Promise<void> {
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

  public async closeConnection() {
    if (!this.connection.api) return;

    const { endpoint } = this.connection;

    await this.connection.api.isReady; // [TODO] update disconnectApi in connection
    await this.connection.close();

    console.info(`[${this.network}] Disconnected from node`, endpoint);
  }

  public async connectToNode(options: ConnectToNodeOptions = {}): Promise<void> {
    const { node, onError, currentNodeIndex = 0, ...restOptions } = options;

    const defaultNode = this.nodeList[currentNodeIndex];
    const requestedNode = node ?? this.node ?? defaultNode;

    try {
      await this.setNode({ node: requestedNode, onError, ...restOptions });
    } catch (error) {
      onError?.(error, requestedNode);

      // if connection failed to node in state, reset node in state
      if (requestedNode.address === this.node?.address) {
        this.resetNode();
      }

      // loop through the node list
      if (this.node?.address || currentNodeIndex !== this.defaultNodes.length - 1) {
        const nextIndex = requestedNode.address === defaultNode.address ? currentNodeIndex + 1 : 0;
        await this.connectToNode({ onError, currentNodeIndex: nextIndex, ...restOptions });
      }

      throw error;
    }
  }

  protected async setNode(options: ConnectToNodeOptions = {}): Promise<void> {
    const { node, connectionOptions = {}, onError, onDisconnect, onReconnect } = options;

    const endpoint = node?.address ?? '';
    const isTrustedEndpoint = !!this.defaultNodes.find((node) => node.address === endpoint);
    const connectionOpenOptions = {
      once: true, // by default we are trying to connect once, but keep trying after disconnect from connected node
      timeout: NODE_CONNECTION_TIMEOUT,
      ...connectionOptions,
    };
    const isReconnection = !connectionOpenOptions.once;
    const connectingNodeChanged = () => endpoint !== this.nodeAddressConnecting;

    const connectionOnDisconnected = async () => {
      await this.closeConnection();

      if (typeof onDisconnect === 'function') {
        onDisconnect(node as Node);
      }

      this.connectToNode({
        node,
        onError,
        onDisconnect,
        onReconnect,
        connectionOptions: { ...connectionOpenOptions, once: false },
      });
    };

    const connectionOnReady = () => {
      this.connection.addEventListener('disconnected', connectionOnDisconnected);
    };

    try {
      if (!endpoint) {
        throw new Error('Node address is not set');
      }

      this.setNodeRequest(node!);

      console.info(`[${this.network}] Connection request to node`, endpoint);

      await this.closeConnection();

      await this.connection.open(endpoint, {
        ...connectionOpenOptions,
        eventListeners: [['ready', connectionOnReady]],
      });

      if (connectingNodeChanged()) return;

      console.info(`[${this.network}] Connected to node`, this.connection.endpoint);

      const nodeChainId = this.connection.api?.genesisHash.toHex();

      if (!isTrustedEndpoint) {
        // if genesis hash is not set in state, fetch it
        if (!this.chainId) {
          await this.updateNetworkChainGenesisHash();
        }

        if (this.chainId && nodeChainId !== this.chainId) {
          // disconnect from node to prevent network subscriptions activation
          await this.closeConnection();

          throw new AppHandledError(
            {
              key: 'node.errors.network',
              payload: { address: endpoint },
            },
            `Chain genesis hash doesn't match: "${nodeChainId}" received, should be "${this.chainId}"`
          );
        }
      } else {
        this.setNetworkChainGenesisHash(nodeChainId);
      }

      if (isReconnection) {
        onReconnect?.(node as Node);
      }

      this.setNodeSuccess(node!);
    } catch (error) {
      console.error(error);
      const err =
        error instanceof AppHandledError
          ? error
          : new AppHandledError({
              key: 'node.errors.connection',
              payload: { address: endpoint },
            });

      if (!connectingNodeChanged()) {
        this.setNodeFailure();
      }
      throw err;
    }
  }
}
