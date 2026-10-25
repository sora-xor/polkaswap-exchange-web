import { defineAsyncComponent } from 'vue';

type AsyncComponentLoader<T> = () => Promise<T>;

type AsyncComponentOptions = {
  /**
   * Identifier used in error logs to help trace failing lazy imports.
   */
  name?: string;
  /**
   * How many times to retry a failing loader before giving up.
   * Defaults to 3 attempts (initial try + 2 retries).
   */
  retryAttempts?: number;
  /**
   * Base delay in milliseconds applied before retrying. Each retry
   * multiplies the delay by the current attempt count to provide a
   * modest backoff.
   */
  retryDelay?: number;
};

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY = 1_000;

/**
 * Wraps `defineAsyncComponent` with sensible defaults for IPFS-hosted builds.
 * The helper ensures missing chunks surface actionable console errors and
 * automatically retries transient failures (e.g. slow gateway responses).
 */
export function createAsyncComponent<T>(loader: AsyncComponentLoader<T>, options: AsyncComponentOptions = {}) {
  const { name, retryAttempts = DEFAULT_RETRY_ATTEMPTS, retryDelay = DEFAULT_RETRY_DELAY } = options;

  return defineAsyncComponent({
    loader,
    suspensible: false,
    onError(error, retry, fail, attempts) {
      const label = name ? `[async:${name}]` : '[async]';
      console.error(`${label} failed to load (attempt ${attempts})`, error);

      if (attempts < retryAttempts) {
        const delay = retryDelay * attempts;
        setTimeout(() => retry(), delay);
        return;
      }

      fail(error);
    },
  });
}

export type AsyncComponentFactory = ReturnType<typeof createAsyncComponent>;
