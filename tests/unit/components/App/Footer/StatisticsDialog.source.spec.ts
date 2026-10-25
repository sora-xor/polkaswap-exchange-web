import { describe, expect, it } from 'vitest';

import statisticsDialogSource from '@/components/App/Footer/StatisticsDialog.vue?raw';

describe('StatisticsDialog source', () => {
  it('uses the app shell async select-indexer export instead of the router registry', () => {
    expect(statisticsDialogSource).toContain("import { SelectIndexer } from '@/app/shell/components';");
    expect(statisticsDialogSource).not.toContain("import { lazyComponent } from '@/router';");
    expect(statisticsDialogSource).not.toContain('Components.SelectIndexer');
  });

  it('renders only the Polkaswap-owned indexer source', () => {
    expect(statisticsDialogSource).toContain("name: 'Polkaswap Indexer'");
    expect(statisticsDialogSource).toContain('return [IndexerType.POLKASWAP].map');
    expect(statisticsDialogSource).not.toContain('Object.values(IndexerType).map');
  });

  it('uses the compact footer statistics label as the dialog title', () => {
    expect(statisticsDialogSource).toContain(':title="t(\'footer.statistics.label\')"');
    expect(statisticsDialogSource).not.toContain("t('footer.statistics.dialog.title')");
  });

  it('uses the shared dialog shell instead of local header styling', () => {
    expect(statisticsDialogSource).not.toContain('.dialog-card__title-text');
    expect(statisticsDialogSource).not.toContain('.el-dialog__header');
  });
});
