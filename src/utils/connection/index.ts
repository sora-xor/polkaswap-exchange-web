import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';

import type { Node, ConnectToNodeOptions } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';
import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';

import type { Connection } from '@sora-substrate/connection';
import type { Storage } from '@sora-substrate/sdk';

const NODE_TIMEOUT = 30_000;
const LOCK_TIMEOUT = 6_000;
// Backoff tuning for production-grade WS stability on Polkaswap
// Start modestly to avoid thrashing, grow with a gentle multiplier, cap at 2 minutes
const BASE_BACKOFF_DELAY = 2_000; // 2s
const BACKOFF_MULTIPLIER = 1.7; // gentler than 2x for smoother growth
const MAX_BACKOFF_DELAY = 120_000; // 120s
const LATENCY_PROBE_TIMEOUT_MS = 5_000;
const LATENCY_PROBE_MIN_INTERVAL_MS = 5 * 60_000;

export class NodesConnection {
  // Feature flags can be toggled at runtime, e.g. from App.vue after env is loaded
  static enableBackoff = false;
  static enableLatencyProbe = true;
  static enableParallelDial = false;
  static maxActiveConnections = Number.POSITIVE_INFINITY;

  private static activeConnections = new Set<NodesConnection>();
  public readonly connection!: Connection;
  public readonly network!: SubNetworkId;
  protected readonly storage!: Storage;

  public node: Nullable<Node> = null;
  public customNodes: readonly Node[] = [];
  public defaultNodes: readonly Node[] = [];
  public nodeAddressConnecting = '';
  public chainId = '';
  protected nodeLatencies: Record<string, number> = {};
  protected lastLatencyProbeTs = 0;
  protected lastLatencyProbeNodeListKey = '';
  public lastReconnectDelayMs = 0;
  public reconnectAttempt = 0;

  protected connectionLocked = false;
  protected connectionLockTimeout: Nullable<NodeJS.Timeout> = null;
  protected reconnectTimer: Nullable<NodeJS.Timeout> = null;
  protected connectPromise: Nullable<Promise<void>> = null;

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
    const lat = this.storage.get('nodeLatencies');

    this.setNode(node ? JSON.parse(node) : null);
    this.setCustomNodes(nodes ? JSON.parse(nodes) : []);
    this.nodeLatencies = lat ? JSON.parse(lat) : {};
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

