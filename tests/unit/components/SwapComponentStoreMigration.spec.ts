// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  burnDialog: path.join(repoRoot, 'src/features/misc/components/burn/BurnDialog.vue'),
  componentsConsts: path.join(repoRoot, 'src/consts/index.ts'),
  featureSwapConfirm: path.join(repoRoot, 'src/features/swap/components/Confirm.vue'),
  featureSwapLossWarningDialog: path.join(repoRoot, 'src/features/swap/components/LossWarningDialog.vue'),
  featureSwapMarketAlgorithm: path.join(
    repoRoot,
    'src/features/swap/components/settings/MarketAlgorithm/MarketAlgorithm.vue'
  ),
  featureSwapPage: path.join(repoRoot, 'src/features/swap/pages/SwapPage.vue'),
  featureSwapSettings: path.join(repoRoot, 'src/features/swap/components/settings/Settings.vue'),
  featureSwapTransactionDetails: path.join(repoRoot, 'src/features/swap/components/TransactionDetails.vue'),
  featureSwapDistributionWidget: path.join(repoRoot, 'src/features/swap/components/widgets/Distribution.vue'),
  featureSwapFormWidget: path.join(repoRoot, 'src/features/swap/components/widgets/Form.vue'),
  featureSwapTransactionDetailsWidget: path.join(
    repoRoot,
    'src/features/swap/components/widgets/TransactionDetails.vue'
  ),
  featureSwapTransactionsWidget: path.join(repoRoot, 'src/features/swap/components/widgets/Transactions.vue'),
  priceChart: path.join(repoRoot, 'src/components/shared/Widget/PriceChart.vue'),
  sharedStatusActionBadge: path.join(repoRoot, 'src/shared/ui/StatusActionBadge.vue'),
  swapRouteSync: path.join(repoRoot, 'src/features/swap/composables/useSwapRouteSync.ts'),
};

const deletedSwapLegacyFiles = [
  'src/components/pages/Swap/Confirm.vue',
  'src/components/pages/Swap/LossWarningDialog.vue',
  'src/components/pages/Swap/Settings/MarketAlgorithm/Header.vue',
  'src/components/pages/Swap/Settings/MarketAlgorithm/MarketAlgorithm.vue',
  'src/components/pages/Swap/Settings/MarketAlgorithm/utils.ts',
  'src/components/pages/Swap/Settings/Settings.vue',
  'src/components/pages/Swap/StatusActionBadge.vue',
  'src/components/pages/Swap/TransactionDetails.vue',
  'src/components/pages/Swap/Widget/Distribution.vue',
  'src/components/pages/Swap/Widget/Form.vue',
  'src/components/pages/Swap/Widget/TransactionDetails.vue',
  'src/components/pages/Swap/Widget/Transactions.vue',
  'src/features/swap/components/StatusActionBadge.vue',
].map((file) => path.join(repoRoot, file));

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
      readSource(files.featureSwapTransactionDetails),
      readSource(files.featureSwapFormWidget),
      readSource(files.featureSwapTransactionsWidget),
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
      readSource(files.featureSwapMarketAlgorithm),
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

  it('keeps migrated swap async boundaries off the global component registry', async () => {
    const sources = await Promise.all([
      readSource(files.featureSwapConfirm),
      readSource(files.featureSwapDistributionWidget),
      readSource(files.featureSwapTransactionDetails),
      readSource(files.featureSwapTransactionDetailsWidget),
      readSource(files.featureSwapFormWidget),
      readSource(files.featureSwapTransactionsWidget),
      readSource(files.featureSwapMarketAlgorithm),
    ]);

    for (const source of sources) {
      expect(source).toContain("from '@/shared/ui/async'");
      expect(source).toContain('createAsyncComponent(');
      expect(source).not.toContain("from '@/router'");
      expect(source).not.toContain('lazyComponent(');
      expect(source).not.toContain('Components.');
    }
  });

  it('keeps the active swap runtime on feature-owned store and amount facades', async () => {
    const sources = await Promise.all([
      readSource(files.featureSwapConfirm),
      readSource(files.featureSwapDistributionWidget),
      readSource(files.swapRouteSync),
      readSource(files.featureSwapTransactionDetails),
      readSource(files.featureSwapTransactionDetailsWidget),
      readSource(files.featureSwapFormWidget),
      readSource(files.featureSwapMarketAlgorithm),
    ]);

    for (const source of sources) {
      expect(source).not.toContain("from '@/stores/swap'");
      expect(source).not.toContain("from '@/composables/useSwapAmounts'");
    }

    expect(sources[0]).toContain("from '@/features/swap/stores/useSwapStore'");
    expect(sources[0]).toContain("from '@/features/swap/composables/useSwapAmounts'");
  });

  it('keeps swap route sync off the legacy mirrored router store', async () => {
    const routeSyncSource = await readSource(files.swapRouteSync);

    expect(routeSyncSource).not.toContain("from '@/stores/router'");
    expect(routeSyncSource).not.toContain('routerStore.prev');
    expect(routeSyncSource).toContain("from '../services/navigationHistory'");
    expect(routeSyncSource).toContain("from '@/shared/navigation/useSelectedTokensRoute'");
    expect(routeSyncSource).not.toContain("from '@/composables/useSelectedTokensRoute'");
  });

  it('keeps migrated swap components out of the global component registry', async () => {
    const componentsConstsSource = await readSource(files.componentsConsts);

    expect(componentsConstsSource).not.toContain('SwapFormWidget = ');
    expect(componentsConstsSource).not.toContain('SwapTransactionsWidget = ');
    expect(componentsConstsSource).not.toContain('SwapDistributionWidget = ');
    expect(componentsConstsSource).not.toContain('SwapTransactionDetailsWidget = ');
    expect(componentsConstsSource).not.toContain('SwapStatusActionBadge = ');
    expect(componentsConstsSource).not.toContain('SwapConfirm = ');
    expect(componentsConstsSource).not.toContain('SwapTransactionDetails = ');
    expect(componentsConstsSource).not.toContain('SwapSettings = ');
    expect(componentsConstsSource).not.toContain('SwapLossWarningDialog = ');
    expect(componentsConstsSource).not.toContain('pages/Swap/');
  });

  it('keeps the feature page on direct widget imports instead of the temporary legacy bridge', async () => {
    const swapPageSource = await readSource(files.featureSwapPage);

    expect(swapPageSource).toContain("from '../components/widgets/Distribution.vue'");
    expect(swapPageSource).toContain("from '../components/widgets/Form.vue'");
    expect(swapPageSource).toContain("import('../components/widgets/TransactionDetails.vue')");
    expect(swapPageSource).toContain("import('../components/widgets/Transactions.vue')");
  });

  it('keeps the shared status action badge as the canonical implementation', async () => {
    const [sharedStatusActionBadgeSource, formWidgetSource] = await Promise.all([
      readSource(files.sharedStatusActionBadge),
      readSource(files.featureSwapFormWidget),
    ]);

    expect(sharedStatusActionBadgeSource).toContain('<s-card shadow="always" size="small" border-radius="small"');
    expect(formWidgetSource).toContain("import('@/shared/ui/StatusActionBadge.vue')");
    expect(formWidgetSource).not.toContain("import('@/features/swap/components/StatusActionBadge.vue')");
  });

  it('removes obsolete swap legacy page and widget wrappers', async () => {
    for (const file of deletedSwapLegacyFiles) {
      await expect(readFile(file, 'utf8')).rejects.toThrow();
    }
  });
});
