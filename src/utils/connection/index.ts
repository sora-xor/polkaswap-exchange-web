import { SubNetworkId } from '@sora-substrate/sdk/build/bridgeProxy/sub/consts';
import { shallowRef, toRaw, type ShallowRef } from 'vue';

import type { Node, ConnectToNodeOptions } from '@/types/nodes';
import { AppHandledError } from '@/utils/error';
import { fetchRpc, getRpcEndpoint } from '@/utils/rpc';
import { parseStoredJson } from '@/utils/storageParsing';

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
const NODE_SELECTION_MODE_STORAGE_KEY = 'nodeSelectionMode';

type NodeSelectionMode = 'auto' | 'manual';

const isNodeSelectionMode = (value: string): value is NodeSelectionMode => value === 'auto' || value === 'manual';

const isNode = (value: unknown): value is Node => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const candidate = value as Partial<Node>;
  return (
    typeof candidate.chain === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.address === 'string' &&
    candidate.address.length > 0 &&
    (candidate.location === undefined || typeof candidate.location === 'string')
  );
};

const isNodeList = (value: unknown): value is Node[] => Array.isArray(value) && value.every(isNode);

const isNodeLatencies = (value: unknown): value is Record<string, number> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((latency) => typeof latency === 'number' && Number.isFinite(latency) && latency >= 0);

const statusRevisions = new WeakMap<object, ShallowRef<number>>();

const getStatusRevision = (connection: object): ShallowRef<number> => {
  const revision = statusRevisions.get(toRaw(connection));

  if (!revision) {
    throw new Error('NodesConnection status revision is not initialized');
  }

  return revision;
};

/**
 * Lightweight reactive state exposed by a raw {@link NodesConnection}.
 *
 * The connection and SDK storage instances must not be proxied by Vue, so UI
 * consumers should observe this immutable snapshot instead of their internals.
 */
