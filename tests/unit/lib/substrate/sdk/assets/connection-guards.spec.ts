import { describe, expect, it } from 'vitest';

import { AssetsModule, getAssets } from '@/lib/substrate/sdk/assets';

describe('AssetsModule connection guards', () => {
  it('returns empty asset lists when substrate api is unavailable', async () => {
    const assetsModule = new AssetsModule({
      connection: { api: null },
    } as any);

    await expect(getAssets(null as any)).resolves.toEqual([]);
    await expect(assetsModule.getAssets()).resolves.toEqual([]);
    await expect(assetsModule.getAssets(true)).resolves.toEqual([]);
    await expect(assetsModule.getAssetsIds()).resolves.toEqual([]);
  });
});
