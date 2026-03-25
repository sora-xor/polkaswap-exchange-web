// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  burnDialog: path.join(repoRoot, 'src/components/pages/Burn/BurnDialog.vue'),
  swapTransactionDetails: path.join(repoRoot, 'src/components/pages/Swap/TransactionDetails.vue'),
  swapForm: path.join(repoRoot, 'src/components/pages/Swap/Widget/Form.vue'),
  swapTransactions: path.join(repoRoot, 'src/components/pages/Swap/Widget/Transactions.vue'),
  marketAlgorithm: path.join(repoRoot, 'src/components/pages/Swap/Settings/MarketAlgorithm/MarketAlgorithm.vue'),
  priceChart: path.join(repoRoot, 'src/components/shared/Widget/PriceChart.vue'),
};

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('Swap component store migration', () => {
  it('keeps the remaining swap-related components off the root @/store import', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('store.');
    }
  });

  it('keeps transactional swap components on settings and asset facades', async () => {
    const [burnSource, transactionDetailsSource, formSource, transactionsSource] = await Promise.all([
      readSource(files.burnDialog),
      readSource(files.swapTransactionDetails),
      readSource(files.swapForm),
      readSource(files.swapTransactions),
    ]);

    expect(burnSource).toContain("from '@/stores/settings'");
    expect(burnSource).toContain("from '@/stores/assets'");
    expect(burnSource).toContain("from '@/stores/wallet'");

    expect(transactionDetailsSource).toContain("from '@/stores/settings'");
    expect(transactionDetailsSource).toContain("from '@/stores/assets'");

    expect(formSource).toContain("from '@/stores/settings'");
    expect(formSource).toContain('settingsStore.networkFees');
    expect(formSource).toContain('settingsStore.slippageTolerance');

    expect(transactionsSource).toContain("from '@/stores/settings'");
    expect(transactionsSource).toContain("from '@/stores/wallet'");
    expect(transactionsSource).toContain('walletStore.assetsDataTable');
  });

  it('keeps settings-driven swap/chart components on the settings facade', async () => {
    const [marketAlgorithmSource, priceChartSource] = await Promise.all([
      readSource(files.marketAlgorithm),
      readSource(files.priceChart),
    ]);

    expect(marketAlgorithmSource).toContain("from '@/stores/settings'");
    expect(marketAlgorithmSource).toContain('settingsStore.marketAlgorithm');
    expect(marketAlgorithmSource).toContain('settingsStore.setMarketAlgorithm');

    expect(priceChartSource).toContain("from '@/stores/settings'");
    expect(priceChartSource).toContain('settingsStore.currency');
    expect(priceChartSource).toContain('settingsStore.exchangeRate');
    expect(priceChartSource).toContain('settingsStore.currencySymbol');
  });
});
