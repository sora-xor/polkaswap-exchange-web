import { describe, expect, it } from 'vitest';

import statisticsDialogSource from '@/components/App/Footer/StatisticsDialog.vue?raw';

describe('StatisticsDialog source', () => {
  it('uses the app shell async select-indexer export instead of the router registry', () => {
    expect(statisticsDialogSource).toContain("import { SelectIndexer } from '@/app/shell/components';");
    expect(statisticsDialogSource).not.toContain("import { lazyComponent } from '@/router';");
    expect(statisticsDialogSource).not.toContain('Components.SelectIndexer');
  });
});
