import { describe, expect, it } from 'vitest';

import svgIconButtonSource from '@/components/shared/Button/SvgIconButton/SvgIconButton.vue?raw';

describe('SvgIconButton.vue source', () => {
  it('uses the shared retryable async loader for icon chunks', () => {
    expect(svgIconButtonSource).toContain("import { createAsyncComponent } from '@/router/lazy';");
    expect(svgIconButtonSource).toContain(
      'const createIconLoader = (loader: () => Promise<unknown>) => createAsyncComponent(loader);'
    );
    expect(svgIconButtonSource).not.toContain('defineAsyncComponent');
  });
});