  setDefaultNodes(nodes: Nullable<Array<Node>> = []): void {
    const normalizedNodes = Array.isArray(nodes) ? nodes : [];
    this.defaultNodes = Object.freeze([...normalizedNodes]);

    const { node, defaultNodes } = this;

    if (node) {
      const defaultNode = defaultNodes.find((item) => item.address === node.address);

      if (defaultNode) {
        // If node from default nodes list - keep this node from localstorage up to date
        this.setNode(defaultNode);
      }
    }

    if (this.shouldProbeNodeLatency()) {
      // fire and forget
      void this.probeAndSortDefaultNodesByLatency();
    }
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

  protected buildProbeNodeListKey(nodes: ReadonlyArray<Node> = this.defaultNodes): string {
    return [...nodes]
      .map((item) => item.address)
      .sort()
      .join('|');
  }

  protected shouldProbeNodeLatency(now = Date.now()): boolean {
    if (!NodesConnection.enableLatencyProbe) return false;
    if (this.defaultNodes.length < 2) return false;
    const nodeListKey = this.buildProbeNodeListKey();
    if (nodeListKey !== this.lastLatencyProbeNodeListKey) return true;
    if (this.lastLatencyProbeTs && now - this.lastLatencyProbeTs < LATENCY_PROBE_MIN_INTERVAL_MS) return false;
    return true;
  }

  protected async probeAndSortDefaultNodesByLatency(): Promise<void> {
    this.lastLatencyProbeTs = Date.now();
    const nodes = [...this.defaultNodes];
    this.lastLatencyProbeNodeListKey = this.buildProbeNodeListKey(nodes);
    const timings: Array<{ addr: string; t: number | null }> = await Promise.all(
      nodes.map(async (n) => {
        const start = Date.now();
        try {
          // race with timeout to avoid probe hangs delaying later retries
          await Promise.race([
            this.getChainId(n.address),
            new Promise((_resolve, reject) =>
              setTimeout(() => reject(new Error('probe-timeout')), LATENCY_PROBE_TIMEOUT_MS)
            ),
          ]);
          return { addr: n.address, t: Date.now() - start };
        } catch (_) {
          return { addr: n.address, t: null };
        }
      })
    );

    // Update latencies and persist
    const nextLatencies: Record<string, number> = {};
    timings.forEach(({ addr, t }) => {
      nextLatencies[addr] = t ?? Number.MAX_SAFE_INTEGER;
    });
    this.nodeLatencies = nextLatencies;
    this.storage.set('nodeLatencies', JSON.stringify(this.nodeLatencies));

    // Sort by latency (unknowns at end)
    const sorted = [...this.defaultNodes].sort((a, b) => {
      const ta = this.nodeLatencies[a.address] ?? Number.MAX_SAFE_INTEGER;
      const tb = this.nodeLatencies[b.address] ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
    this.defaultNodes = Object.freeze(sorted);
  }

  /** Public wrapper to trigger latency probe and resort nodes */
  public async testLatency(): Promise<void> {
    await this.probeAndSortDefaultNodesByLatency();
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

  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = null;
  }

  protected registerActiveConnection(): void {
    NodesConnection.activeConnections.add(this);
  }

  protected unregisterActiveConnection(): void {
    NodesConnection.activeConnections.delete(this);
  }

  protected guardConnectionCap(): void {
    const cap = NodesConnection.maxActiveConnections;
    if (!Number.isFinite(cap) || cap <= 0) return;
    if (NodesConnection.activeConnections.has(this)) return;

    const active = NodesConnection.activeConnections.size;
    if (active >= cap) {
      throw new Error(`[${this.network}] Active connection cap reached (${cap})`);
    }
  }

  public async closeConnection() {
    this.clearReconnectTimer();

    if (!this.connection.api) {
      this.unregisterActiveConnection();
      return;
    }

    const { endpoint } = this.connection;

    try {
      await this.connection.close();
      console.info(`[${this.network}] Disconnected from node`, endpoint);
    } finally {
      // Keep global cap bookkeeping consistent even if close() rejects.
      this.unregisterActiveConnection();
    }
  }

  public async connect(options: ConnectToNodeOptions = {}): Promise<void> {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.connectInternal(options).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  protected async connectInternal(options: ConnectToNodeOptions = {}): Promise<void> {
    const { node, onError, currentNodeIndex = 0, attempt = 0, ...restOptions } = options;

    const defaultNode = this.nodeList[currentNodeIndex];
    let requestedNode = node ?? this.node ?? defaultNode;

    // Parallel dial (probe) on cold start to choose the fastest node among top 2
    if (
      NodesConnection.enableParallelDial &&
      !this.connection?.api &&
      !node &&
      !this.node &&
      this.nodeList.length > 1
    ) {
      try {
        const top = this.nodeList.slice(0, 2);
        const race = await Promise.any(
          top.map(async (n) => {
            const start = Date.now();
            await this.getChainId(n.address);
            return { n, t: Date.now() - start };
          })
        );
        if (race?.n) {
          requestedNode = race.n;
          // Update latency cache for future sorts
          this.nodeLatencies[race.n.address] = race.t;
          this.storage.set('nodeLatencies', JSON.stringify(this.nodeLatencies));
        }
      } catch (e) {
        // ignore probe errors; fallback to requestedNode
      }
    }

    try {
      this.lockConnection();
      await this.connectNode({ node: requestedNode, onError, ...restOptions });
    } catch (error) {
      onError?.(error, requestedNode);

      // if connection failed to node in state, reset node in state
      if (requestedNode.address === this.node?.address) {
        this.setNode(null);
      }

      // loop through the node list with optional backoff scheduling
      if (this.node?.address || currentNodeIndex !== this.defaultNodes.length - 1) {
        const nextIndex = requestedNode.address === defaultNode.address ? currentNodeIndex + 1 : 0;
        // If we wrapped around to index 0, we completed a cycle and should increment attempt
        const nextAttempt = nextIndex === 0 ? attempt + 1 : 0;
        const nextNode = this.nodeList[nextIndex] ?? defaultNode;
        const nextCall = () =>
          this.connect({ onError, currentNodeIndex: nextIndex, attempt: nextAttempt, ...restOptions });
        if (NodesConnection.enableBackoff) {
          const exp = Math.min(
            MAX_BACKOFF_DELAY,
            Math.floor(BASE_BACKOFF_DELAY * Math.pow(BACKOFF_MULTIPLIER, nextAttempt))
          );
          const jitter = Math.floor(exp * 0.25 * Math.random()); // up to 25% jitter
          const delay = exp + jitter;
          this.lastReconnectDelayMs = delay;
          this.reconnectAttempt = nextAttempt;
          console.info(
            `[${this.network}] Reconnect scheduled in ${delay}ms (attempt ${nextAttempt}) to`,
            nextNode?.address
          );
          this.clearReconnectTimer();
          this.reconnectTimer = setTimeout(() => {
            // Consume reconnect promise so repeated failures do not surface as unhandled rejections.
            void nextCall().catch((retryError) => {
              console.warn(`[${this.network}] Reconnect attempt failed`, retryError);
            });
          }, delay);
          return;
        } else {
          // Avoid connectPromise self-recursion when immediate fallback is needed.
          await this.connectInternal({ onError, currentNodeIndex: nextIndex, attempt: nextAttempt, ...restOptions });
          return;
        }
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
      }).catch((reconnectError) => {
        console.warn(`[${this.network}] Reconnect after disconnect failed`, reconnectError);
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

      this.guardConnectionCap();
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

      this.clearReconnectTimer();
      this.registerActiveConnection();
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

  /** Returns measured latency in ms for a node address, if available */
  public getNodeLatency(address: string): Nullable<number> {
    const t = this.nodeLatencies[address];
    return Number.isFinite(t) ? t : null;
  }
}
