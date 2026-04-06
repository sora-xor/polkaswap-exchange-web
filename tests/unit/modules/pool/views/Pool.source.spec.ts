import { describe, expect, it } from 'vitest';

import poolSource from '@/modules/pool/views/Pool.vue?raw';

describe('Pool.vue source', () => {
  it('keeps the pool empty state aligned with the production structure and surface styles', () => {
    expect(poolSource).not.toContain('class="pool-empty-state"');
    expect(poolSource).toContain('v-if="isLoggedIn"');
    expect(poolSource).toContain('v-else class="s-typography-button--large"');
    expect(poolSource).toContain('padding: 20px 24px;');
    expect(poolSource).toContain('font-weight: 600;');
    expect(poolSource).toContain('text-transform: uppercase;');
    expect(poolSource).not.toContain('border-color: var(--s-color-base-content-secondary);');
    expect(poolSource).not.toContain('letter-spacing: -0.28px;');
  });
});
