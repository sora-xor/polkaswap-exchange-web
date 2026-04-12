import { describe, expect, it } from 'vitest';

import vaultsSource from '@/modules/vault/views/Vaults.vue?raw';

describe('Vaults source', () => {
  it('renders integer-only amounts for Kensetsu card totals with zero-only fractions', () => {
    expect(vaultsSource).toContain(':integer-only="isIntegerAmount(vault.lockedAmount)"');
    expect(vaultsSource).toContain(':integer-only="isIntegerAmount(vault.debt)"');
    expect(vaultsSource).toContain(':integer-only="isIntegerAmount(vault.available)"');
    expect(vaultsSource).toContain(':integer-only="isIntegerAmount(vault.returned)"');
  });

  it('keeps the Kensetsu disclaimer typography aligned with production', () => {
    expect(vaultsSource).toContain('font-size: var(--s-heading4-font-size);');
    expect(vaultsSource).toContain('line-height: 27px;');
    expect(vaultsSource).toContain('font-size: var(--s-font-size-mini);');
    expect(vaultsSource).toContain('line-height: 1.8;');
    expect(vaultsSource).toContain('line-height: 25.2px;');
  });
});
