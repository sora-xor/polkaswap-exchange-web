import { FPNumber } from '@sora-substrate/sdk';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';

import { getWalletSendMaxAmount, isWalletSendMaxAvailable } from '@/lib/soraneo-wallet/src/util/walletSendMax';

describe('wallet send max helpers', () => {
  it.each([FPNumber.ZERO, FPNumber.fromCodecValue('100000000000000000')])(
    'uses the full transferable balance for non-XOR assets with fee %s',
    (fee) => {
      const maxAmount = getWalletSendMaxAmount({
        assetAddress: '0xdai',
        balance: '5000000000000000000',
        decimals: 18,
        fee,
      });

      expect(maxAmount.toString()).toBe('5');
    }
  );

  it('reserves the static network fee and signed-transaction margin from XOR balances', () => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: XOR.address,
      balance: '1000000000000000000',
      decimals: 18,
      fee: FPNumber.fromCodecValue('100000000000000000'),
    });

    expect(maxAmount.toString()).toBe('0.899999');
    // A sender nonce four bytes larger than the placeholder costs another 0.0000004 XOR.
    const signedFee = FPNumber.fromCodecValue('100000400000000000');
    const remainder = FPNumber.ONE.sub(maxAmount).sub(signedFee);

    expect(remainder.toCodecString()).toBe('600000000000');
  });

  it('preserves exact codec units above JavaScript safe-integer precision', () => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: XOR.address,
      balance: '9007199254740993123456789012345678',
      decimals: 18,
      fee: FPNumber.fromCodecValue('100000000000000001'),
    });

    expect(maxAmount.toString()).toBe('9007199254740993.023455789012345677');
    expect(maxAmount.toCodecString()).toBe('9007199254740993023455789012345677');
  });

  it('clamps XOR max amount to zero when the fee is greater than the balance', () => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: XOR.address,
      balance: '50000000000000000',
      decimals: 18,
      fee: FPNumber.fromCodecValue('100000000000000000'),
    });

    expect(maxAmount.toString()).toBe('0');
  });

  it.each([
    ['100000999999999999', '0'],
    ['100001000000000000', '0'],
    ['100001000000000001', '0.000000000000000001'],
  ])('handles balance %s at the fee-plus-margin boundary', (balance, expected) => {
    const maxAmount = getWalletSendMaxAmount({
      assetAddress: XOR.address,
      balance,
      decimals: 18,
      fee: FPNumber.fromCodecValue('100000000000000000'),
    });

    expect(maxAmount.toString()).toBe(expected);
  });

  it.each(['0', '-0.1', 'NaN', 'Infinity', '-Infinity'])(
    'does not offer an XOR maximum when the fee is unknown or invalid: %s',
    (fee) => {
      const maxAmount = getWalletSendMaxAmount({
        assetAddress: XOR.address,
        balance: '1000000000000000000',
        decimals: 18,
        fee: new FPNumber(fee),
      });

      expect(maxAmount.toString()).toBe('0');
      expect(isWalletSendMaxAvailable({ maxAmount, shouldBalanceBeHidden: false })).toBe(false);
    }
  );

  it.each(['-1', 'NaN', 'Infinity', '-Infinity', 'invalid'])(
    'does not offer a maximum for invalid balance %s',
    (balance) => {
      const maxAmount = getWalletSendMaxAmount({
        assetAddress: XOR.address,
        balance,
        decimals: 18,
        fee: FPNumber.fromCodecValue('100000000000000000'),
      });

      expect(maxAmount.toString()).toBe('0');
    }
  );

  it('hides MAX for hidden balances and zero spendable balances', () => {
    expect(isWalletSendMaxAvailable({ maxAmount: FPNumber.ONE, shouldBalanceBeHidden: true })).toBe(false);
    expect(isWalletSendMaxAvailable({ maxAmount: FPNumber.ZERO, shouldBalanceBeHidden: false })).toBe(false);
    expect(isWalletSendMaxAvailable({ maxAmount: FPNumber.ONE, shouldBalanceBeHidden: false })).toBe(true);
  });
});
