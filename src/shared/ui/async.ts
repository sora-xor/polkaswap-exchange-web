import { defineAsyncComponent } from 'vue';

const ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE = "Cannot access 'default' before initialization";
const RETRYABLE_IMPORT_FAILURE_PATTERNS = [
  ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE,
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS for',
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
