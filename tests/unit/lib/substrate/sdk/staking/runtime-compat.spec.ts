import { describe, expect, it, vi } from 'vitest';

import { StakingModule } from '@/lib/substrate/sdk/staking';
import { StakingRewardsDestination } from '@/lib/substrate/sdk/staking/types';

const codecNumber = (value: number) => ({
  toNumber: () => value,
});

const createRoot = (options: { bondArgs?: number; stakingConsts?: Record<string, unknown> } = {}) => {
  const bond = vi.fn((...params: unknown[]) => ({ method: 'bond', params }));
  Object.assign(bond, {
    meta: {
      args: Array.from({ length: options.bondArgs ?? 3 }, () => ({})),
    },
  });

  const nominate = vi.fn((validators: string[]) => ({ method: 'nominate', validators }));
  const batchAll = vi.fn((transactions: unknown[]) => ({ method: 'batchAll', transactions }));
  const submitExtrinsic = vi.fn(async (call: unknown) => ({ call }));
  const getTransactionFee = vi.fn(async () => 'fee');

  return {
    root: {
      account: { pair: 'pair' },
      api: {
        consts: {
          staking: options.stakingConsts ?? {},
        },
        tx: {
          staking: {
            bond,
            nominate,
          },
          utility: {
            batchAll,
          },
        },
      },
      submitExtrinsic,
      getTransactionFee,
    },
    bond,
    nominate,
    batchAll,
    submitExtrinsic,
    getTransactionFee,
  };
};

describe('StakingModule runtime compatibility', () => {
  it('reads optional staking nomination constants defensively', () => {
    const withLegacyConstants = new StakingModule(
      createRoot({
        stakingConsts: {
          maxNominations: codecNumber(16),
          maxNominatorRewardedPerValidator: codecNumber(64),
        },
      }).root as any
    );

    expect(withLegacyConstants.getMaxNominations()).toBe(16);
    expect(withLegacyConstants.getMaxNominatorRewardedPerValidator()).toBe(64);

    const withPagedExposureConstant = new StakingModule(
      createRoot({
        stakingConsts: {
          maxExposurePageSize: codecNumber(256),
        },
      }).root as any
    );

    expect(withPagedExposureConstant.getMaxNominations()).toBeNull();
    expect(withPagedExposureConstant.getMaxNominatorRewardedPerValidator()).toBe(256);
  });

  it('builds bond and nominate batches with modern controller-less bond parameters', async () => {
    const { root, bond, batchAll, submitExtrinsic } = createRoot({ bondArgs: 2 });
    const staking = new StakingModule(root as any);

    await staking.bondAndNominate({
      value: '1',
      controller: 'controller-address',
      payee: StakingRewardsDestination.Stash,
      validators: ['validator-address'],
    });

    expect(bond).toHaveBeenCalledWith(expect.any(String), StakingRewardsDestination.Stash);
    expect(batchAll).toHaveBeenCalledWith([
      { method: 'bond', params: [expect.any(String), StakingRewardsDestination.Stash] },
      { method: 'nominate', validators: ['validator-address'] },
    ]);
    expect(submitExtrinsic).toHaveBeenCalledTimes(1);
  });

  it('keeps legacy controller bond parameters when runtime metadata requires them', async () => {
    const { root, bond, getTransactionFee } = createRoot({ bondArgs: 3 });
    const staking = new StakingModule(root as any);

    await expect(
      staking.getBondAndNominateNetworkFee({
        value: '1',
        controller: 'controller-address',
        payee: 'payee-address',
        validators: ['validator-address'],
      })
    ).resolves.toBe('fee');

    expect(bond).toHaveBeenCalledWith('controller-address', expect.any(String), { Account: 'payee-address' });
    expect(getTransactionFee).toHaveBeenCalledTimes(1);
  });
});
