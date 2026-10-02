import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression tests for the Polkaswap patch to `@polkadot/rpc-provider` (`.yarn/patches/@polkadot-rpc-provider-*`).
 * Unpatched, WsProvider keeps every notification that arrives after an unsubscribe in `#waitingForId` for the life
 * of the connection, which grows without bound in tabs that quote (subscribe → first value → unsubscribe) for days.
 */
interface FakeSocket {
  sent: { id: number; method: string; params: unknown[] }[];
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
}

const sockets = vi.hoisted(() => {
  const created: FakeSocket[] = [];
  /** In-memory socket; the provider drives it only through its `on*` handlers. */
  class FakeWebSocket {
    sent: FakeSocket['sent'] = [];
    onopen: FakeSocket['onopen'] = null;
    onmessage: FakeSocket['onmessage'] = null;
    onclose: FakeSocket['onclose'] = null;
    onerror: ((event: unknown) => void) | null = null;
    constructor() {
      created.push(this);
    }

    send(data: string) {
      this.sent.push(JSON.parse(data));
    }

    close(code = 1000) {
      this.onclose?.({ code, reason: '' });
    }
  }
  (globalThis as { WebSocket?: unknown }).WebSocket = FakeWebSocket;
  return created;
});

const { WsProvider } = await import('@polkadot/rpc-provider');

type Provider = InstanceType<typeof WsProvider>;

const providers: Provider[] = [];

async function connect(): Promise<{ provider: Provider; socket: FakeSocket }> {
  const provider = new WsProvider('ws://127.0.0.1:9944', false);
  providers.push(provider);
  await provider.connect();
  const socket = sockets.at(-1)!;
  socket.onopen!();
  return { provider, socket };
}

function reply(socket: FakeSocket, result: unknown): void {
  socket.onmessage!({ data: JSON.stringify({ jsonrpc: '2.0', id: socket.sent.at(-1)!.id, result }) });
}

function notify(socket: FakeSocket, subscription: string, result: unknown): void {
  socket.onmessage!({
    data: JSON.stringify({ jsonrpc: '2.0', method: 'state_storage', params: { subscription, result } }),
  });
}

function subscribe(provider: Provider, socket: FakeSocket, id: string, callback: (...args: unknown[]) => void) {
  const pending = provider.subscribe('state_storage', 'state_subscribeStorage', [['0x01']], callback);
  reply(socket, id);
  return pending;
}

async function unsubscribe(provider: Provider, socket: FakeSocket, id: string): Promise<void> {
  const closing = provider.unsubscribe('state_storage', 'state_unsubscribeStorage', id);
  reply(socket, true);
  await closing;
}

const change = (block: number) => ({ block: `0x${block.toString(16)}`, changes: [] });

afterEach(async () => {
  await Promise.all(providers.splice(0).map((provider) => provider.disconnect()));
  vi.useRealTimers();
});

describe('patched WsProvider subscription bookkeeping', () => {
  it('uses the in-memory socket', async () => {
    const before = sockets.length;
    await connect();
    expect(sockets.length).toBe(before + 1);
  });

  it('drops notifications that arrive after this client closed the subscription', async () => {
    const { provider, socket } = await connect();
    const first = vi.fn();
    await subscribe(provider, socket, 'sub-a', first);
    notify(socket, 'sub-a', change(1));
    expect(first).toHaveBeenCalledOnce();
    await unsubscribe(provider, socket, 'sub-a');
    // The node sent this before it processed the unsubscribe.
    notify(socket, 'sub-a', change(2));
    // A buffered notification would be replayed as soon as a handler for the same id registers.
    const probe = vi.fn();
    await subscribe(provider, socket, 'sub-a', probe);
    expect(probe).not.toHaveBeenCalled();
    expect(first).toHaveBeenCalledOnce();
  });

  it('still delivers a notification that arrives before its subscription id', async () => {
    const { provider, socket } = await connect();
    const callback = vi.fn();
    const pending = provider.subscribe('state_storage', 'state_subscribeStorage', [['0x01']], callback);
    notify(socket, 'sub-b', change(1));
    reply(socket, 'sub-b');
    await pending;
    expect(callback).toHaveBeenCalledWith(null, change(1));
  });

  it('keeps at most 256 notifications for subscriptions it does not know', async () => {
    const { provider, socket } = await connect();
    for (let index = 0; index < 300; index++) notify(socket, `unknown-${index}`, change(index));
    const oldest = vi.fn();
    const newest = vi.fn();
    await subscribe(provider, socket, 'unknown-0', oldest);
    await subscribe(provider, socket, 'unknown-299', newest);
    expect(oldest).not.toHaveBeenCalled();
    expect(newest).toHaveBeenCalledExactlyOnceWith(null, change(299));
  });

  it('forgets closed subscriptions after five minutes so that record stays bounded too', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { provider, socket } = await connect();
    await subscribe(provider, socket, 'sub-old', vi.fn());
    await unsubscribe(provider, socket, 'sub-old');
    vi.setSystemTime(Date.now() + 5 * 60_000 + 1);
    // The next close prunes expired records.
    await subscribe(provider, socket, 'sub-new', vi.fn());
    await unsubscribe(provider, socket, 'sub-new');
    notify(socket, 'sub-old', change(3));
    notify(socket, 'sub-new', change(4));
    const oldProbe = vi.fn();
    const newProbe = vi.fn();
    await subscribe(provider, socket, 'sub-old', oldProbe);
    await subscribe(provider, socket, 'sub-new', newProbe);
    // Past its record, a stray notification is treated as unknown (and capped); a recent close still drops it.
    expect(oldProbe).toHaveBeenCalledExactlyOnceWith(null, change(3));
    expect(newProbe).not.toHaveBeenCalled();
  });
});
