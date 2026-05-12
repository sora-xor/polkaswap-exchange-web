import { describe, expect, it } from 'vitest';

import appFooterSource from '@/components/App/Footer/AppFooter.vue?raw';

describe('AppFooter source', () => {
  it('uses app-owned async shell imports instead of the global component registry', () => {
    expect(appFooterSource).toContain("import { SelectNodeDialog } from '@/app/shell/components';");
    expect(appFooterSource).not.toContain("import { lazyComponent } from '@/router';");
    expect(appFooterSource).not.toContain('Components.SelectNodeDialog');
    expect(appFooterSource).not.toContain('Components.StatisticsDialog');
  });

  it('renders the Polkaswap indexer block as a static footer message', () => {
    expect(appFooterSource).toContain('class="app-status__item indexer-block s-flex"');
    expect(appFooterSource).toContain('fetchLatestIndexedBlock');
    expect(appFooterSource).toContain('const displayedIndexedBlock = computed');
    expect(appFooterSource).not.toContain('<statistics-dialog');
    expect(appFooterSource).not.toContain('setSelectIndexerDialogVisibility');
  });
});
