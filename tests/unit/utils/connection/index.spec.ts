import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, markRaw, reactive } from 'vue';

import productionEnv from '../../../../public/env.json';

vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/consts', () => ({ SubNetworkId: { Mainnet: 'Mainnet' } }));
vi.mock('@/utils/rpc', () => ({
  fetchRpc: vi.fn(),
  getRpcEndpoint: (url: string) => url,
}));

import type { Connection } from '@sora-substrate/connection';
import type { Storage } from '@sora-substrate/sdk';
import type { ConnectToNodeOptions, Node } from '@/types/nodes';
import { NodesConnection } from '@/utils/connection';
import { AppHandledError } from '@/utils/error';
import { fetchRpc } from '@/utils/rpc';

type MockedStorage = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

type MockedConnection = {
  close: ReturnType<typeof vi.fn>;
  open: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

const nodeA: Node = { name: 'A', chain: 'chain', address: 'ws://node-a' };
const nodeB: Node = { name: 'B', chain: 'chain', address: 'ws://node-b' };

const createStorage = (): MockedStorage => {
  const store = new Map<string, string>();

  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
  };
};

const createConnection = (): MockedConnection => ({
  close: vi.fn().mockResolvedValue(undefined),
  open: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

const toStorage = (storage: MockedStorage): Storage => storage as unknown as Storage;

const toConnection = (connection: MockedConnection, overrides: Partial<Connection> = {}): Connection =>
  ({ endpoint: '', api: undefined, ...connection, ...overrides }) as unknown as Connection;

const flushLatencyProbe = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

class RetryNodesConnection extends NodesConnection {
  public connectNodeCalls = 0;

  protected async connectNode(_options: ConnectToNodeOptions = {}): Promise<void> {
    this.connectNodeCalls += 1;

    if (this.connectNodeCalls === 1) {
      throw new Error('connect fail');
    }

    this.nodeAddressConnecting = '';
    this.unlockConnection();
  }
}

class InspectableNodesConnection extends NodesConnection {
  public get persistedNodeLatencies(): Record<string, number> {
    return this.nodeLatencies;
  }
}

class AlwaysFailNodesConnection extends NodesConnection {
  public connectNodeCalls = 0;

  protected async connectNode(_options: ConnectToNodeOptions = {}): Promise<void> {
    this.connectNodeCalls += 1;
    throw new Error('connect fail');
  }
}

class DedupNodesConnection extends NodesConnection {
  public connectNodeCalls = 0;

  protected async connectNode(_options: ConnectToNodeOptions = {}): Promise<void> {
    this.connectNodeCalls += 1;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    this.nodeAddressConnecting = '';
    this.unlockConnection();
  }
}

class SuccessfulNodesConnection extends NodesConnection {
  public connectedNodes: Node[] = [];

  protected async connectNode(options: ConnectToNodeOptions = {}): Promise<void> {
    if (!options.node) {
      throw new Error('node missing');
    }

    this.connectedNodes.push(options.node);
    this.setNode(options.node);
    this.nodeAddressConnecting = '';
    this.unlockConnection();
  }
}

class DisconnectReconnectNodesConnection extends NodesConnection {
  public reconnectCalls = 0;

  public async connect(_options: ConnectToNodeOptions = {}): Promise<void> {
    this.reconnectCalls += 1;
    throw new Error('reconnect fail');
  }

  public async runConnectNode(options: ConnectToNodeOptions): Promise<void> {
    await this.connectNode(options);
  }
}

class ProbeTrackingNodesConnection extends NodesConnection {
  public probeCalls = 0;

  protected async probeAndSortDefaultNodesByLatency(): Promise<void> {
    this.probeCalls += 1;
    this.lastLatencyProbeTs = Date.now();
    this.lastLatencyProbeNodeListKey = this.buildProbeNodeListKey();
  }
}

class CapTrackingNodesConnection extends NodesConnection {
  public markActive(): void {
    this.registerActiveConnection();
  }

  public assertCapAllowed(): void {
    this.guardConnectionCap();
  }
}

class StatusTrackingNodesConnection extends NodesConnection {
  public get connectionLockedForTest(): boolean {
    return this.connectionLocked;
  }

  public get reconnectScheduledForTest(): boolean {
    return this.reconnectTimer !== null;
  }

  public lockForTest(): void {
    this.lockConnection();
  }

  public unlockForTest(): void {
    this.unlockConnection();
  }

  public setConnectingNodeForTest(address: string): void {
    this.nodeAddressConnecting = address;
    this.touchStatus();
  }
}

class LifecycleFailNodesConnection extends NodesConnection {
  public connectNodeCalls = 0;

  public get connectionLockedForTest(): boolean {
    return this.connectionLocked;
  }

  public get reconnectScheduledForTest(): boolean {
    return this.reconnectTimer !== null;
  }

  protected async connectNode(_options: ConnectToNodeOptions = {}): Promise<void> {
    this.connectNodeCalls += 1;
    throw new Error('connect fail');
  }
}

describe('NodesConnection reconnect behavior', () => {
  let originalBackoff: boolean;
  let originalLatencyProbe: boolean;
  let originalParallelDial: boolean;
  let originalMaxActiveConnections: number;

  beforeEach(() => {
    originalBackoff = NodesConnection.enableBackoff;
    originalLatencyProbe = NodesConnection.enableLatencyProbe;
    originalParallelDial = NodesConnection.enableParallelDial;
    originalMaxActiveConnections = NodesConnection.maxActiveConnections;
    vi.mocked(fetchRpc).mockResolvedValue('0x1');
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    NodesConnection.enableBackoff = originalBackoff;
    NodesConnection.enableLatencyProbe = originalLatencyProbe;
    NodesConnection.enableParallelDial = originalParallelDial;
    NodesConnection.maxActiveConnections = originalMaxActiveConnections;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('tries the next default node immediately before applying backoff', async () => {
    NodesConnection.enableBackoff = true;

    const nodesConnection = new RetryNodesConnection(toStorage(createStorage()), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await expect(nodesConnection.connect()).resolves.toBeUndefined();

    expect(nodesConnection.connectNodeCalls).toBe(2);
    expect(nodesConnection.lastReconnectDelayMs).toBe(0);
  });

  it('schedules reconnect with backoff after a full default-node cycle fails', async () => {
    NodesConnection.enableBackoff = true;
    vi.useFakeTimers();

    const nodesConnection = new AlwaysFailNodesConnection(toStorage(createStorage()), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', listener);

    try {
      await expect(nodesConnection.connect()).resolves.toBeUndefined();

      expect(nodesConnection.connectNodeCalls).toBe(2);
      expect(nodesConnection.lastReconnectDelayMs).toBe(3_400);

      await vi.advanceTimersByTimeAsync(3_400);
      await Promise.resolve();
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(unhandled).toHaveLength(0);
    expect(nodesConnection.connectNodeCalls).toBe(4);
  });

  it('deduplicates concurrent connect calls', async () => {
    NodesConnection.enableBackoff = false;

    const nodesConnection = new DedupNodesConnection(toStorage(createStorage()), toConnection(createConnection()));
    nodesConnection.setDefaultNodes([nodeA]);

    await Promise.all([nodesConnection.connect(), nodesConnection.connect()]);

    expect(nodesConnection.connectNodeCalls).toBe(1);
  });

  it('lets a manual node selection supersede an unresolved automatic connection', async () => {
    NodesConnection.enableLatencyProbe = false;
    vi.useFakeTimers();

    let resolveAutomaticConnection!: () => void;
    const automaticConnection = new Promise<void>((resolve) => {
      resolveAutomaticConnection = resolve;
    });
    const connectionMock = createConnection();
    const connection = toConnection(connectionMock);
    const automaticOnConnect = vi.fn();
    const manualOnConnect = vi.fn();

    connectionMock.open.mockImplementation(async (endpoint: string) => {
      Object.assign(connection, {
        endpoint,
        api: {
          genesisHash: {
            toHex: () => '0x1',
          },
        } as Connection['api'],
      });

      if (endpoint === nodeA.address) {
        await automaticConnection;
      }
    });
    connectionMock.close.mockImplementation(async () => {
      Object.assign(connection, { endpoint: '', api: undefined });
      resolveAutomaticConnection();
    });

    const storage = createStorage();
    const nodesConnection = markRaw(new NodesConnection(toStorage(storage), connection));
    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    const automaticPromise = nodesConnection.connect({ node: nodeA, onConnect: automaticOnConnect });
    await Promise.resolve();
    await Promise.resolve();

    expect(connectionMock.open).toHaveBeenCalledWith(nodeA.address, expect.any(Object));

    const manualPromise = nodesConnection.connect({
      node: nodeB,
      manualSelection: true,
      onConnect: manualOnConnect,
    });

    expect(nodesConnection.status.nodeAddressConnecting).toBe(nodeB.address);

    await expect(Promise.all([automaticPromise, manualPromise])).resolves.toEqual([undefined, undefined]);

    expect(connectionMock.open.mock.calls.map(([endpoint]) => endpoint)).toEqual([nodeA.address, nodeB.address]);
    expect(connectionMock.close).toHaveBeenCalledTimes(1);
    expect(automaticOnConnect).not.toHaveBeenCalled();
    expect(manualOnConnect).toHaveBeenCalledWith(nodeB);
    expect(nodesConnection.status.node).toEqual(nodeB);
    expect(nodesConnection.status.connected).toBe(true);
    expect(storage.get('nodeSelectionMode')).toBe('manual');

    await nodesConnection.closeConnection();
  });

  it('stops a pending connection without falling back to a detached node', async () => {
    NodesConnection.enableBackoff = false;
    NodesConnection.enableLatencyProbe = false;

    let rejectPendingOpen!: (reason: Error) => void;
    let notifyOpenStarted!: () => void;
    const openStarted = new Promise<void>((resolve) => {
      notifyOpenStarted = resolve;
    });
    const connectionMock = createConnection();
    const connection = toConnection(connectionMock);

    connectionMock.open.mockImplementation((endpoint: string) => {
      Object.assign(connection, {
        endpoint,
        api: {
          genesisHash: {
            toHex: () => '0x1',
          },
        } as Connection['api'],
      });

      const pendingOpen = new Promise<void>((_resolve, reject) => {
        rejectPendingOpen = reject;
      });
      notifyOpenStarted();

      return pendingOpen;
    });
    connectionMock.close.mockImplementation(async () => {
      Object.assign(connection, { endpoint: '', api: undefined });
      rejectPendingOpen(new Error('connection cancelled'));
    });

    const nodesConnection = markRaw(new StatusTrackingNodesConnection(toStorage(createStorage()), connection));
    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    const connectPromise = nodesConnection.connect();
    await openStarted;

    expect(nodesConnection.status.nodeAddressConnecting).toBe(nodeA.address);
    expect(nodesConnection.connectionLockedForTest).toBe(true);

    await expect(nodesConnection.stopConnection()).resolves.toBeUndefined();
    await expect(connectPromise).resolves.toBeUndefined();

    expect(connectionMock.open.mock.calls.map(([endpoint]) => endpoint)).toEqual([nodeA.address]);
    expect(connectionMock.close).toHaveBeenCalledTimes(1);
    expect(nodesConnection.status.nodeAddressConnecting).toBe('');
    expect(nodesConnection.status.connected).toBe(false);
    expect(nodesConnection.status.connectionAllowance).toBe(true);
    expect(nodesConnection.connectionLockedForTest).toBe(false);
    expect(nodesConnection.reconnectScheduledForTest).toBe(false);
  });

  it('cancels a scheduled reconnect and resets its lifecycle state', async () => {
    NodesConnection.enableBackoff = true;
    NodesConnection.enableLatencyProbe = false;
    vi.useFakeTimers();

    const nodesConnection = new LifecycleFailNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );
    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await expect(nodesConnection.connect()).resolves.toBeUndefined();

    expect(nodesConnection.connectNodeCalls).toBe(2);
    expect(nodesConnection.reconnectScheduledForTest).toBe(true);
    expect(nodesConnection.lastReconnectDelayMs).toBe(3_400);
    expect(nodesConnection.reconnectAttempt).toBe(1);

    await expect(nodesConnection.stopConnection()).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(3_400);

    expect(nodesConnection.connectNodeCalls).toBe(2);
    expect(nodesConnection.reconnectScheduledForTest).toBe(false);
    expect(nodesConnection.lastReconnectDelayMs).toBe(0);
    expect(nodesConnection.reconnectAttempt).toBe(0);
    expect(nodesConnection.connectionLockedForTest).toBe(false);
  });

  it('resolves after fallback node connects when backoff is disabled', async () => {
    NodesConnection.enableBackoff = false;

    const nodesConnection = new RetryNodesConnection(toStorage(createStorage()), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await expect(nodesConnection.connect()).resolves.toBeUndefined();
    expect(nodesConnection.connectNodeCalls).toBe(2);
  });

  it('consumes disconnect reconnect rejection to avoid unhandled promise rejections', async () => {
    NodesConnection.enableBackoff = false;

    let disconnectedHandler: (() => Promise<void>) | null = null;

    const connectionMock = createConnection();
    connectionMock.addEventListener.mockImplementation((event: string, callback: () => Promise<void>) => {
      if (event === 'disconnected') {
        disconnectedHandler = callback;
      }
    });
    connectionMock.open.mockImplementation(
      async (endpoint: string, options?: { eventListeners?: Array<[string, () => void]> }) => {
        Object.assign(connection, {
          endpoint,
          api: {
            genesisHash: {
              toHex: () => '0x1',
            },
          } as Connection['api'],
        });
        const listeners = options?.eventListeners ?? [];
        const readyListener = listeners.find(([event]) => event === 'ready')?.[1];
        readyListener?.();
      }
    );

    const connection = toConnection(connectionMock);
    connectionMock.close.mockImplementation(async () => {
      Object.assign(connection, { api: undefined });
    });

    const nodesConnection = markRaw(new DisconnectReconnectNodesConnection(toStorage(createStorage()), connection));
    nodesConnection.setDefaultNodes([nodeA]);
    const status = computed(() => nodesConnection.status);

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => {
      unhandled.push(reason);
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    process.on('unhandledRejection', listener);

    try {
      await nodesConnection.runConnectNode({ node: nodeA });
      expect(status.value.connected).toBe(true);
      await disconnectedHandler?.();
      await Promise.resolve();
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(nodesConnection.reconnectCalls).toBe(1);
    expect(status.value.connected).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    expect(unhandled).toHaveLength(0);
  });

  it('normalizes invalid default nodes payload to empty list', () => {
    const nodesConnection = new RetryNodesConnection(toStorage(createStorage()), toConnection(createConnection()));

    expect(() => nodesConnection.setDefaultNodes(undefined as never)).not.toThrow();
    expect(nodesConnection.defaultNodes).toEqual([]);
  });

  it('falls back safely when persisted node JSON is malformed or has the wrong shape', () => {
    const storage = createStorage();
    storage.set('node', '{');
    storage.set('customNodes', '{}');
    storage.set('nodeLatencies', '[1]');

    const nodesConnection = new InspectableNodesConnection(toStorage(storage), toConnection(createConnection()));

    expect(nodesConnection.status.node).toBeNull();
    expect(nodesConnection.status.customNodes).toEqual([]);
    expect(nodesConnection.persistedNodeLatencies).toEqual({});
  });

  it('throttles default-node latency probes within the TTL window', async () => {
    NodesConnection.enableLatencyProbe = true;
    vi.useFakeTimers();

    const nodesConnection = new ProbeTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );

    nodesConnection.setDefaultNodes([nodeA, nodeB]);
    nodesConnection.setDefaultNodes([nodeA, nodeB]);
    await flushLatencyProbe();

    expect(nodesConnection.probeCalls).toBe(1);

    vi.advanceTimersByTime(5 * 60_000 + 1);
    nodesConnection.setDefaultNodes([nodeA, nodeB]);
    await flushLatencyProbe();

    expect(nodesConnection.probeCalls).toBe(2);
  });

  it('re-probes immediately when default node list changes within TTL window', async () => {
    NodesConnection.enableLatencyProbe = true;
    vi.useFakeTimers();

    const nodesConnection = new ProbeTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );

    nodesConnection.setDefaultNodes([nodeA, nodeB]);
    nodesConnection.setDefaultNodes([nodeA]);
    nodesConnection.setDefaultNodes([nodeB, nodeA, { name: 'C', chain: 'chain', address: 'ws://node-c' }]);
    await flushLatencyProbe();

    expect(nodesConnection.probeCalls).toBe(2);
  });

  it('skips latency probe when fewer than two default nodes are configured', () => {
    NodesConnection.enableLatencyProbe = true;

    const nodesConnection = new ProbeTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );
    nodesConnection.setDefaultNodes([nodeA]);

    expect(nodesConnection.probeCalls).toBe(0);
  });

  it('selects and persists the fastest default node before the initial automatic connection', async () => {
    NodesConnection.enableLatencyProbe = true;

    vi.mocked(fetchRpc).mockImplementation(async (url: string) => {
      if (url.includes('node-a')) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      return '0x1';
    });

    const storage = createStorage();
    const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await nodesConnection.connect();

    expect(nodesConnection.connectedNodes[0]).toEqual(nodeB);
    expect(JSON.parse(storage.get('node') as string)).toEqual(nodeB);
    expect(storage.get('nodeSelectionMode')).toBe('auto');
  });

  it('treats legacy persisted default nodes as automatic selections and refreshes them by latency', async () => {
    NodesConnection.enableLatencyProbe = true;

    vi.mocked(fetchRpc).mockImplementation(async (url: string) => {
      if (url.includes('node-a')) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      return '0x1';
    });

    const storage = createStorage();
    storage.set('node', JSON.stringify(nodeA));
    const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await nodesConnection.connect();

    expect(nodesConnection.connectedNodes[0]).toEqual(nodeB);
    expect(JSON.parse(storage.get('node') as string)).toEqual(nodeB);
    expect(storage.get('nodeSelectionMode')).toBe('auto');
  });

  it('preserves a manually selected node when latency probing finds a faster default', async () => {
    NodesConnection.enableLatencyProbe = true;

    vi.mocked(fetchRpc).mockImplementation(async (url: string) => {
      if (url.includes('node-a')) {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      return '0x1';
    });

    const storage = createStorage();
    storage.set('node', JSON.stringify(nodeA));
    storage.set('nodeSelectionMode', 'manual');
    const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await nodesConnection.connect();

    expect(nodesConnection.connectedNodes[0]).toEqual(nodeA);
    expect(JSON.parse(storage.get('node') as string)).toEqual(nodeA);
    expect(storage.get('nodeSelectionMode')).toBe('manual');
  });

  it('persists explicit user node selections as manual choices', async () => {
    NodesConnection.enableLatencyProbe = false;

    const storage = createStorage();
    const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    await nodesConnection.connect({ node: nodeB, manualSelection: true });

    expect(nodesConnection.connectedNodes[0]).toEqual(nodeB);
    expect(JSON.parse(storage.get('node') as string)).toEqual(nodeB);
    expect(storage.get('nodeSelectionMode')).toBe('manual');
  });

  it('clears a persisted default node after it is removed from the runtime default list', () => {
    const storage = createStorage();
    storage.set('node', JSON.stringify(nodeB));

    const nodesConnection = new RetryNodesConnection(toStorage(storage), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA]);

    expect(nodesConnection.node).toBeNull();
    expect(storage.get('node')).toBeNull();
  });

  it('preserves a persisted custom node when runtime defaults change', () => {
    const storage = createStorage();
    storage.set('node', JSON.stringify(nodeB));
    storage.set('customNodes', JSON.stringify([nodeB]));

    const nodesConnection = new RetryNodesConnection(toStorage(storage), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA]);

    expect(nodesConnection.node).toEqual(nodeB);
    expect(storage.get('node')).toBe(JSON.stringify(nodeB));
  });

  it('unregisters active connection tracking even when close() throws', async () => {
    NodesConnection.maxActiveConnections = 1;

    const failingConnection = createConnection();
    failingConnection.close.mockRejectedValueOnce(new Error('close fail'));

    const first = new CapTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(failingConnection, {
        api: {} as Connection['api'],
      })
    );
    first.markActive();

    await expect(first.closeConnection()).rejects.toThrow('close fail');

    const second = new CapTrackingNodesConnection(toStorage(createStorage()), toConnection(createConnection()));
    expect(() => second.assertCapAllowed()).not.toThrow();
  });

  it('treats persisted nodes without a live api as disconnected', () => {
    const storage = createStorage();
    storage.set('node', JSON.stringify(nodeA));

    const nodesConnection = new RetryNodesConnection(toStorage(storage), toConnection(createConnection()));

    expect(nodesConnection.nodeIsConnected).toBe(false);
  });

  it('reports connected only when api and active endpoint match the selected node', () => {
    const storage = createStorage();
    storage.set('node', JSON.stringify(nodeA));

    const nodesConnection = new RetryNodesConnection(
      toStorage(storage),
      toConnection(createConnection(), {
        endpoint: nodeA.address,
        api: {} as Connection['api'],
      })
    );

    expect(nodesConnection.nodeIsConnected).toBe(true);

    nodesConnection.nodeAddressConnecting = nodeA.address;
    expect(nodesConnection.nodeIsConnected).toBe(false);
  });

  it('reactively exposes immutable node and connection status while the runtime stays raw', async () => {
    NodesConnection.enableLatencyProbe = false;

    const connectionMock = createConnection();
    const connection = toConnection(connectionMock);
    connectionMock.close.mockImplementation(async () => {
      Object.assign(connection, { api: undefined });
    });
    connectionMock.open.mockImplementation(async (endpoint: string) => {
      Object.assign(connection, {
        endpoint,
        api: {
          genesisHash: {
            toHex: () => '0x1',
          },
        } as Connection['api'],
      });
    });
    const nodesConnection = markRaw(new StatusTrackingNodesConnection(toStorage(createStorage()), connection));
    const status = computed(() => nodesConnection.status);
    const initialStatus = status.value;

    expect(initialStatus).toEqual({
      node: null,
      nodeList: [],
      customNodes: [],
      defaultNodes: [],
      nodeAddressConnecting: '',
      connectionAllowance: true,
      connected: false,
    });
    expect(Object.isFrozen(initialStatus)).toBe(true);
    expect(Object.isFrozen(initialStatus.nodeList)).toBe(true);

    nodesConnection.setDefaultNodes([nodeA]);
    nodesConnection.setCustomNodes([nodeB]);

    expect(status.value).not.toBe(initialStatus);
    expect(status.value.defaultNodes).toEqual([nodeA]);
    expect(status.value.customNodes).toEqual([nodeB]);
    expect(status.value.nodeList).toEqual([nodeA, nodeB]);

    const connectPromise = nodesConnection.connect({ node: nodeA, manualSelection: true });

    expect(status.value.nodeAddressConnecting).toBe(nodeA.address);
    expect(status.value.connectionAllowance).toBe(false);
    expect(status.value.connected).toBe(false);

    await expect(connectPromise).resolves.toBeUndefined();

    expect(status.value.node).toEqual(nodeA);
    expect(status.value.nodeAddressConnecting).toBe('');
    expect(status.value.connectionAllowance).toBe(true);
    expect(status.value.connected).toBe(true);

    const switchPromise = nodesConnection.connect({ node: nodeB, manualSelection: true });

    expect(status.value.nodeAddressConnecting).toBe(nodeB.address);
    expect(status.value.connected).toBe(false);

    await expect(switchPromise).resolves.toBeUndefined();

    expect(status.value.node).toEqual(nodeB);
    expect(status.value.nodeAddressConnecting).toBe('');
    expect(status.value.connected).toBe(true);
  });

  it('keeps the revision ref usable when Vue proxies a NodesConnection instance', () => {
    NodesConnection.enableLatencyProbe = false;

    const rawConnection = new StatusTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );
    const nodesConnection = reactive(rawConnection);
    const status = computed(() => nodesConnection.status);
    const initialStatus = status.value;

    expect(() => nodesConnection.setDefaultNodes([nodeA])).not.toThrow();
    expect(status.value).not.toBe(initialStatus);
    expect(status.value.defaultNodes).toEqual([nodeA]);

    nodesConnection.setConnectingNodeForTest(nodeA.address);

    expect(status.value.nodeAddressConnecting).toBe(nodeA.address);
  });

  it('reactively reports lock, unlock, close, and failed connection transitions', async () => {
    NodesConnection.enableLatencyProbe = false;

    const connectionMock = createConnection();
    const mutableConnection = toConnection(connectionMock, {
      endpoint: nodeA.address,
      api: {
        genesisHash: {
          toHex: () => '0x1',
        },
      } as Connection['api'],
    });
    connectionMock.close.mockImplementation(async () => {
      Object.assign(mutableConnection, { api: undefined });
    });

    const nodesConnection = markRaw(new StatusTrackingNodesConnection(toStorage(createStorage()), mutableConnection));
    nodesConnection.setConnectingNodeForTest(nodeA.address);
    const status = computed(() => nodesConnection.status);

    nodesConnection.lockForTest();
    expect(status.value.connectionAllowance).toBe(false);

    nodesConnection.unlockForTest();
    expect(status.value.connectionAllowance).toBe(true);

    await nodesConnection.closeConnection();
    expect(status.value.connected).toBe(false);

    const failingConnectionMock = createConnection();
    failingConnectionMock.open.mockRejectedValueOnce(new Error('offline'));
    const failingConnection = markRaw(
      new StatusTrackingNodesConnection(toStorage(createStorage()), toConnection(failingConnectionMock))
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failingStatus = computed(() => failingConnection.status);
    const connectPromise = failingConnection.connect({ node: nodeB, manualSelection: true });

    expect(failingStatus.value.nodeAddressConnecting).toBe(nodeB.address);
    await expect(connectPromise).rejects.toBeInstanceOf(AppHandledError);
    expect(failingStatus.value.nodeAddressConnecting).toBe('');
    expect(failingStatus.value.connectionAllowance).toBe(true);
    expect(failingStatus.value.connected).toBe(false);
    failingConnection.unlockForTest();
  });

  it('uses only the production live default even when cached latency favors the former archive default', async () => {
    NodesConnection.enableLatencyProbe = true;
    NodesConnection.enableParallelDial = true;
    vi.mocked(fetchRpc).mockClear();

    const storage = createStorage();
    storage.set(
      'nodeLatencies',
      JSON.stringify({
        'wss://ws.mof.sora.org': 100,
        'wss://mof2.sora.org': 1,
      })
    );
    const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));
    nodesConnection.setDefaultNodes(productionEnv.DEFAULT_NETWORKS);

    await nodesConnection.connect();

    expect(nodesConnection.status.defaultNodes).toEqual(productionEnv.DEFAULT_NETWORKS);
    expect(nodesConnection.connectedNodes).toEqual(productionEnv.DEFAULT_NETWORKS);
    expect(JSON.parse(storage.get('node') as string).address).toBe('wss://ws.mof.sora.org');
    expect(vi.mocked(fetchRpc)).not.toHaveBeenCalled();
  });

  it.each(['auto', undefined] as const)(
    'clears a removed production default with persisted selection mode %s before reconnecting',
    async (mode) => {
      NodesConnection.enableLatencyProbe = true;
      vi.mocked(fetchRpc).mockClear();
      const storage = createStorage();
      storage.set(
        'node',
        JSON.stringify({
          chain: 'SORA',
          name: 'SORA Parliament Ministry of Finance #2',
          address: 'wss://mof2.sora.org',
          location: 'SG',
        })
      );
      if (mode) storage.set('nodeSelectionMode', mode);
      storage.set('nodeLatencies', JSON.stringify({ 'wss://mof2.sora.org': 1 }));
      const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));
      expect(nodesConnection.status.node?.address).toBe('wss://mof2.sora.org');

      nodesConnection.setDefaultNodes(productionEnv.DEFAULT_NETWORKS);

      expect(nodesConnection.status.node).toBeNull();
      expect(storage.get('node')).toBeNull();
      expect(storage.get('nodeSelectionMode')).toBe('auto');
      await nodesConnection.connect();
      expect(nodesConnection.connectedNodes).toEqual(productionEnv.DEFAULT_NETWORKS);
      expect(JSON.parse(storage.get('node') as string).address).toBe('wss://ws.mof.sora.org');
      expect(vi.mocked(fetchRpc)).not.toHaveBeenCalled();
    }
  );

  it('keeps a failed production primary connection fatal without opening an archive fallback', async () => {
    NodesConnection.enableBackoff = false;
    NodesConnection.enableLatencyProbe = true;
    NodesConnection.enableParallelDial = true;
    vi.mocked(fetchRpc).mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const connectionMock = createConnection();
    connectionMock.open.mockRejectedValue(new Error('primary unavailable'));
    const nodesConnection = new NodesConnection(toStorage(createStorage()), toConnection(connectionMock));
    nodesConnection.setDefaultNodes(productionEnv.DEFAULT_NETWORKS);

    try {
      await expect(nodesConnection.connect()).rejects.toBeInstanceOf(AppHandledError);
      expect(connectionMock.open).toHaveBeenCalledTimes(1);
      expect(connectionMock.open).toHaveBeenCalledWith('wss://ws.mof.sora.org', expect.any(Object));
      expect(nodesConnection.status.node).toBeNull();
      expect(vi.mocked(fetchRpc)).not.toHaveBeenCalled();
    } finally {
      await nodesConnection.stopConnection();
    }
  });

  it.each(['wss://mof2.sora.org', 'wss://custom.example'])(
    'preserves an explicit user custom node %s when production defaults change',
    async (address) => {
      NodesConnection.enableLatencyProbe = true;
      vi.mocked(fetchRpc).mockClear();
      const customNode: Node = { chain: 'SORA', name: 'Explicit user custom node', address };
      const storage = createStorage();
      storage.set('node', JSON.stringify(customNode));
      storage.set('customNodes', JSON.stringify([customNode]));
      storage.set('nodeSelectionMode', 'manual');
      const nodesConnection = new SuccessfulNodesConnection(toStorage(storage), toConnection(createConnection()));

      nodesConnection.setDefaultNodes(productionEnv.DEFAULT_NETWORKS);

      expect(nodesConnection.status.node).toEqual(customNode);
      expect(nodesConnection.status.customNodes).toEqual([customNode]);
      expect(nodesConnection.status.defaultNodes).toEqual(productionEnv.DEFAULT_NETWORKS);
      expect(storage.get('nodeSelectionMode')).toBe('manual');
      await nodesConnection.connect();
      expect(nodesConnection.connectedNodes).toEqual([customNode]);
      expect(JSON.parse(storage.get('node') as string)).toEqual(customNode);
      expect(vi.mocked(fetchRpc)).not.toHaveBeenCalled();
    }
  );
});
