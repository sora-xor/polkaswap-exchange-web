import { describe, expect, it } from 'vitest';

import nodeIconSource from '@/features/bridge/components/NodeIcon.vue?raw';

describe('Bridge NodeIcon source', () => {
  it('names the icon-only node selector action', () => {
    expect(nodeIconSource).toContain(':aria-label="t(\'selectNodeText\')"');
  });
});
