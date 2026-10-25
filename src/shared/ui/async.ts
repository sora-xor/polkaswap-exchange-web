import { defineAsyncComponent } from 'vue';

const ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE = "Cannot access 'default' before initialization";
const VITE_CSS_PRELOAD_FAILURE_PATTERN = 'Unable to preload CSS for';
const RETRYABLE_IMPORT_FAILURE_PATTERNS = [
  ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE,
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  VITE_CSS_PRELOAD_FAILURE_PATTERN,
  'status of 429',
  'ERR_ABORTED',
  'Loading chunk',
  'ChunkLoadError',
];
const MAX_RETRY_ATTEMPTS = 8;
const RETRY_DELAY_MS = 400;
const MAX_RETRY_DELAY_MS = 4_000;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
};

const wait = (delay: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, delay));
  });

const resolveRetryDelay = (attempts: number): number => {
  const exponent = Math.max(0, attempts - 1);
  const backoff = (2 ** exponent - 1) * RETRY_DELAY_MS;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, backoff));
};

export const isRetryableAsyncComponentError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return RETRYABLE_IMPORT_FAILURE_PATTERNS.some((pattern) => message.includes(pattern));
};

/**
 * Detects Vite CSS preload failures that should not block app bootstrap.
 */
export const isViteCssPreloadError = (error: unknown): boolean =>
  getErrorMessage(error).includes(VITE_CSS_PRELOAD_FAILURE_PATTERN);

type VitePreloadErrorEvent = Event & {
  payload?: unknown;
};

type VitePreloadErrorTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

/**
 * Prevents non-critical dynamic CSS preload errors from aborting Vite dynamic
 * imports. JavaScript chunk failures still propagate normally.
 */
export const installViteCssPreloadErrorHandler = (
  target: VitePreloadErrorTarget | undefined = typeof window === 'undefined' ? undefined : window,
  logger: Pick<Console, 'warn'> = console
): (() => void) => {
  if (!target) return () => undefined;

  const handlePreloadError = (event: Event): void => {
    const preloadEvent = event as VitePreloadErrorEvent;

    if (!isViteCssPreloadError(preloadEvent.payload)) return;

    event.preventDefault();
    logger.warn('[bootstrap] CSS preload failed; continuing app startup', preloadEvent.payload);
  };

  target.addEventListener('vite:preloadError', handlePreloadError);

  return () => {
    target.removeEventListener('vite:preloadError', handlePreloadError);
  };
};

type AsyncImportRetryOptions = {
  maxAttempts?: number;
  retryDelayMs?: number;
};

/**
 * Retries transient async-import failures for route-level and component-level
 * lazy imports. This keeps public-gateway chunk fetches resilient on IPFS/CDN.
 */
export const loadAsyncImportWithRetry = async <T>(
  loader: () => Promise<T>,
  options: AsyncImportRetryOptions = {}
): Promise<T> => {
  const maxAttempts = Math.max(1, options.maxAttempts ?? MAX_RETRY_ATTEMPTS);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? RETRY_DELAY_MS);
  let attempts = 1;

  while (true) {
    try {
      return await loader();
    } catch (error) {
      if (!isRetryableAsyncComponentError(error) || attempts >= maxAttempts) {
        throw error;
      }

      const delay = retryDelayMs === RETRY_DELAY_MS ? resolveRetryDelay(attempts) : (attempts - 1) * retryDelayMs;

      if (!delay && typeof queueMicrotask === 'function') {
        await new Promise<void>((resolve) => queueMicrotask(resolve));
      } else {
        await wait(delay);
      }

      attempts += 1;
    }
  }
};

const scheduleRetry = (callback: () => void, attempts: number): void => {
  const delay = resolveRetryDelay(attempts);
  if (!delay && typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }

  setTimeout(callback, delay);
};

type PreloadableAsyncComponent = { __asyncLoader?: () => Promise<unknown> };

export type PreloadAsyncComponentsOptions = {
  /** Upper bound for the wait; loading continues in the background after it. */
  timeoutMs?: number;
};

export const ASYNC_COMPONENT_PRELOAD_TIMEOUT_MS = 10_000;

/**
 * Resolves async component wrappers before they first render.
 *
 * Vue renders an already-resolved wrapper's component in the same pass. An
 * unresolved wrapper renders nothing until its loader settles, which takes at
 * least one task even when the chunk is cached, so its content pops in after
 * the first paint and shifts the layout. Failures are ignored here: a wrapper
 * that is still unresolved loads (and retries) on render exactly as before.
 *
 * Components that are not `defineAsyncComponent` wrappers are skipped.
 */
export const preloadAsyncComponents = async (
  components: Iterable<unknown>,
  { timeoutMs = ASYNC_COMPONENT_PRELOAD_TIMEOUT_MS }: PreloadAsyncComponentsOptions = {}
): Promise<void> => {
  const pending: Promise<unknown>[] = [];

  for (const component of components) {
    const loader = (component as PreloadableAsyncComponent | null | undefined)?.__asyncLoader;
    if (typeof loader === 'function') {
      pending.push(Promise.resolve().then(() => loader()));
    }
  }

  if (!pending.length) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, Math.max(0, timeoutMs));
  });

  try {
    await Promise.race([Promise.allSettled(pending), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Shared async-component helper for new app/feature boundaries.
 */
export const createAsyncComponent = <T>(loader: () => Promise<T>) =>
  defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false,
    onError: (error, retry, fail, attempts) => {
      if (isRetryableAsyncComponentError(error) && attempts <= MAX_RETRY_ATTEMPTS) {
        scheduleRetry(retry, attempts);
        return;
      }
      fail();
    },
  });
