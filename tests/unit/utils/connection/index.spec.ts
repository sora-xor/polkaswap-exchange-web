import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/consts', () => ({ SubNetworkId: { Mainnet: 'Mainnet' } }));
vi.mock('@/utils/rpc', () => ({
  fetchRpc: vi.fn(),
  getRpcEndpoint: (url: string) => url,
}));

import type { Connection } from '@sora-substrate/connection';
import type { Storage } from '@sora-substrate/sdk';
import type { ConnectToNodeOptions, Node } from '@/types/nodes';
import { NodesConnection } from '@/utils/connection';

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

describe('NodesConnection reconnect behavior', () => {
  let originalBackoff: boolean;
  let originalLatencyProbe: boolean;
  let originalMaxActiveConnections: number;

  beforeEach(() => {
    originalBackoff = NodesConnection.enableBackoff;
    originalLatencyProbe = NodesConnection.enableLatencyProbe;
    originalMaxActiveConnections = NodesConnection.maxActiveConnections;
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    NodesConnection.enableBackoff = originalBackoff;
    NodesConnection.enableLatencyProbe = originalLatencyProbe;
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
      async (_endpoint: string, options?: { eventListeners?: Array<[string, () => void]> }) => {
        const listeners = options?.eventListeners ?? [];
        const readyListener = listeners.find(([event]) => event === 'ready')?.[1];
        readyListener?.();
      }
    );

    const connection = toConnection(connectionMock, {
      endpoint: nodeA.address,
      api: {
        genesisHash: {
          toHex: () => '0x1',
        },
      } as Connection['api'],
    });

    const nodesConnection = new DisconnectReconnectNodesConnection(toStorage(createStorage()), connection);
    nodesConnection.setDefaultNodes([nodeA]);

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => {
      unhandled.push(reason);
    };

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    process.on('unhandledRejection', listener);

    try {
      await nodesConnection.runConnectNode({ node: nodeA });
      await disconnectedHandler?.();
      await Promise.resolve();
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(nodesConnection.reconnectCalls).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    expect(unhandled).toHaveLength(0);
  });

  it('normalizes invalid default nodes payload to empty list', () => {
    const nodesConnection = new RetryNodesConnection(toStorage(createStorage()), toConnection(createConnection()));

    expect(() => nodesConnection.setDefaultNodes(undefined as never)).not.toThrow();
    expect(nodesConnection.defaultNodes).toEqual([]);
  });

  it('throttles default-node latency probes within the TTL window', () => {
    NodesConnection.enableLatencyProbe = true;
    vi.useFakeTimers();

    const nodesConnection = new ProbeTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );

    nodesConnection.setDefaultNodes([nodeA, nodeB]);
    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    expect(nodesConnection.probeCalls).toBe(1);

    vi.advanceTimersByTime(5 * 60_000 + 1);
    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    expect(nodesConnection.probeCalls).toBe(2);
  });

  it('re-probes immediately when default node list changes within TTL window', () => {
    NodesConnection.enableLatencyProbe = true;
    vi.useFakeTimers();

    const nodesConnection = new ProbeTrackingNodesConnection(
      toStorage(createStorage()),
      toConnection(createConnection())
    );

    nodesConnection.setDefaultNodes([nodeA, nodeB]);
    nodesConnection.setDefaultNodes([nodeA]);
    nodesConnection.setDefaultNodes([nodeB, nodeA, { name: 'C', chain: 'chain', address: 'ws://node-c' }]);

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
});
