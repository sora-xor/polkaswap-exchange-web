import { defineAsyncComponent } from 'vue';

const ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE = "Cannot access 'default' before initialization";
const RETRYABLE_IMPORT_FAILURE_PATTERNS = [
  ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE,
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Loading chunk',
  'ChunkLoadError',
];
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
};

export const isRetryableAsyncComponentError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return RETRYABLE_IMPORT_FAILURE_PATTERNS.some((pattern) => message.includes(pattern));
};

const scheduleRetry = (callback: () => void, attempts: number): void => {
  if (attempts <= 1 && typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }

  const delay = Math.max(0, (attempts - 1) * RETRY_DELAY_MS);
  setTimeout(callback, delay);
};

/**
 * Shared lazy helpers that keep async component loading predictable across route modules.
 */
export const createAsyncComponent = <T>(loader: () => Promise<T>) =>
  defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false,
    onError: (error, retry, fail, attempts) => {
      // Retry known transient import failures (Safari default-export race and chunk fetch hiccups).
      if (isRetryableAsyncComponentError(error) && attempts <= MAX_RETRY_ATTEMPTS) {
        scheduleRetry(retry, attempts);
        return;
      }
      fail();
    },
  });

export const lazyComponent = (name: string) => createAsyncComponent(() => import(`@/components/${name}.vue`));

export const lazyView = (name: string) => () => import(`@/views/${name}.vue`);
