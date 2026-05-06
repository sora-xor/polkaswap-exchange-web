// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const dashboardRoot = path.join(repoRoot, 'src', 'modules', 'dashboard');
const featureDashboardRoot = path.join(repoRoot, 'src', 'features', 'dashboard');

const files = {
  assetOwner: path.join(featureDashboardRoot, 'pages', 'AssetOwnerPage.vue'),
  assetOwnerDetails: path.join(featureDashboardRoot, 'pages', 'AssetOwnerDetailsPage.vue'),
  burnDialog: path.join(dashboardRoot, 'components', 'BurnDialog.vue'),
  mintDialog: path.join(dashboardRoot, 'components', 'MintDialog.vue'),
  createTokenDialog: path.join(dashboardRoot, 'components', 'CreateTokenDialog.vue'),
  sendTokenDialog: path.join(dashboardRoot, 'components', 'SendTokenDialog.vue'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('dashboard store migration', () => {
  it('keeps dashboard views and dialogs off the root store import', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('import store from');
    }
  });

  it('uses the app-store bridge or Pinia facades instead', async () => {
    const [
      assetOwnerSource,
      assetOwnerDetailsSource,
      burnDialogSource,
      mintDialogSource,
      createTokenDialogSource,
      sendTokenDialogSource,
    ] = await Promise.all(Object.values(files).map(readSource));

    expect(assetOwnerSource).toContain("from '@/stores/dashboard'");
    expect(assetOwnerSource).not.toContain("from '@/utils/app-store'");
    expect(assetOwnerDetailsSource).toContain("from '@/stores/dashboard'");
    expect(assetOwnerDetailsSource).not.toContain("from '@/utils/app-store'");

    for (const source of [burnDialogSource, mintDialogSource, createTokenDialogSource, sendTokenDialogSource]) {
      expect(source).toContain("from '@/stores/settings'");
      expect(source).toContain("from '@/stores/assets'");
    }
  });
});
