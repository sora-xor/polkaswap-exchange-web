// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../../..');
const createAlertPath = path.join(repoRoot, 'src/components/App/Alerts/CreateAlert.vue');
const alertListPath = path.join(repoRoot, 'src/components/App/Alerts/AlertList.vue');

describe('App alerts store migration', () => {
  it('keeps alert management components off the root @/store import', async () => {
    const [createAlertSource, alertListSource] = await Promise.all([
      readFile(createAlertPath, 'utf8'),
      readFile(alertListPath, 'utf8'),
    ]);

    for (const source of [createAlertSource, alertListSource]) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('store.');
    }
  });

  it('keeps alert management components on settings, wallet, and assets facades', async () => {
    const [createAlertSource, alertListSource] = await Promise.all([
      readFile(createAlertPath, 'utf8'),
      readFile(alertListPath, 'utf8'),
    ]);

    expect(createAlertSource).toContain("from '@/stores/settings'");
    expect(createAlertSource).toContain("from '@/stores/wallet'");
    expect(createAlertSource).toContain("from '@/stores/assets'");
    expect(createAlertSource).not.toContain("from '@/utils/app-store'");
    expect(createAlertSource).toContain('settingsStore.alerts');
    expect(createAlertSource).toContain('walletStore.whitelistIdsBySymbol');
    expect(createAlertSource).toContain('assetsStore.assetDataByAddress');
    expect(createAlertSource).toContain('settingsStore.addPriceAlert');

    expect(alertListSource).toContain("from '@/stores/settings'");
    expect(alertListSource).toContain("from '@/stores/wallet'");
    expect(alertListSource).toContain("from '@/stores/assets'");
    expect(alertListSource).not.toContain("from '@/utils/app-store'");
    expect(alertListSource).toContain('settingsStore.alerts');
    expect(alertListSource).toContain('walletStore.whitelistIdsBySymbol');
    expect(alertListSource).toContain('assetsStore.assetDataByAddress');
    expect(alertListSource).toContain('settingsStore.removePriceAlert');
  });
});
