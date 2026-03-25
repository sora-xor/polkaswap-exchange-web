// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../..');

const files = {
  rewards: path.join(repoRoot, 'src', 'views', 'Rewards.vue'),
  pointSystem: path.join(repoRoot, 'src', 'views', 'PointSystem.vue'),
  pointSystemV2: path.join(repoRoot, 'src', 'views', 'PointSystemV2.vue'),
  wallet: path.join(repoRoot, 'src', 'views', 'Wallet.vue'),
} as const;

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('feature view store migration', () => {
  it('keeps rewards, point-system, and wallet views off the app-store bridge helper', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/utils/app-store'");
      expect(source).not.toContain('requireAppStore(');
      expect(source).not.toContain('withAppStore(');
    }
  });

  it('routes the remaining feature views through Pinia facades', async () => {
    const [rewardsSource, pointSystemSource, pointSystemV2Source, walletSource] = await Promise.all(
      Object.values(files).map(readSource)
    );

    expect(rewardsSource).toContain("from '@/stores/rewards'");
    expect(rewardsSource).toContain('const rewardsStore = useRewardsStore()');
    expect(pointSystemSource).toContain("from '@/stores/referrals'");
    expect(pointSystemSource).toContain("from '@/stores/pool'");
    expect(pointSystemV2Source).toContain("from '@/stores/referrals'");
    expect(pointSystemV2Source).toContain("from '@/stores/pool'");
    expect(walletSource).toContain("from '@/stores/pool'");
    expect(walletSource).toContain('poolStore.setAddLiquidityFirstTokenAddress');
  });
});
