import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sora-substrate/sdk/build/bridgeProxy/sub/consts', () => ({ SubNetworkId: { Mainnet: 'Mainnet' } }));
vi.mock('@/utils/rpc', () => ({
  fetchRpc: vi.fn(),
  getRpcEndpoint: (url: string) => url,
}));

import type { ConnectToNodeOptions } from '@/types/nodes';
import { NodesConnection } from '@/utils/connection';

type MockedStorage = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

type MockedConnection = {
  close: () => Promise<void>;
  open: () => Promise<void>;
  addEventListener: () => void;
  removeEventListener: () => void;
};

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
  close: vi.fn().mockResolvedValue(),
  open: vi.fn().mockResolvedValue(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

class TestNodesConnection extends NodesConnection {
  public connectNodeCalls = 0;

  protected async connectNode(options: ConnectToNodeOptions = {}): Promise<void> {
    this.connectNodeCalls += 1;

    if (this.connectNodeCalls === 1) {
      throw new Error('connect fail');
    }

    this.unlockConnection();
    this.nodeAddressConnecting = '';
  }
}

describe('NodesConnection backoff scheduling', () => {
  let originalBackoff: boolean;

  beforeEach(() => {
    originalBackoff = NodesConnection.enableBackoff;
    NodesConnection.enableBackoff = true;
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    NodesConnection.enableBackoff = originalBackoff;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('consumes scheduled reconnect promise to avoid unhandled rejections', async () => {
    const storage = createStorage() as unknown as import('@sora-substrate/sdk').Storage;
    const connection = {
      endpoint: '',
      api: undefined,
      ...createConnection(),
    } as unknown as import('@sora-substrate/connection').Connection;
    const nodesConnection = new TestNodesConnection(storage, connection);

    nodesConnection.setDefaultNodes([
      { name: 'A', chain: 'chain', address: 'ws://node-a' },
      { name: 'B', chain: 'chain', address: 'ws://node-b' },
    ]);

    const unhandled: unknown[] = [];
    const listener = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', listener);

    try {
      await expect(nodesConnection.connect()).rejects.toThrow('connect fail');

      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
    } finally {
      process.off('unhandledRejection', listener);
    }

    expect(unhandled).toHaveLength(0);
    expect(nodesConnection.connectNodeCalls).toBe(2);
  });
});
