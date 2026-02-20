import { defineAsyncComponent } from 'vue';

const ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE = "Cannot access 'default' before initialization";

export const isRetryableAsyncComponentError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes(ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE);
  }

  if (typeof error === 'string') {
    return error.includes(ASYNC_COMPONENT_DEFAULT_INIT_MESSAGE);
  }

  return false;
};

const scheduleRetry = (callback: () => void): void => {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(callback);
    return;
  }
  setTimeout(callback, 0);
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
      // Safari/WebKit can throw this transiently while resolving async SFC default exports.
      if (isRetryableAsyncComponentError(error) && attempts <= 2) {
        scheduleRetry(retry);
        return;
      }
      fail();
    },
  });

export const lazyComponent = (name: string) => createAsyncComponent(() => import(`@/components/${name}.vue`));

export const lazyView = (name: string) => () => import(`@/views/${name}.vue`);
