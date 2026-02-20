import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { DemeterFarmingModule } from '@/lib/substrate/sdk/demeterFarming';

describe('DemeterFarmingModule connection guards', () => {
  it('returns empty/null results when substrate api is unavailable', async () => {
    const demeter = new DemeterFarmingModule({
      connection: { api: null },
    } as any);

    await expect(demeter.getPoolsObservable()).resolves.toBeNull();
    await expect(demeter.getTokenInfosObservable()).resolves.toBeNull();
    await expect(firstValueFrom(demeter.getPoolsByAssetsObservable('pool', 'reward'))).resolves.toEqual([]);

    const tokenInfo = await firstValueFrom(demeter.getTokenInfoObservable('asset'));
    expect(tokenInfo.assetId).toBe('asset');
    expect(tokenInfo.tokenPerBlock.toString()).toBe('0');
    expect(tokenInfo.farmsTotalMultiplier).toBe(0);
    expect(tokenInfo.stakingTotalMultiplier).toBe(0);
    expect(tokenInfo.farmsAllocation.toString()).toBe('0');
    expect(tokenInfo.stakingAllocation.toString()).toBe('0');
    expect(tokenInfo.teamAllocation.toString()).toBe('0');
  });
});
