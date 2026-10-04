import { describe, expect, it } from 'vitest';

import assetsStoreSource from '@/stores/assets/index.ts?raw';
import getTsBridgeProgressSource from '@/features/misc/lib/getTsBridgeProgress.ts?raw';
import getTsSwapDraftSource from '@/features/misc/lib/getTsSwapDraft.ts?raw';
import receiveXorDialogSource from '@/features/swap/components/ReceiveXorDialog.vue?raw';
import swapPageSource from '@/features/swap/pages/SwapPage.vue?raw';
import appShellLayoutSource from '@/app/shell/AppShellLayout.vue?raw';

/**
 * Guards for the swap page's startup bundle. Each of these static imports once
 * pulled a large library into the first render of every route that uses it.
 */
describe('startup bundle guards', () => {
  it('keeps ECharts out of the swap page by bypassing the chart widget barrel', () => {
    expect(swapPageSource).not.toContain("from '@/shared/ui/widgets'");
    expect(swapPageSource).toContain("import WidgetsGrid from '@/components/shared/Widget/Grid.vue'");
    expect(swapPageSource).toContain("import CustomiseWidget from '@/components/shared/Widget/Customise.vue'");
    expect(swapPageSource).toContain("createAsyncComponent(() => import('@/components/shared/Widget/PriceChart.vue'))");
  });

  it('loads bridge APIs, the bridge store and ethers lazily in the assets store', () => {
    for (const specifier of [
      '@/stores/bridge',
      '@/utils/bridge/eth/api',
      '@/utils/bridge/evm/api',
      '@/utils/bridge/sub/api',
      '@/utils/ethers-util',
    ]) {
      expect(assetsStoreSource).not.toContain(`from '${specifier}'`);
      expect(assetsStoreSource).toContain(`import('${specifier}')`);
    }
  });

  it('hashes Get TS draft contexts without ethers', () => {
    expect(getTsSwapDraftSource).not.toContain("from 'ethers'");
    expect(getTsBridgeProgressSource).not.toContain("from 'ethers'");
    expect(getTsSwapDraftSource).toContain('getTsContextHash(');
    expect(getTsBridgeProgressSource).toContain('getTsContextHash(');
  });

  it('loads the QR encoder only when the receive dialog shows a code', () => {
    expect(receiveXorDialogSource).not.toMatch(/^import QrCode from/m);
    expect(receiveXorDialogSource).toContain(
      "createAsyncComponent(() => import('@/lib/soraneo-wallet/src/components/QrCode/QrCode.vue'))"
    );
  });

  it('renders the shell chrome from the preloadable module-level wrappers', () => {
    expect(appShellLayoutSource).toContain("from './chrome'");
    expect(appShellLayoutSource).not.toContain('createAsyncComponent(');
  });
});
