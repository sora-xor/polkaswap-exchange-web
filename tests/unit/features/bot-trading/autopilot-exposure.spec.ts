import { describe, expect, it } from 'vitest';
import {
  autopilotValidationExposureKey,
  createAutopilotValidationExposureStore,
} from '@/features/bot-trading/autopilot-exposure';

const HOUR = 3_600_000;
const FROM = Date.parse('2026-09-22T01:00:00Z');
const network = (endpoint: string, runtime: number, genesis = 'genesis') =>
  JSON.stringify([true, genesis, endpoint, runtime]);
const stableKey = (chain = 'genesis') => autopilotValidationExposureKey(network('endpoint', 123, chain), 'KUSD', 'XOR');
const legacyKey = (endpoint: string, runtime: number, genesis = 'genesis') =>
  JSON.stringify([network(endpoint, runtime, genesis), 'KUSD', 'XOR']);

/** A serialized IDB boundary exercises the adapter without a browser or network dependency. */
function database() {
  const records = new Map<string, unknown>();
  let created = false;
  let previous = Promise.resolve();
  const db = {
    objectStoreNames: { contains: () => created },
    createObjectStore: () => {
      created = true;
    },
    close: () => undefined,
    transaction: () => {
      let release!: () => void;
      const turn = previous;
      const done = new Promise<void>((resolve) => (release = resolve));
      previous = turn.then(() => done);
      let stopped = false;
      let staged: Map<string, unknown>;
      const complete = () => {
        if (stopped) return;
        stopped = true;
        records.clear();
        for (const [key, value] of staged) records.set(key, structuredClone(value));
        tx.oncomplete?.();
        release();
      };
      const tx = {
        oncomplete: null as (() => void) | null,
        onabort: null as (() => void) | null,
        onerror: null as (() => void) | null,
        abort: () => {
          if (stopped) return;
          stopped = true;
          queueMicrotask(() => {
            tx.onabort?.();
            release();
          });
        },
        objectStore: () => ({
          get: (key: string) => {
            const request = { result: undefined as unknown, onsuccess: null as (() => void) | null };
            void turn.then(() => {
              if (stopped) return;
              staged = new Map(records);
              request.result = structuredClone(staged.get(key));
              request.onsuccess?.();
              queueMicrotask(complete);
            });
            return request;
          },
          openCursor: () => {
            const request = {
              result: null as { key: string; value: unknown; continue: () => void } | null,
              onsuccess: null as (() => void) | null,
            };
            void turn.then(() => {
              if (stopped) return;
              staged = new Map(records);
              const keys = [...staged.keys()].sort();
              let index = 0;
              const advance = () => {
                if (stopped) return;
                if (index === keys.length) {
                  request.result = null;
                  request.onsuccess?.();
                  queueMicrotask(complete);
                  return;
                }
                const key = keys[index++];
                request.result = {
                  key,
                  value: structuredClone(staged.get(key)),
                  continue: () => queueMicrotask(advance),
                };
                request.onsuccess?.();
              };
              advance();
            });
            return request;
          },
          put: (value: unknown, key: string) => staged.set(key, structuredClone(value)),
        }),
      };
      return tx;
    },
  };
  const factory = {
    open: () => {
      const request = {
        result: db,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
      };
      queueMicrotask(() => {
        if (!created) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
  return { factory, records };
}

describe('durable GO validation exposure', () => {
  it('uses one chain-and-pair key across endpoint, runtime and token direction changes', () => {
    const first = autopilotValidationExposureKey(network('endpoint-a', 123), 'KUSD', 'XOR');
    const changed = autopilotValidationExposureKey(network('endpoint-b', 124), 'XOR', 'KUSD');
    expect(changed).toBe(first);
    expect(autopilotValidationExposureKey(network('endpoint-b', 124, 'other-genesis'), 'KUSD', 'XOR')).not.toBe(first);
    for (const invalid of [
      'network',
      '[true,"genesis"]',
      '[false,"genesis","endpoint",123]',
      '[true,"","endpoint",123]',
    ])
      expect(() => autopilotValidationExposureKey(invalid, 'KUSD', 'XOR')).toThrow('bots.errors.storage');
    expect(() => autopilotValidationExposureKey(network('endpoint', 123), 'KUSD', 'KUSD')).toThrow(
      'bots.errors.storage'
    );
  });

  it('merges old endpoint keys before reading or reserving a same-chain holdout', async () => {
    const { factory, records } = database();
    const older = { from: FROM, to: FROM + 24 * HOUR };
    const later = { from: FROM + 25 * HOUR, to: FROM + 49 * HOUR };
    records.set(legacyKey('endpoint-a', 122), older);
    records.set(legacyKey('endpoint-b', 123), later);
    records.set(legacyKey('other-chain', 123, 'other-genesis'), { from: FROM, to: FROM + HOUR });
    const store = createAutopilotValidationExposureStore(factory);
    const key = stableKey();
    expect(await store.read(key)).toEqual(later);
    await expect(store.reserve(key, { from: FROM + 26 * HOUR, to: FROM + 50 * HOUR })).rejects.toThrow(
      'bots.errors.stale'
    );
    const next = { from: later.to + HOUR, to: later.to + 25 * HOUR };
    const currentLegacy = legacyKey('endpoint-c', 124);
    await store.reserve(key, next, currentLegacy);
    expect(await store.read(key)).toEqual(next);
    expect(records.get(key)).toEqual(next);
    expect(records.get(legacyKey('endpoint-a', 122))).toEqual(next);
    expect(records.get(legacyKey('endpoint-b', 123))).toEqual(next);
    expect(records.get(currentLegacy)).toEqual(next);
    expect(records.get(legacyKey('other-chain', 123, 'other-genesis'))).toEqual({
      from: FROM,
      to: FROM + HOUR,
    });
    await expect(store.reserve(currentLegacy, next)).rejects.toThrow('bots.errors.stale');
  });

  it('serializes same-chain reservations from tabs with different RPC identities', async () => {
    const { factory } = database();
    const first = createAutopilotValidationExposureStore(factory);
    const second = createAutopilotValidationExposureStore(factory);
    const window = { from: FROM, to: FROM + 49 * HOUR };
    const results = await Promise.allSettled([
      first.reserve(
        autopilotValidationExposureKey(network('endpoint-a', 122), 'KUSD', 'XOR'),
        window,
        legacyKey('endpoint-a', 122)
      ),
      second.reserve(
        autopilotValidationExposureKey(network('endpoint-b', 123), 'KUSD', 'XOR'),
        window,
        legacyKey('endpoint-b', 123)
      ),
    ]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(await second.read(stableKey())).toEqual(window);
  });

  it('persists only a bounded diagnosis on the exact reserved window and clears it on the next one', async () => {
    const { factory, records } = database();
    const first = createAutopilotValidationExposureStore(factory);
    const second = createAutopilotValidationExposureStore(factory);
    const key = stableKey();
    const window = { from: FROM, to: FROM + 49 * HOUR };
    const diagnostics = { stage: 'validation' as const, failures: [{ candidate: 2, reasons: ['drawdown' as const] }] };
    await first.reserve(key, window, legacyKey('endpoint-a', 122));
    await first.saveDiagnostics(key, window, diagnostics);
    expect(await second.read(key)).toEqual({ ...window, diagnostics });
    expect(records.get(key)).toEqual({ ...window, diagnostics });
    await expect(first.saveDiagnostics(key, { from: window.from, to: window.to + HOUR }, diagnostics)).rejects.toThrow(
      'bots.errors.stale'
    );
    await expect(
      first.saveDiagnostics(key, window, {
        stage: 'validation',
        failures: [{ candidate: 2, reasons: ['provider text' as 'drawdown'] }],
      })
    ).rejects.toThrow('bots.errors.storage');
    const next = { from: window.to + HOUR, to: window.to + 50 * HOUR };
    await second.reserve(key, next);
    await expect(first.saveDiagnostics(key, window, diagnostics)).rejects.toThrow('bots.errors.stale');
    expect(await second.read(key)).toEqual(next);
  });

  it('fails closed on a malformed persisted diagnosis without discarding the holdout', async () => {
    const { factory, records } = database();
    const key = stableKey();
    records.set(key, {
      from: FROM,
      to: FROM + 49 * HOUR,
      diagnostics: { stage: 'validation', failures: [{ candidate: 1, reasons: ['netLoss'], prices: ['secret'] }] },
    });
    const store = createAutopilotValidationExposureStore(factory);
    await expect(store.read(key)).rejects.toThrow('bots.errors.storage');
    await expect(store.reserve(key, { from: FROM + 50 * HOUR, to: FROM + 99 * HOUR })).rejects.toThrow(
      'bots.errors.storage'
    );
  });

  it('fails closed on corrupt or ambiguous same-pair legacy data', async () => {
    const { factory, records } = database();
    records.set(legacyKey('endpoint-a', 122), { from: FROM, to: 'bad' });
    const store = createAutopilotValidationExposureStore(factory);
    await expect(store.read(stableKey())).rejects.toThrow('bots.errors.storage');
    await expect(store.reserve(stableKey(), { from: FROM + HOUR, to: FROM + 2 * HOUR })).rejects.toThrow(
      'bots.errors.storage'
    );
    records.clear();
    records.set(JSON.stringify(['not-a-network', 'KUSD', 'XOR']), { from: FROM, to: FROM + HOUR });
    await expect(store.read(stableKey())).rejects.toThrow('bots.errors.storage');
    expect(records.has(stableKey())).toBe(false);
    await expect(
      store.reserve(stableKey(), { from: FROM + HOUR, to: FROM + 2 * HOUR }, legacyKey('foreign', 123, 'other'))
    ).rejects.toThrow('bots.errors.storage');
  });

  it('survives a new store instance and admits only a disjoint later holdout', async () => {
    const { factory } = database();
    const first = createAutopilotValidationExposureStore(factory);
    const second = createAutopilotValidationExposureStore(factory);
    const window = { from: FROM, to: FROM + 49 * HOUR };
    expect(await first.read('network:pair')).toBeNull();
    await first.reserve('network:pair', window);
    expect(await second.read('network:pair')).toEqual(window);
    await expect(second.reserve('network:pair', { from: window.from + HOUR, to: window.to + HOUR })).rejects.toThrow(
      'bots.errors.stale'
    );
    const later = { from: window.to + HOUR, to: window.to + 50 * HOUR };
    await second.reserve('network:pair', later);
    expect(await first.read('network:pair')).toEqual(later);
  });

  it('serializes simultaneous tab reservations so only one may expose a window', async () => {
    const { factory } = database();
    const first = createAutopilotValidationExposureStore(factory);
    const second = createAutopilotValidationExposureStore(factory);
    const window = { from: FROM, to: FROM + 49 * HOUR };
    const results = await Promise.allSettled([
      first.reserve('network:pair', window),
      second.reserve('network:pair', window),
    ]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(await first.read('network:pair')).toEqual(window);
  });

  it('fails closed when IndexedDB is missing or a stored watermark is corrupt', async () => {
    const absent = createAutopilotValidationExposureStore(undefined);
    await expect(absent.read('network:pair')).rejects.toThrow('bots.errors.storage');
    await expect(absent.reserve('network:pair', { from: FROM, to: FROM + HOUR })).rejects.toThrow(
      'bots.errors.storage'
    );
    const denied = createAutopilotValidationExposureStore({
      open: () => {
        throw Error('private storage unavailable');
      },
    } as unknown as IDBFactory);
    await expect(denied.read('network:pair')).rejects.toThrow('bots.errors.storage');
    const { factory, records } = database();
    records.set('network:pair', { from: FROM, to: 'bad' });
    const store = createAutopilotValidationExposureStore(factory);
    await expect(store.read('network:pair')).rejects.toThrow('bots.errors.storage');
    await expect(store.reserve('network:pair', { from: FROM + HOUR, to: FROM + 2 * HOUR })).rejects.toThrow(
      'bots.errors.storage'
    );
    expect(records.get('network:pair')).toEqual({ from: FROM, to: 'bad' });
  });
});
