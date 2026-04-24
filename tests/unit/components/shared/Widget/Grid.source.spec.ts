import { describe, expect, it } from 'vitest';

import gridSource from '@/components/shared/Widget/Grid.vue?raw';

describe('WidgetsGrid source', () => {
  it('uses the live-site zoom transition hooks for widget entry animations', () => {
    expect(gridSource).toContain('.list-enter-from');
    expect(gridSource).not.toContain('.list-enter,');
    expect(gridSource).toContain('transform: scale(0.8);');
    expect(gridSource).toContain('transition-property: opacity, scale;');
    expect(gridSource).not.toContain('transition-property: opacity, transform, height;');
  });
});
