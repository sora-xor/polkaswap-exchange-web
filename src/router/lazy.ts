import { defineAsyncComponent } from 'vue';

/**
 * Shared lazy helpers that keep async component loading predictable across route modules.
 */
export const createAsyncComponent = <T>(loader: () => Promise<T>) =>
  defineAsyncComponent({
    loader,
    delay: 0,
    suspensible: false,
  });

export const lazyComponent = (name: string) => createAsyncComponent(() => import(`@/components/${name}.vue`));

export const lazyView = (name: string) => () => import(`@/views/${name}.vue`);
