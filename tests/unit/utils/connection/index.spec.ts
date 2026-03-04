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

describe('NodesConnection reconnect behavior', () => {
  let originalBackoff: boolean;

  beforeEach(() => {
    originalBackoff = NodesConnection.enableBackoff;
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    NodesConnection.enableBackoff = originalBackoff;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('schedules reconnect with backoff without rejecting the caller promise', async () => {
    NodesConnection.enableBackoff = true;
    vi.useFakeTimers();

    const nodesConnection = new RetryNodesConnection(toStorage(createStorage()), toConnection(createConnection()));

    nodesConnection.setDefaultNodes([nodeA, nodeB]);

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', listener);

    try {
      await expect(nodesConnection.connect()).resolves.toBeUndefined();

      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(unhandled).toHaveLength(0);
    expect(nodesConnection.connectNodeCalls).toBe(2);
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
});