export interface NodesConnectionStatus {
  readonly node: Nullable<Node>;
  readonly nodeList: readonly Node[];
  readonly customNodes: readonly Node[];
  readonly defaultNodes: readonly Node[];
  readonly nodeAddressConnecting: string;
  readonly connectionAllowance: boolean;
  readonly connected: boolean;
}

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
  protected nodeSelectionMode: NodeSelectionMode = 'auto';
  protected lastLatencyProbeTs = 0;
  protected lastLatencyProbeNodeListKey = '';
  protected latencyProbePromise: Nullable<Promise<void>> = null;
  public lastReconnectDelayMs = 0;
  public reconnectAttempt = 0;

  protected connectionLocked = false;
  protected connectionLockTimeout: Nullable<NodeJS.Timeout> = null;
  protected reconnectTimer: Nullable<NodeJS.Timeout> = null;
  protected connectPromise: Nullable<Promise<void>> = null;
  private connectionRequestRevision = 0;

  constructor(storage: Storage, connection: Connection, network = SubNetworkId.Mainnet) {
    statusRevisions.set(this, shallowRef(0));
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
    const activeEndpoint = this.connection?.endpoint ?? '';
    const hasLiveApi = Boolean(this.connection?.api);

    return Boolean(
      this.node?.address && hasLiveApi && activeEndpoint === this.node.address && !this.nodeAddressConnecting
    );
  }

  get connectionAllowance(): boolean {
    return !(this.nodeAddressConnecting && this.connectionLocked);
  }

  /**
   * Returns an immutable status snapshot while tracking the private revision
   * ref. A fresh object ensures computed consumers observe every transition.
   */
  public get status(): NodesConnectionStatus {
    // Keep the ref outside the class instance: Vue may proxy NodesConnection
    // and would otherwise unwrap a ref-valued field before `.value` is read.
    void getStatusRevision(this).value;

    return Object.freeze({
      node: this.node,
      nodeList: Object.freeze(this.nodeList),
      customNodes: this.customNodes,
      defaultNodes: this.defaultNodes,
      nodeAddressConnecting: this.nodeAddressConnecting,
      connectionAllowance: this.connectionAllowance,
      connected: this.nodeIsConnected,
    });
  }

  /**
   * Invalidates reactive status consumers after raw runtime state changes.
   */
  protected touchStatus(): void {
    getStatusRevision(this).value += 1;
  }

  protected initData(): void {
    const node = this.storage.get('node');
    const nodes = this.storage.get('customNodes');
    const lat = this.storage.get('nodeLatencies');
    const selectedNode = parseStoredJson(node, null as Nullable<Node>, (value): value is Nullable<Node> =>
      isNode(value)
    );
    const customNodes = parseStoredJson(nodes, [] as Node[], isNodeList);

    this.setCustomNodes(customNodes);
    this.setNodeSelectionMode(this.resolveInitialNodeSelectionMode(selectedNode, customNodes));
    this.setNode(selectedNode);
    this.nodeLatencies = parseStoredJson(lat, {} as Record<string, number>, isNodeLatencies);
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
    this.touchStatus();
  }

  /**
   * Classifies old persisted defaults as automatic selections while preserving
   * user-added custom nodes as manual choices across upgrades.
   */
  protected resolveInitialNodeSelectionMode(node: Nullable<Node>, customNodes: readonly Node[]): NodeSelectionMode {
    const storedMode = this.storage.get(NODE_SELECTION_MODE_STORAGE_KEY);
    if (isNodeSelectionMode(storedMode)) return storedMode;
    if (node && customNodes.some((item) => item.address === node.address)) return 'manual';
    return 'auto';
  }

  protected setNodeSelectionMode(mode: NodeSelectionMode): void {
    this.nodeSelectionMode = mode;
    this.storage.set(NODE_SELECTION_MODE_STORAGE_KEY, mode);
  }

  protected shouldUseAutoNodeSelection(): boolean {
    return this.nodeSelectionMode !== 'manual';
  }

  setCustomNodes(nodes: Node[]): void {
    this.storage.set('customNodes', JSON.stringify(nodes));
    this.customNodes = Object.freeze([...nodes]);
    this.touchStatus();
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
    this.touchStatus();

    const { node, defaultNodes } = this;

    if (node) {
      const defaultNode = defaultNodes.find((item) => item.address === node.address);
      const customNode = this.customNodes.find((item) => item.address === node.address);

      if (defaultNode) {
        // If node from default nodes list - keep this node from localstorage up to date
        this.setNode(defaultNode);
      } else if (!customNode) {
        // Drop stale persisted defaults so removed offline endpoints are not retried invisibly.
        this.setNode(null);
        this.setNodeSelectionMode('auto');
      }
    }

    if (this.shouldProbeNodeLatency()) {
      void this.probeAndSelectFastestDefaultNode().catch((error) => {
        console.warn(`[${this.network}] Node latency probe failed`, error);
      });
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

  protected async probeNodeLatency(address: string): Promise<number | null> {
    const start = Date.now();
    let timeout: Nullable<ReturnType<typeof setTimeout>> = null;

    try {
      await Promise.race([
        this.getChainId(address),
        new Promise((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('probe-timeout')), LATENCY_PROBE_TIMEOUT_MS);
        }),
      ]);
      return Date.now() - start;
    } catch (_) {
      return null;
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  protected async refreshDefaultNodeLatency(): Promise<void> {
    if (!this.latencyProbePromise) {
      this.latencyProbePromise = this.probeAndSortDefaultNodesByLatency().finally(() => {
        this.latencyProbePromise = null;
      });
    }

    await this.latencyProbePromise;
  }

  protected async probeAndSortDefaultNodesByLatency(): Promise<void> {
    this.lastLatencyProbeTs = Date.now();
    const nodes = [...this.defaultNodes];
    this.lastLatencyProbeNodeListKey = this.buildProbeNodeListKey(nodes);
    const timings: Array<{ addr: string; t: number | null }> = await Promise.all(
      nodes.map(async (n) => {
        return { addr: n.address, t: await this.probeNodeLatency(n.address) };
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
    this.touchStatus();
  }

  protected getFastestDefaultNode(): Nullable<Node> {
    const [fastestNode] = [...this.defaultNodes].sort((a, b) => {
      const ta = this.nodeLatencies[a.address] ?? Number.MAX_SAFE_INTEGER;
      const tb = this.nodeLatencies[b.address] ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

    return fastestNode ?? null;
  }

  /**
   * Stores the fastest default node for automatic selection while leaving
   * manual user choices untouched.
   */
  protected selectFastestDefaultNode(): void {
    if (!this.shouldUseAutoNodeSelection()) return;

    const fastestNode = this.getFastestDefaultNode();
    if (!fastestNode) return;

    this.setNode(fastestNode);
    this.setNodeSelectionMode('auto');
  }

  protected async probeAndSelectFastestDefaultNode(): Promise<void> {
    if (this.latencyProbePromise) {
      await this.latencyProbePromise;
    }

    if (this.shouldProbeNodeLatency()) {
      await this.refreshDefaultNodeLatency();
    }

    this.selectFastestDefaultNode();
  }

  /** Public wrapper to trigger latency probe and resort nodes */
  public async testLatency(): Promise<void> {
    await this.refreshDefaultNodeLatency();
    this.selectFastestDefaultNode();
  }

  protected lockConnection(): void {
    if (this.connectionLockTimeout) {
      clearTimeout(this.connectionLockTimeout);
    }
    this.connectionLocked = true;
    this.connectionLockTimeout = setTimeout(this.unlockConnection.bind(this), LOCK_TIMEOUT);
    this.touchStatus();
  }

  protected unlockConnection(): void {
    if (this.connectionLockTimeout) {
      clearTimeout(this.connectionLockTimeout);
    }
    this.connectionLockTimeout = null;
    this.connectionLocked = false;
    this.touchStatus();
  }

  protected clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = null;
    this.touchStatus();
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
      this.touchStatus();
      return;
    }

    const { endpoint } = this.connection;

    try {
      await this.connection.close();
      console.info(`[${this.network}] Disconnected from node`, endpoint);
    } finally {
      // Keep global cap bookkeeping consistent even if close() rejects.
      this.unregisterActiveConnection();
      this.touchStatus();
    }
  }

  /**
   * Cancels the complete connection lifecycle and waits for its active request
   * to observe cancellation.
   *
   * `closeConnection` remains a transport-only operation because connection
   * attempts use it internally when switching endpoints. Adapter teardown must
   * additionally invalidate the request revision; otherwise the cancelled
   * request can interpret the close as a node failure and connect a fallback.
   */
  public async stopConnection(): Promise<void> {
    const activePromise = this.connectPromise;
    ++this.connectionRequestRevision;

    this.clearReconnectTimer();
    this.lastReconnectDelayMs = 0;
    this.reconnectAttempt = 0;
    this.nodeAddressConnecting = '';
    this.unlockConnection();

    let closeError: unknown;

    try {
      // The underlying Connection explicitly rejects a pending open when
      // closed, allowing the captured request to settle without a timeout.
      await this.closeConnection();
    } catch (error) {
      closeError = error;
    }

    await activePromise?.catch(() => undefined);

    // A stale callback may have touched activity state while the transport was
    // closing. Teardown always leaves the adapter observably idle.
    this.clearReconnectTimer();
    this.lastReconnectDelayMs = 0;
    this.reconnectAttempt = 0;
    this.nodeAddressConnecting = '';
    this.unlockConnection();
    this.touchStatus();

    if (closeError !== undefined) {
      throw closeError;
    }
  }

  private startConnection(options: ConnectToNodeOptions, requestRevision: number): Promise<void> {
    const promise = this.connectInternal(options, requestRevision).finally(() => {
      if (this.connectPromise === promise) {
        this.connectPromise = null;
      }
    });

    this.connectPromise = promise;
    return promise;
  }

  /**
   * Connects to a node while allowing an explicit user selection to supersede
   * an in-flight automatic or reconnect attempt.
   */
  public connect(options: ConnectToNodeOptions = {}): Promise<void> {
    const isManualSelection = Boolean(options.manualSelection && options.node?.address);
    const activePromise = this.connectPromise;

    if (!activePromise) {
      const requestRevision = ++this.connectionRequestRevision;
      return this.startConnection(options, requestRevision);
    }

    if (!isManualSelection) {
      return activePromise;
    }

    const requestRevision = ++this.connectionRequestRevision;
    this.nodeAddressConnecting = options.node?.address ?? '';
    this.touchStatus();

    const manualPromise = (async () => {
      try {
        await this.closeConnection();
      } catch (error) {
        console.warn(`[${this.network}] Failed to cancel the previous node connection`, error);
      }

      // The stale request observes the revision change and exits without
      // fallback or state commits after its transport has been cancelled.
      await activePromise.catch(() => undefined);

      if (requestRevision !== this.connectionRequestRevision) return;
      await this.startConnection(options, requestRevision);
    })().finally(() => {
      if (this.connectPromise === manualPromise) {
        this.connectPromise = null;
      }
    });

    this.connectPromise = manualPromise;
    return manualPromise;
  }

  protected async connectInternal(
    options: ConnectToNodeOptions = {},
    requestRevision = this.connectionRequestRevision
  ): Promise<void> {
    if (requestRevision !== this.connectionRequestRevision) return;

    const { node, onError, currentNodeIndex = 0, attempt = 0, manualSelection = false, ...restOptions } = options;

    if (!node && currentNodeIndex === 0) {
      await this.probeAndSelectFastestDefaultNode();
    }

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
      await this.connectNode({ node: requestedNode, onError, ...restOptions }, requestRevision);

      if (requestRevision !== this.connectionRequestRevision) return;

      if (manualSelection && node && this.node?.address === node.address) {
        this.setNodeSelectionMode('manual');
      } else if (!manualSelection && this.shouldUseAutoNodeSelection()) {
        this.setNodeSelectionMode('auto');
      }
    } catch (error) {
      if (requestRevision !== this.connectionRequestRevision) return;

      onError?.(error, requestedNode);

      // if connection failed to node in state, reset node in state
      if (requestedNode.address === this.node?.address) {
        this.setNode(null);
      }

      // Loop through configured defaults immediately; only back off after a full cycle fails.
      const defaultNodesCount = this.defaultNodes.length;
      const isDefaultNodeRequest = requestedNode.address === defaultNode?.address;
      const canTryFallback =
        defaultNodesCount > 0 &&
        (this.node?.address ||
          !isDefaultNodeRequest ||
          currentNodeIndex !== defaultNodesCount - 1 ||
          NodesConnection.enableBackoff);

      if (canTryFallback) {
        const nextIndex = isDefaultNodeRequest ? (currentNodeIndex + 1) % defaultNodesCount : 0;
        const completedDefaultCycle = isDefaultNodeRequest && nextIndex === 0;
        const nextAttempt = completedDefaultCycle ? attempt + 1 : attempt;
        const nextNode = this.nodeList[nextIndex] ?? defaultNode;
        const nextCall = () =>
          this.connect({ onError, currentNodeIndex: nextIndex, attempt: nextAttempt, ...restOptions });

        if (NodesConnection.enableBackoff && completedDefaultCycle) {
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
          this.touchStatus();
          return;
        } else {
          // Avoid connectPromise self-recursion when immediate fallback is needed.
          await this.connectInternal(
            { onError, currentNodeIndex: nextIndex, attempt: nextAttempt, ...restOptions },
            requestRevision
          );
          return;
        }
      }

      throw error;
    }
  }

  protected async connectNode(
    options: ConnectToNodeOptions = {},
    requestRevision = this.connectionRequestRevision
  ): Promise<void> {
    const { node, connectionOptions = {}, onError, onDisconnect, onReconnect, onConnect } = options;

    const endpoint = node?.address ?? '';
    const connectionOpenOptions = {
      once: true, // by default we are trying to connect once, but keep trying after disconnect from connected node
      timeout: NODE_TIMEOUT,
      ...connectionOptions,
    };
    const isReconnection = !connectionOpenOptions.once;
    const connectingNodeChanged = () => endpoint !== this.nodeAddressConnecting;
    const connectionRequestChanged = () => requestRevision !== this.connectionRequestRevision;

    const connectionOnDisconnected = async () => {
      await this.closeConnection();

      if (connectionRequestChanged()) return;

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
      this.touchStatus();

      console.info(`[${this.network}] Connection request to node`, endpoint);

      this.guardConnectionCap();
      await this.closeConnection();

      if (connectionRequestChanged()) return;

      await this.connection.open(endpoint, {
        ...connectionOpenOptions,
        eventListeners: [['ready', connectionOnReady]],
      });

      if (connectionRequestChanged() || connectingNodeChanged()) {
        if (this.connection.endpoint === endpoint) {
          await this.closeConnection();
        }
        this.touchStatus();
        return;
      }

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
      this.touchStatus();
      this.unlockConnection();
    } catch (error) {
      if (connectionRequestChanged()) return;

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
      this.touchStatus();
      throw err;
    }
  }

  /** Returns measured latency in ms for a node address, if available */
  public getNodeLatency(address: string): Nullable<number> {
    const t = this.nodeLatencies[address];
    return Number.isFinite(t) ? t : null;
  }
}
