// @vitest-environment node
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const poolRoot = path.join(repoRoot, 'src', 'modules', 'pool');
const poolStoreFile = path.join(repoRoot, 'src', 'stores', 'pool', 'index.ts');

const files = {
  usePoolTokenPair: path.join(poolRoot, 'composables', 'usePoolTokenPair.ts'),
  usePoolApy: path.join(poolRoot, 'composables', 'usePoolApy.ts'),
  poolContainer: path.join(repoRoot, 'src', 'features', 'explore', 'pages', 'PoolContainerPage.vue'),
  poolView: path.join(poolRoot, 'views', 'Pool.vue'),
  addLiquidityDialog: path.join(poolRoot, 'components', 'AddLiquidity', 'Dialog.vue'),
  addLiquidityForm: path.join(poolRoot, 'components', 'AddLiquidity', 'Form.vue'),
  addLiquidityTransactionDetails: path.join(poolRoot, 'components', 'AddLiquidity', 'TransactionDetails.vue'),
  removeLiquidityDialog: path.join(poolRoot, 'components', 'RemoveLiquidity', 'Dialog.vue'),
  removeLiquidityForm: path.join(poolRoot, 'components', 'RemoveLiquidity', 'Form.vue'),
  removeLiquidityConfirm: path.join(poolRoot, 'components', 'RemoveLiquidity', 'Confirm.vue'),
  removeLiquidityTransactionDetails: path.join(poolRoot, 'components', 'RemoveLiquidity', 'TransactionDetails.vue'),
};

const readSource = async (filePath: string): Promise<string> => readFile(filePath, 'utf8');

describe('Pool module store migration', () => {
  it('keeps the pool module off direct root @/store imports', async () => {
    const sources = await Promise.all(Object.values(files).map(readSource));

    for (const source of sources) {
      expect(source).not.toContain("from '@/store'");
      expect(source).not.toContain('store.');
    }
  });

  it('keeps pool state reads on facades or app-store bridge helpers', async () => {
    const [
      poolStoreSource,
      tokenPairSource,
      poolApySource,
      poolContainerSource,
      poolViewSource,
      addFormSource,
      removeFormSource,
    ] = await Promise.all([
      readSource(poolStoreFile),
      readSource(files.usePoolTokenPair),
      readSource(files.usePoolApy),
      readSource(files.poolContainer),
      readSource(files.poolView),
      readSource(files.addLiquidityForm),
      readSource(files.removeLiquidityForm),
    ]);

    expect(poolStoreSource).not.toContain("from '@/utils/app-store'");
    expect(tokenPairSource).toContain("from '@/stores/pool'");
    expect(tokenPairSource).not.toContain("from '@/utils/app-store'");
    expect(poolApySource).toContain("from '@/stores/pool'");
    expect(poolApySource).not.toContain("from '@/utils/app-store'");
    expect(poolContainerSource).toContain("from '@/stores/pool'");
    expect(poolContainerSource).not.toContain("from '@/modules/pool'");
    expect(poolViewSource).toContain("from '@/stores/assets'");
    expect(poolViewSource).toContain("from '@/stores/pool'");
    expect(poolViewSource).not.toContain("from '@/utils/app-store'");
    expect(addFormSource).toContain("from '@/stores/settings'");
    expect(addFormSource).toContain("from '@/stores/wallet'");
    expect(addFormSource).toContain("from '@/stores/assets'");
    expect(addFormSource).toContain("from '@/stores/pool'");
    expect(addFormSource).not.toContain("from '@/utils/app-store'");
    expect(removeFormSource).toContain("from '@/stores/wallet'");
    expect(removeFormSource).toContain("from '@/stores/assets'");
    expect(removeFormSource).toContain("from '@/stores/pool'");
    expect(removeFormSource).not.toContain("from '@/utils/app-store'");
  });

  it('removes the deleted pool container wrapper view', async () => {
    await expect(stat(path.join(poolRoot, 'views', 'PoolContainer.vue'))).rejects.toBeDefined();
  });
});
