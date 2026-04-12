import { describe, expect, it } from 'vitest';

import exploreCollateralsSource from '@/modules/vault/components/ExploreCollaterals.vue?raw';

describe('ExploreCollaterals source', () => {
  it('keeps the Kensetsu noir search field aligned with production surface tokens', () => {
    expect(exploreCollateralsSource).toContain('padding: 8px 16px;');
    expect(exploreCollateralsSource).toContain(
      ":global(:root[design-system-theme='dark'] .collaterals-search > .search.search-input)"
    );
    expect(exploreCollateralsSource).toContain(
      ":global(.sora-theme-provider[design-system-theme='dark'] .collaterals-search > .search.search-input)"
    );
    expect(exploreCollateralsSource).toContain('background-color: var(--s-color-base-dark-background);');
    expect(exploreCollateralsSource).toContain('border-color: var(--s-color-base-border-primary);');
    expect(exploreCollateralsSource).toContain('box-shadow: var(--s-shadow-element);');
  });

  it('hides insignificant decimals in collateral table token amounts', () => {
    expect(exploreCollateralsSource).toContain(':integer-only="isAmountValueIntegerOnly(row.totalLocked)"');
    expect(exploreCollateralsSource).toContain(':integer-only="isAmountValueIntegerOnly(row.totalDebt)"');
    expect(exploreCollateralsSource).toContain(':integer-only="isAmountValueIntegerOnly(row.availableToBorrow)"');
  });
});
