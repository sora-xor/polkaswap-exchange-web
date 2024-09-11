import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { Node, ConnectToNodeOptions } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';
import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';

import type { Connection } from '@sora-substrate/connection';
import type { Storage } from '@sora-substrate/sdk';

const NODE_TIMEOUT = 30_000;
const LOCK_TIMEOUT = 6_000;

export class NodesConnection {
  public readonly connection!: Connection;
  public readonly network!: SubNetworkId;
  protected readonly storage!: Storage;

  public node: Nullable<Node> = null;
  public customNodes: readonly Node[] = [];
  public defaultNodes: readonly Node[] = [];
  public nodeAddressConnecting = '';
  public chainId = '';

  protected connectionLocked = false;
  protected connectionLockTimeout: Nullable<NodeJS.Timeout> = null;

  constructor(storage: Storage, connection: Connection, network = SubNetworkId.Mainnet) {
    this.network = network;

    // It is necessary to remove Vue reactivity from instances of "Connection" and "Storage" classes.
    // When using NodesConnection in the Vue context, Vue does not add reactivity to them.
    // In this case, Vue does not mark all instances properties with getters and setters
    Object.defineProperty(this, 'connection', {
      configurable: false,
      value: connection,
    });
    Object.defineProperty(this, 'storage', {
      configurable: false,
      value: storage,
    });

    this.initData();
  }

  get nodeList(): Node[] {
    return [...this.defaultNodes, ...this.customNodes];
  }

  get nodeIsConnected(): boolean {
    return !!this.node?.address && !this.nodeAddressConnecting;
  }

  get connectionAllowance(): boolean {
    return !(this.nodeAddressConnecting && this.connectionLocked);
  }

  protected initData(): void {
    const node = this.storage.get('node');
    const nodes = this.storage.get('customNodes');

    this.setNode(node ? JSON.parse(node) : null);
    this.setCustomNodes(nodes ? JSON.parse(nodes) : []);
  }

  protected addCustomNode(node: Node): void {
    this.setCustomNodes([...this.customNodes, node]);
  }

  protected setNode(node: Nullable<Node>): void {
    if (node) {
      this.storage.set('node', JSON.stringify(node));
      this.node = Object.freeze({ ...node });
    } else {
      this.storage.remove('node');
      this.node = null;
    }
  }

  setCustomNodes(nodes: Node[]): void {
    this.storage.set('customNodes', JSON.stringify(nodes));
    this.customNodes = Object.freeze([...nodes]);
  }

  removeCustomNode(node: Node): void {
    this.setCustomNodes(this.customNodes.filter((item) => item.address !== node.address));
  }

  updateCustomNode(node: Node): void {
    this.removeCustomNode(node);
    this.addCustomNode(node);
  }

  setDefaultNodes(nodes: Array<Node>): void {
    this.defaultNodes = Object.freeze([...nodes]);

    const { node, defaultNodes } = this;

    if (!node) return;

    const defaultNode = defaultNodes.find((item) => item.address === node.address);

    if (!defaultNode) return;
    // If node from default nodes list - keep this node from localstorage up to date
    this.setNode(defaultNode);
  }

  public setNetworkChainGenesisHash(hash?: string): void {
    this.chainId = hash ?? '';
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

  protected lockConnection(): void {
    this.connectionLocked = true;
    this.connectionLockTimeout = setTimeout(this.unlockConnection.bind(this), LOCK_TIMEOUT);
  }

  protected unlockConnection(): void {
    if (this.connectionLockTimeout) {
      clearTimeout(this.connectionLockTimeout);
    }
    this.connectionLockTimeout = null;
    this.connectionLocked = false;
  }

  public async closeConnection() {
    if (!this.connection.api) return;

    const { endpoint } = this.connection;

    await this.connection.close();

    console.info(`[${this.network}] Disconnected from node`, endpoint);
  }

  public async connect(options: ConnectToNodeOptions = {}): Promise<void> {
    const { node, onError, currentNodeIndex = 0, ...restOptions } = options;

    const defaultNode = this.nodeList[currentNodeIndex];
    const requestedNode = node ?? this.node ?? defaultNode;

    try {
      this.lockConnection();
      await this.connectNode({ node: requestedNode, onError, ...restOptions });
    } catch (error) {
      onError?.(error, requestedNode);

      // if connection failed to node in state, reset node in state
      if (requestedNode.address === this.node?.address) {
        this.setNode(null);
      }

      // loop through the node list
      if (this.node?.address || currentNodeIndex !== this.defaultNodes.length - 1) {
        const nextIndex = requestedNode.address === defaultNode.address ? currentNodeIndex + 1 : 0;
        await this.connect({ onError, currentNodeIndex: nextIndex, ...restOptions });
      }

      throw error;
    }
  }

  protected async connectNode(options: ConnectToNodeOptions = {}): Promise<void> {
    const { node, connectionOptions = {}, onError, onDisconnect, onReconnect, onConnect } = options;

    const endpoint = node?.address ?? '';
    const connectionOpenOptions = {
      once: true, // by default we are trying to connect once, but keep trying after disconnect from connected node
      timeout: NODE_TIMEOUT,
      ...connectionOptions,
    };
    const isReconnection = !connectionOpenOptions.once;
    const connectingNodeChanged = () => endpoint !== this.nodeAddressConnecting;

    const connectionOnDisconnected = async () => {
      await this.closeConnection();

      if (typeof onDisconnect === 'function') {
        onDisconnect(node as Node);
      }

      this.connect({
        node,
        onError,
        onDisconnect,
        onReconnect,
        onConnect,
        connectionOptions: { ...connectionOpenOptions, once: false },
      });
    };

    const connectionOnReady = () => {
      this.connection.addEventListener('disconnected', connectionOnDisconnected);
    };

    try {
      if (!endpoint) {
        throw new Error(`[${this.network}] Node address is not set`);
      }

      this.nodeAddressConnecting = endpoint;

      console.info(`[${this.network}] Connection request to node`, endpoint);

      await this.closeConnection();

      await this.connection.open(endpoint, {
        ...connectionOpenOptions,
        eventListeners: [['ready', connectionOnReady]],
      });

      if (connectingNodeChanged()) return;

      console.info(`[${this.network}] Connected to node`, this.connection.endpoint);

      const nodeChainId = this.connection.api?.genesisHash.toHex();
      const isTrustedEndpoint = !!this.defaultNodes.find((node) => node.address === endpoint);

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
      } else {
        onConnect?.(node as Node);
      }

      this.setNode(node);
      this.nodeAddressConnecting = '';
      this.unlockConnection();
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
        this.nodeAddressConnecting = '';
      }
      throw err;
    }
  }
}
