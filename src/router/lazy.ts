import { createAsyncComponent, isRetryableAsyncComponentError, loadAsyncImportWithRetry } from '@/shared/ui/async';

export const lazyComponent = (name: string) => createAsyncComponent(() => import(`@/components/${name}.vue`));

export { createAsyncComponent, isRetryableAsyncComponentError, loadAsyncImportWithRetry };
