// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const vaultRoot = path.join(repoRoot, 'src', 'modules', 'vault');
const vaultStoreFile = path.join(repoRoot, 'src', 'stores', 'vault', 'index.ts');

const files = {
  vaultsContainer: path.join(vaultRoot, 'views', 'VaultsContainer.vue'),
  vaults: path.join(vaultRoot, 'views', 'Vaults.vue'),
  vaultDetails: path.join(vaultRoot, 'views', 'VaultDetails.vue'),
  exploreOverallStats: path.join(vaultRoot, 'components', 'ExploreOverallStats.vue'),
  exploreCollaterals: path.join(vaultRoot, 'components', 'ExploreCollaterals.vue'),
  createVaultDialog: path.join(vaultRoot, 'components', 'CreateVaultDialog.vue'),
  addCollateralDialog: path.join(vaultRoot, 'components', 'AddCollateralDialog.vue'),
  borrowMoreDialog: path.join(vaultRoot, 'components', 'BorrowMoreDialog.vue'),
  repayDebtDialog: path.join(vaultRoot, 'components', 'RepayDebtDialog.vue'),
  closeVaultDialog: path.join(vaultRoot, 'components', 'CloseVaultDialog.vue'),
  vaultDetailsHistory: path.join(vaultRoot, 'components', 'VaultDetailsHistory.vue'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('vault store migration', () => {
  it('keeps the vault module off direct root-store imports', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('import store from');
    }
  });

  it('routes vault state access through app-store bridge helpers or Pinia facades', async () => {
    const vaultStoreSource = await readSource(vaultStoreFile);
    const [
      vaultsContainerSource,
      vaultsSource,
      vaultDetailsSource,
      exploreOverallStatsSource,
      exploreCollateralsSource,
      createVaultDialogSource,
      addCollateralDialogSource,
      borrowMoreDialogSource,
      repayDebtDialogSource,
      closeVaultDialogSource,
      vaultDetailsHistorySource,
    ] = await Promise.all(Object.values(files).map(readSource));

    expect(vaultStoreSource).toContain("from '@/stores/assets'");
    expect(vaultStoreSource).toContain("from '@/stores/wallet'");
    expect(vaultStoreSource).toContain('api.kensetsu');
    expect(vaultStoreSource).not.toContain("from '@/utils/app-store'");
    expect(vaultsContainerSource).toContain("from '@/stores/vault'");
    expect(vaultsContainerSource).toContain("from '@/stores/settings'");
    expect(vaultsContainerSource).not.toContain("from '@/utils/app-store'");
    expect(vaultsSource).toContain("from '@/stores/vault'");
    expect(vaultsSource).toContain("from '@/stores/settings'");
    expect(vaultsSource).toContain("from '@/stores/assets'");
    expect(vaultsSource).not.toContain("from '@/utils/app-store'");
    expect(vaultDetailsSource).toContain("from '@/stores/vault'");
    expect(vaultDetailsSource).toContain("from '@/stores/settings'");
    expect(vaultDetailsSource).toContain("from '@/stores/wallet'");
    expect(vaultDetailsSource).not.toContain("from '@/utils/app-store'");
    expect(exploreOverallStatsSource).toContain("from '@/stores/vault'");
    expect(exploreOverallStatsSource).toContain("from '@/stores/wallet'");
    expect(exploreOverallStatsSource).not.toContain("from '@/utils/app-store'");
    expect(exploreCollateralsSource).toContain("from '@/stores/vault'");
    expect(exploreCollateralsSource).toContain("from '@/stores/settings'");
    expect(exploreCollateralsSource).toContain("from '@/stores/wallet'");
    expect(exploreCollateralsSource).not.toContain("from '@/utils/app-store'");
    expect(createVaultDialogSource).toContain("from '@/stores/vault'");
    expect(createVaultDialogSource).toContain("from '@/stores/settings'");
    expect(createVaultDialogSource).toContain("from '@/stores/wallet'");
    expect(createVaultDialogSource).not.toContain("from '@/utils/app-store'");
    expect(addCollateralDialogSource).toContain("from '@/stores/wallet'");
    expect(borrowMoreDialogSource).toContain("from '@/stores/settings'");
    expect(repayDebtDialogSource).toContain("from '@/stores/wallet'");
    expect(closeVaultDialogSource).toContain("from '@/stores/wallet'");
    expect(vaultDetailsHistorySource).toContain("from '@/stores/wallet'");
  });
});
