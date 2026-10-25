import { describe, expect, it } from 'vitest';
import { firstValueFrom, of } from 'rxjs';

import { AssetsModule, formatBalance, getAssetBalance } from '@/lib/substrate/sdk/assets';
import { XOR } from '@/lib/substrate/sdk/assets/consts';

const RESERVED = '2';
const FROZEN = '5';
const BONDED = '4';

const codecValue = (value: string) =>
  ({
    toJSON: () => value,
    toString: () => value,
  }) as never;

const bondedData = {
  isEmpty: false,
  toJSON: () => BONDED,
  toString: () => BONDED,
} as never;

describe('formatBalance', () => {
  it.each([
    {
      scenario: 'free is below frozen',
      free: '3',
      transferable: '0',
      locked: '9',
      total: '9',
    },
    {
      scenario: 'free equals frozen',
      free: '5',
      transferable: '0',
      locked: '11',
      total: '11',
    },
    {
      scenario: 'free is above frozen',
      free: '8',
      transferable: '3',
      locked: '11',
      total: '14',
    },
  ])('returns non-negative transferable and owned balances when $scenario', ({ free, transferable, locked, total }) => {
    const balance = formatBalance(
      {
        free,
        reserved: RESERVED,
        frozen: FROZEN,
      } as never,
      0,
      bondedData
    );

    expect(balance).toEqual({
      free,
      reserved: RESERVED,
      frozen: FROZEN,
      bonded: BONDED,
      locked,
      total,
      transferable,
    });
    expect(balance.transferable).not.toMatch(/^-/);
  });

  it('keeps the observed over-frozen XOR holdings visible without inflating ownership', () => {
    const balance = formatBalance(
      {
        free: codecValue('1282912800090570272557'),
        reserved: codecValue('1307257378743701428201'),
        frozen: codecValue('9500000000000000000000'),
      } as never,
      18
    );

    expect(balance).toEqual({
      free: '1282912800090570272557',
      reserved: '1307257378743701428201',
      frozen: '9500000000000000000000',
      bonded: '0',
      locked: '2590170178834271700758',
      total: '2590170178834271700758',
      transferable: '0',
    });
  });

  it.each([
    { free: '8', reserved: '2', frozen: '5', transferable: '5', locked: '9', total: '14' },
    { free: '3', reserved: '2', frozen: '5', transferable: '0', locked: '9', total: '9' },
    { free: '2', reserved: '2', frozen: '5', transferable: '0', locked: '8', total: '8' },
    { free: '8', reserved: '5', frozen: '5', transferable: '8', locked: '9', total: '17' },
    { free: '8', reserved: '6', frozen: '5', transferable: '8', locked: '10', total: '18' },
  ])('matches native usable balance with free=$free, reserved=$reserved and frozen=$frozen', (snapshot) => {
    const { free, reserved, frozen, transferable, locked, total } = snapshot;
    const balance = formatBalance({ free, reserved, frozen, flags: '0' } as never, 0, bondedData, 'native');

    expect(balance).toEqual({ free, reserved, frozen, bonded: BONDED, transferable, locked, total });
  });

  it('preserves every codec digit when native holds overlap a freeze', () => {
    const balance = formatBalance(
      {
        free: codecValue('100200000000000000003'),
        reserved: codecValue('50100000000000000001'),
        frozen: codecValue('120250000000000000002'),
        flags: codecValue('170141183460469231731687303715884105728'),
      } as never,
      18,
      undefined,
      'native'
    );

    expect(balance.transferable).toBe('30050000000000000002');
    expect(balance.locked).toBe('120250000000000000002');
    expect(balance.total).toBe('150300000000000000004');
  });

  it('retains legacy native free-balance freezes and does not discount reserved funds', () => {
    const balance = formatBalance(
      { free: '8', reserved: '2', miscFrozen: '4', feeFrozen: '5' } as never,
      0,
      undefined,
      'native'
    );

    expect(balance.transferable).toBe('3');
    expect(balance.locked).toBe('7');
    expect(balance.total).toBe('10');
  });

  it.each([
    { frozen: '0', miscFrozen: '5', feeFrozen: '0', transferable: '3', locked: '7' },
    { frozen: '6', miscFrozen: '0', feeFrozen: '5', transferable: '3', locked: '7' },
    { frozen: '8', miscFrozen: '5', feeFrozen: '0', transferable: '2', locked: '8' },
  ])('preserves both native freeze constraints for mixed fields: %j', (snapshot) => {
    const { frozen, miscFrozen, feeFrozen, transferable, locked } = snapshot;
    const balance = formatBalance(
      { free: '8', reserved: '2', frozen, miscFrozen, feeFrozen } as never,
      0,
      undefined,
      'native'
    );

    expect(balance.transferable).toBe(transferable);
    expect(balance.locked).toBe(locked);
    expect(balance.total).toBe('10');
  });
});

describe('native and token balance reads', () => {
  const data = {
    free: codecValue('8000000000000000000'),
    reserved: codecValue('2000000000000000000'),
    frozen: codecValue('5000000000000000000'),
    flags: codecValue('170141183460469231731687303715884105728'),
  };
  const tokenData = { free: data.free, reserved: data.reserved, frozen: data.frozen };

  it.each([
    { address: XOR.address, transferable: '5000000000000000000' },
    { address: 'token-asset', transferable: '3000000000000000000' },
  ])('uses the correct freeze semantics for direct reads of $address', async ({ address, transferable }) => {
    const api = {
      query: {
        system: { account: async () => ({ data }) },
        referrals: { referrerBalances: async () => undefined },
        tokens: { accounts: async () => tokenData },
      },
    };

    const balance = await getAssetBalance(api as never, 'account-address', address);

    expect(balance.transferable).toBe(transferable);
    expect(balance.total).toBe('10000000000000000000');
  });

  it.each([
    { address: XOR.address, transferable: '5000000000000000000' },
    { address: 'token-asset', transferable: '3000000000000000000' },
  ])('uses the correct freeze semantics in both subscriptions for $address', async ({ address, transferable }) => {
    const assets = new AssetsModule({
      account: { pair: { address: 'account-address' } },
      apiRx: {
        query: {
          system: { account: () => of({ data }) },
          referrals: { referrerBalances: () => of(undefined) },
          tokens: { accounts: () => of(tokenData) },
        },
      },
    } as never);

    const balance = await firstValueFrom(assets.getAssetBalanceObservable({ ...XOR, address }));
    const transferableBalance = await firstValueFrom(
      assets.subscribeOnAssetTransferableBalance(address, 'account-address')
    );

    expect(balance.transferable).toBe(transferable);
    expect(transferableBalance).toBe(transferable);
    expect(balance.total).toBe('10000000000000000000');
  });
});
