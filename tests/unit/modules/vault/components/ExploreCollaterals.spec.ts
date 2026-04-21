import { describe, expect, it } from 'vitest';

import exploreCollateralsSource from '@/modules/vault/components/ExploreCollaterals.vue?raw';

describe('ExploreCollaterals source', () => {
  it('uses direct shared imports instead of the vault lazy registry', () => {
    expect(exploreCollateralsSource).not.toContain('lazyComponent(');
    expect(exploreCollateralsSource).not.toContain('Components.');
    expect(exploreCollateralsSource).not.toContain("from '@/router'");
    expect(exploreCollateralsSource).toContain("import PairTokenLogo from '@/components/shared/PairTokenLogo.vue';");
    expect(exploreCollateralsSource).toContain("import SortButton from '@/components/shared/Button/SortButton.vue';");
    expect(exploreCollateralsSource).toContain("import DataRowSkeleton from '@/components/shared/Skeleton/DataRow.vue';");
  });

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
