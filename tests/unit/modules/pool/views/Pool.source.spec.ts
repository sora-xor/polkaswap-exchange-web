import { describe, expect, it } from 'vitest';

import poolSource from '@/modules/pool/views/Pool.vue?raw';

describe('Pool.vue source', () => {
  it('keeps the pool empty state aligned with the production structure and surface styles', () => {
    expect(poolSource).not.toContain('class="pool-empty-state"');
    expect(poolSource).toContain("{{ !isLoggedIn ? t('connectWalletText') : t('pool.addLiquidity') }}");
    expect(poolSource).toContain('color: var(--s-color-base-content-secondary);');
    expect(poolSource).toContain('border-color: var(--s-color-base-content-secondary);');
    expect(poolSource).toContain('letter-spacing: -0.28px;');
    expect(poolSource).toContain('padding: 20px 24px;');
  });
});
