import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireRunLock, readRunsElsewhere } from '@/features/bot-trading/run-lock';

/** In-memory Web Locks: one exclusive holder per name, shared by every "tab" in the test. */
function fakeLocks() {
  const held = new Set<string>();
  return {
    held,
    request: vi.fn(async (name: string, _options: unknown, callback: (lock: unknown) => Promise<void> | void) => {
      if (held.has(name)) return callback(null);
      held.add(name);
      try {
        return await callback({ name });
      } finally {
        held.delete(name);
      }
    }),
    query: vi.fn(async () => ({ held: [...held].map((name) => ({ name, mode: 'exclusive' })), pending: [] })),
  };
}

function useLocks(locks: unknown) {
  Object.defineProperty(navigator, 'locks', { configurable: true, value: locks });
}

afterEach(() => {
  Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
});

describe('cross-tab bot run lock', () => {
  it('lets one holder run a bot until it releases the lock', async () => {
    const locks = fakeLocks();
    useLocks(locks);
    const release = await acquireRunLock('bot-1');
    expect(release).toBeTypeOf('function');
    expect(locks.held.has('polkaswap-bot-run:bot-1')).toBe(true);
    // Another start of the same bot cannot take it.
    expect(await acquireRunLock('bot-1')).toBeNull();
    release!();
    await vi.waitFor(() => expect(locks.held.size).toBe(0));
    const again = await acquireRunLock('bot-1');
    expect(again).toBeTypeOf('function');
    again!();
  });

  it('reports bots that another tab runs, but not the ones this tab holds', async () => {
    const locks = fakeLocks();
    useLocks(locks);
    const mine = await acquireRunLock('mine');
    locks.held.add('polkaswap-bot-run:theirs');
    locks.held.add('polkaswap-bot:network:account');
    expect([...(await readRunsElsewhere())]).toEqual(['theirs']);
    mine!();
  });

  it('runs without coordination where Web Locks are missing or refused', async () => {
    useLocks(undefined);
    const release = await acquireRunLock('bot-1');
    expect(release).toBeTypeOf('function');
    expect(() => release!()).not.toThrow();
    expect(await readRunsElsewhere()).toEqual(new Set());
    useLocks({
      request: vi.fn(async () => Promise.reject(new Error('SecurityError'))),
      query: vi.fn(async () => Promise.reject(new Error('denied'))),
    });
    expect(await acquireRunLock('bot-1')).toBeTypeOf('function');
    expect(await readRunsElsewhere()).toEqual(new Set());
  });
});
