/** Bounded same-origin static evidence transport. Bytes only; no study, wallet or qualification authority. */
import { goalRawBytesSha256 as sha } from './goal-raw-envelope';
const SHA = /^[0-9a-f]{64}$/;
const MAX_CHUNKS = 65536;
const TIMEOUT_MS = 30000;
/** Stable source-free evidence transport diagnostic. */
export class GoalBundleError extends Error {
  constructor(reason: string) {
    super(`goal-bundle:${reason}`);
  }
}
function check(value: unknown, reason: string): asserts value {
  if (!value) throw new GoalBundleError(reason);
}
function own(value: unknown, required: readonly string[], optional: readonly string[] = []): Record<string, unknown> {
  check(value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype, 'own-data');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  check(
    required.every((key) => Object.hasOwn(descriptors, key)) &&
      Reflect.ownKeys(descriptors).every(
        (key) =>
          typeof key === 'string' &&
          [...required, ...optional].includes(key) &&
          descriptors[key].enumerable &&
          'value' in descriptors[key]
      ),
    'own-data'
  );
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [key, descriptor.value]));
}
function hash(value: unknown): asserts value is string {
  check(typeof value === 'string' && SHA.test(value), 'digest');
}
function rootUrl(value: unknown): string {
  check(typeof value === 'string' && value.length > 0 && value.length <= 2048, 'root');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new GoalBundleError('root');
  }
  check(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.href === value &&
      url.pathname.endsWith('/') &&
      url.pathname
        .slice(1, -1)
        .split('/')
        .every((segment) =>
          segment === '' ? url.pathname === '/' : /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/.test(segment)
        ),
    'root'
  );
  return url.href;
}
function abortSignal(value: unknown): asserts value is AbortSignal | undefined {
  if (value === undefined) return;
  check(
    value instanceof AbortSignal &&
      Object.getPrototypeOf(value) === AbortSignal.prototype &&
      !['aborted', 'addEventListener', 'removeEventListener'].some((key) => Object.hasOwn(value, key)),
    'signal'
  );
  Object.getOwnPropertyDescriptor(AbortSignal.prototype, 'aborted')!.get!.call(value);
}

/** Read only canonical index/manifest/object paths from a pinned HTTPS directory, without credentials. */
export function createGoalBundleTransport(
  rawRoot: string,
  dependencies: { fetch: typeof fetch; signal?: AbortSignal }
) {
  const root = rootUrl(rawRoot);
  const deps = own(dependencies, ['fetch'], ['signal']);
  check(typeof deps.fetch === 'function', 'fetch');
  abortSignal(deps.signal);
  const upstream = deps.fetch as typeof fetch;
  const parentSignal = deps.signal;
  const lifetime = new AbortController();
  const forwardAbort = () => lifetime.abort();
  parentSignal?.addEventListener('abort', forwardAbort, { once: true });
  if (parentSignal?.aborted) forwardAbort();
  let closed = false;
  const dispose = () => {
    if (closed) return;
    closed = true;
    lifetime.abort();
    parentSignal?.removeEventListener('abort', forwardAbort);
  };
  const active = () => check(!closed && !lifetime.signal.aborted, 'closed');
  const load = async (path: string, expected: string, maximum: number, exact?: number): Promise<Uint8Array> => {
    active();
    const controller = new AbortController();
    const abort = () => controller.abort();
    lifetime.signal.addEventListener('abort', abort, { once: true });
    if (lifetime.signal.aborted) abort();
    const timer = setTimeout(abort, TIMEOUT_MS);
    const deadline = Date.now() + TIMEOUT_MS;
    let previous = deadline - TIMEOUT_MS;
    const fresh = () => {
      active();
      check(!controller.signal.aborted, 'aborted');
      const now = Date.now();
      check(Number.isSafeInteger(now) && now >= previous && now < deadline, 'deadline');
      previous = now;
    };
    const wait = <T>(promise: Promise<T>, late?: (result: T) => void): Promise<T> =>
      new Promise((resolve, reject) => {
        const cancelled = () => {
          controller.signal.removeEventListener('abort', cancelled);
          reject(new GoalBundleError('aborted'));
        };
        controller.signal.addEventListener('abort', cancelled, { once: true });
        promise.then(
          (result) => {
            controller.signal.removeEventListener('abort', cancelled);
            if (controller.signal.aborted) {
              try {
                late?.(result);
              } catch {
                /* Only cleanup; never admission. */
              }
              cancelled();
            } else resolve(result);
          },
          (error) => {
            controller.signal.removeEventListener('abort', cancelled);
            reject(error);
          }
        );
        if (controller.signal.aborted) cancelled();
      });
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let response: Response | undefined;
    let complete = false;
    try {
      const url = `${root}${path}`;
      response = await wait<Response>(
        Promise.resolve().then(() => {
          fresh();
          return upstream(url, {
            method: 'GET',
            redirect: 'error',
            credentials: 'omit',
            cache: 'no-store',
            signal: controller.signal,
          });
        }),
        (late) => {
          void late.body?.cancel().catch(() => undefined);
        }
      );
      fresh();
      check(response.status === 200 && !response.redirected && response.url === url && response.body, 'response');
      reader = response.body.getReader();
      const result = new Uint8Array(exact ?? maximum);
      let size = 0,
        chunks = 0;
      for (;;) {
        check(++chunks <= MAX_CHUNKS, 'chunks');
        const item = await wait(reader.read());
        fresh();
        if (item.done) {
          complete = true;
          break;
        }
        check(item.value instanceof Uint8Array && item.value.length > 0, 'chunk');
        check(size + item.value.length <= result.length, 'bytes');
        result.set(item.value, size);
        size += item.value.length;
      }
      check(size > 0 && (exact === undefined || size === exact), 'bytes');
      const bytes = size === result.length ? result : result.slice(0, size);
      check(sha(bytes) === expected, 'hash');
      fresh();
      return bytes;
    } catch (error) {
      dispose();
      throw error instanceof GoalBundleError ? error : new GoalBundleError('unavailable');
    } finally {
      clearTimeout(timer);
      lifetime.signal.removeEventListener('abort', abort);
      controller.abort();
      if (reader) {
        if (!complete) void reader.cancel().catch(() => undefined);
        try {
          reader.releaseLock();
        } catch {
          /* A cancelled read can still be unwinding. */
        }
      } else if (response && !response.body?.locked) void response.body?.cancel().catch(() => undefined);
    }
  };
  let reading = false;
  return Object.freeze({
    dispose,
    assertOpen: active,
    async read(path: string, expected: string, maximum: number, exact?: number): Promise<Uint8Array> {
      try {
        active();
        check(!reading, 'concurrent-read');
        check(
          typeof path === 'string' &&
            /^(?:(?:index|manifest)\.json|objects\/[0-9a-f]{64}\.bin|episodes\/[0-9a-f]{64}\/(?:manifest\.json|objects\/[0-9a-f]{64}\.bin))$/.test(
              path
            ),
          'path'
        );
        hash(expected);
        check(
          Number.isSafeInteger(maximum) &&
            maximum > 0 &&
            maximum <= 32 * 1024 * 1024 &&
            (exact === undefined || (Number.isSafeInteger(exact) && exact > 0 && exact <= maximum)),
          'limit'
        );
        reading = true;
        return await load(path, expected, maximum, exact);
      } catch (error) {
        dispose();
        throw error;
      } finally {
        reading = false;
      }
    },
  });
}
