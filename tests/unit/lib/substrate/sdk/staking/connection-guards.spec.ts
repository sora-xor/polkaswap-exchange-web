import { describe, expect, it, vi } from 'vitest';

import { StakingModule } from '@/lib/substrate/sdk/staking';

describe('StakingModule connection guards', () => {
  it('returns empty validator data when connection api is unavailable', async () => {
    const staking = new StakingModule({
      connection: { api: null },
    } as any);

    const getCurrentEraSpy = vi.spyOn(staking, 'getCurrentEra');

    await expect(staking.getWannabeValidators()).resolves.toEqual([]);
    await expect(staking.getValidatorsInfo()).resolves.toEqual([]);
    expect(getCurrentEraSpy).not.toHaveBeenCalled();
  });
});
