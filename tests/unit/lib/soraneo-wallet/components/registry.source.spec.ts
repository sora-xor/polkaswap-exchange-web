import { describe, expect, it } from 'vitest';

import registrySource from '@/lib/soraneo-wallet/src/components/registry.ts?raw';

describe('wallet component registry source', () => {
  it('uses the shared retryable async component helper for wallet chunks', () => {
    expect(registrySource).toContain("import { createAsyncComponent } from '@/router/lazy';");
    expect(registrySource).toContain('const lazyComponent = <T>(loader: AsyncComponentLoader<T>) => createAsyncComponent(loader);');
    expect(registrySource).not.toContain('defineAsyncComponent');
  });
});
