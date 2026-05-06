import { describe, expect, it } from 'vitest';

import appFooterSource from '@/components/App/Footer/AppFooter.vue?raw';

describe('AppFooter source', () => {
  it('uses app-owned async shell imports instead of the global component registry', () => {
    expect(appFooterSource).toContain("import { SelectNodeDialog } from '@/app/shell/components';");
    expect(appFooterSource).toContain("import StatisticsDialog from './StatisticsDialog.vue';");
    expect(appFooterSource).not.toContain("import { lazyComponent } from '@/router';");
    expect(appFooterSource).not.toContain('Components.SelectNodeDialog');
    expect(appFooterSource).not.toContain('Components.StatisticsDialog');
  });
});
