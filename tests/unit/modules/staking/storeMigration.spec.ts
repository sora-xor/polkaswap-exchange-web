// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const stakingRoot = path.join(repoRoot, 'src', 'modules', 'staking');
const stakingStoreFile = path.join(repoRoot, 'src', 'stores', 'staking', 'index.ts');

const files = {
  demeterBasePage: path.join(stakingRoot, 'demeter', 'composables', 'useDemeterBasePage.ts'),
  demeterPage: path.join(stakingRoot, 'demeter', 'composables', 'useDemeterPage.ts'),
  demeterPoolStatus: path.join(stakingRoot, 'demeter', 'composables', 'useDemeterPoolStatus.ts'),
  demeterDataContainer: path.join(stakingRoot, 'demeter', 'views', 'DataContainer.vue'),
  soraStaking: path.join(stakingRoot, 'sora', 'composables', 'useSoraStaking.ts'),
  validatorsFormatting: path.join(stakingRoot, 'sora', 'composables', 'useValidatorsFormatting.ts'),
  stakeDialog: path.join(stakingRoot, 'sora', 'components', 'StakeDialog.vue'),
  validatorsDialog: path.join(stakingRoot, 'sora', 'components', 'ValidatorsDialog.vue'),
  soraDataContainer: path.join(stakingRoot, 'sora', 'views', 'DataContainer.vue'),
  soraOverview: path.join(stakingRoot, 'sora', 'views', 'Overview.vue'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('staking store migration', () => {
  it('keeps the remaining staking module files off direct root-store imports', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('import store from');
    }
  });

  it('routes staking state access through the app-store bridge or Pinia facades', async () => {
    const stakingStoreSource = await readSource(stakingStoreFile);
    const [
      demeterBasePageSource,
      demeterPageSource,
      demeterPoolStatusSource,
      demeterDataContainerSource,
      soraStakingSource,
      validatorsFormattingSource,
      stakeDialogSource,
      validatorsDialogSource,
      soraDataContainerSource,
      soraOverviewSource,
    ] = await Promise.all(Object.values(files).map(readSource));

    expect(stakingStoreSource).toContain("from '@/stores/wallet'");
    expect(stakingStoreSource).toContain('api.staking');
    expect(stakingStoreSource).not.toContain("from '@/utils/app-store'");
    expect(demeterBasePageSource).toContain("from '@/stores/demeterFarming'");
    expect(demeterBasePageSource).toContain("from '@/stores/pool'");
    expect(demeterBasePageSource).not.toContain("from '@/utils/app-store'");
    expect(demeterPageSource).toContain("from '@/stores/demeterFarming'");
    expect(demeterPageSource).not.toContain("from '@/utils/app-store'");
    expect(demeterPoolStatusSource).not.toContain("from '@/utils/app-store'");
    expect(demeterDataContainerSource).toContain("from '@/stores/demeterFarming'");
    expect(demeterDataContainerSource).toContain("from '@/stores/staking'");
    expect(demeterDataContainerSource).not.toContain("from '@/utils/app-store'");
    expect(soraStakingSource).toContain("from '@/stores/staking'");
    expect(soraStakingSource).not.toContain("from '@/utils/app-store'");
    expect(validatorsFormattingSource).toContain("from '@/stores/staking'");
    expect(validatorsFormattingSource).not.toContain("from '@/utils/app-store'");
    expect(stakeDialogSource).toContain("from '@/stores/settings'");
    expect(validatorsDialogSource).toContain('useSoraStaking');
    expect(soraDataContainerSource).toContain('useSoraStaking');
    expect(soraOverviewSource).toContain('useSoraStaking');
  });
});
