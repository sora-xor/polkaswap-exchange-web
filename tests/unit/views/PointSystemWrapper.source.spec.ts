import { describe, expect, it } from 'vitest';

import pointSystemWrapperSource from '@/views/PointSystemWrapper.vue?raw';

describe('PointSystemWrapper.vue source', () => {
  it('uses the shared retryable async loader for points variants', () => {
    expect(pointSystemWrapperSource).toContain("import { createAsyncComponent } from '@/router/lazy';");
    expect(pointSystemWrapperSource).toContain("const PointSystemComponent = createAsyncComponent(() => import('@/views/PointSystem.vue'));");
    expect(pointSystemWrapperSource).toContain(
      "const PointSystemV2Component = createAsyncComponent(() => import('@/views/PointSystemV2.vue'));"
    );
    expect(pointSystemWrapperSource).not.toContain('defineAsyncComponent');
  });
});
