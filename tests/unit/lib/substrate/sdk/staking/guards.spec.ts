import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StakingModule } from '@/lib/substrate/sdk/staking';
import { StakingRewardsDestination } from '@/lib/substrate/sdk/staking/types';

describe('StakingModule address guards', () => {
  const validAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

  const deriveAccountMock = vi.fn();
  const stakerRewardsMock = vi.fn();
  const ledgerQueryMock = vi.fn();
  const bondedQueryMock = vi.fn();
  const payeeQueryMock = vi.fn();
  const nominationsQueryMock = vi.fn();
  const validateAddressMock = vi.fn((address: string) => address === validAddress);

  const root = {
    validateAddress: validateAddressMock,
    api: {
      derive: {
        staking: {
          account: deriveAccountMock,
          stakerRewards: stakerRewardsMock,
        },
      },
      query: {
        staking: {
          ledger: ledgerQueryMock,
          payee: payeeQueryMock,
          nominators: nominationsQueryMock,
        },
      },
    },
    apiRx: {
      query: {
        staking: {
          ledger: ledgerQueryMock,
          bonded: bondedQueryMock,
          payee: payeeQueryMock,
          nominators: nominationsQueryMock,
        },
      },
    },
  } as any;

  const staking = new StakingModule(root);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty staking info for invalid stash and skips derive queries', async () => {
    await expect(staking.getMyStakingInfo('')).resolves.toEqual({
      myValidators: [],
      payee: '',
      controller: '',
      redeemAmount: '0',
      activeStake: '0',
      totalStake: '0',
      unbond: {
        unlocking: [],
        sum: '0',
      },
    });

    expect(deriveAccountMock).not.toHaveBeenCalled();
  });

  it('returns no nominator rewards for invalid stash and skips derive queries', async () => {
    await expect(staking.getNominatorsReward(undefined as unknown as string)).resolves.toEqual([]);

    expect(stakerRewardsMock).not.toHaveBeenCalled();
  });

  it('returns safe observable defaults for invalid stash and skips rx chain queries', async () => {
    await expect(firstValueFrom(staking.getControllerObservable(''))).resolves.toBeNull();
    await expect(firstValueFrom(staking.getPayeeObservable(''))).resolves.toBe(StakingRewardsDestination.None);
    await expect(firstValueFrom(staking.getNominationsObservable(''))).resolves.toBeNull();
    await expect(firstValueFrom(staking.getAccountLedgerObservable(''))).resolves.toBeNull();

    expect(bondedQueryMock).not.toHaveBeenCalled();
    expect(payeeQueryMock).not.toHaveBeenCalled();
    expect(nominationsQueryMock).not.toHaveBeenCalled();
    expect(ledgerQueryMock).not.toHaveBeenCalled();
  });

  it('returns safe async defaults for invalid stash and skips chain queries', async () => {
    await expect(staking.getPayee('')).resolves.toBe(StakingRewardsDestination.None);
    await expect(staking.getNominations('')).resolves.toBeNull();
    await expect(staking.getStashByController('')).resolves.toBe('');

    expect(payeeQueryMock).not.toHaveBeenCalled();
    expect(nominationsQueryMock).not.toHaveBeenCalled();
    expect(ledgerQueryMock).not.toHaveBeenCalled();
  });

  it('returns empty validator lists when chain api is unavailable', async () => {
    const getCurrentEraSpy = vi.spyOn(staking, 'getCurrentEra');

    await expect(staking.getWannabeValidators()).resolves.toEqual([]);
    await expect(staking.getValidatorsInfo()).resolves.toEqual([]);

    expect(getCurrentEraSpy).not.toHaveBeenCalled();
  });
});
